import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabaseServer';
import {
  verifyOpenAIWebhook,
  numberFromSip,
  sipHeaderValue,
  acceptCall,
  rejectCall,
  buildPhonePrompt,
  buildAcceptSession,
  voiceConfigured,
} from '@/lib/voice';
import { retrieveContextForUser, formatContext } from '@/lib/retrieve';
import { agentGoalsDirective, leadMemoryBlock, SECTOR_LABEL, type AgentGoal, type SectorKind } from '@/lib/crm';
import { observeCall } from '@/lib/callMemory';
import { waitUntil } from '@vercel/functions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// L'osservazione della trascrizione (sideband WS) gira in background via
// waitUntil per l'intera durata della chiamata: alza il limite della function.
export const maxDuration = 300;

// ─────────────────────────────────────────────────────────────────────────
//  Webhook OpenAI Realtime (chiamate SIP). Un solo endpoint per tutti gli
//  eventi del progetto:
//   - realtime.call.incoming → mappa il numero chiamato all'azienda, verifica
//     i minuti residui (meter 'phone'), e accetta con le istruzioni della sua KB;
//   - evento di fine chiamata → consuma il meter 'phone' sui minuti reali.
//
//  Config: OPENAI_API_KEY, OPENAI_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY.
//  DIDWW instrada il DID dell'azienda verso sip:<project>@sip.api.openai.com.
// ─────────────────────────────────────────────────────────────────────────

const ack = () => NextResponse.json({ received: true });

interface ProfileRow {
  nome?: string;
  settore?: string;
  kb?: { name?: string }[];
  meters?: Record<string, { total?: number; used?: number }>;
}

export async function POST(req: Request) {
  const raw = await req.text();

  const valid = verifyOpenAIWebhook(raw, {
    id: req.headers.get('webhook-id') || undefined,
    timestamp: req.headers.get('webhook-timestamp') || undefined,
    signature: req.headers.get('webhook-signature') || undefined,
  });
  if (!valid) return NextResponse.json({ error: 'firma non valida' }, { status: 401 });

  let evt: any;
  try {
    evt = JSON.parse(raw);
  } catch {
    return ack();
  }
  const type = String(evt?.type || '');
  const svc = serviceClient();
  if (!svc) return ack(); // senza service role non possiamo né accettare né metrare

  // ── Chiamata in ingresso ───────────────────────────────────────────────
  if (type === 'realtime.call.incoming') {
    const callId = String(evt?.data?.call_id || '');
    const sh = Array.isArray(evt?.data?.sip_headers) ? evt.data.sip_headers : [];
    const toNum = numberFromSip(sipHeaderValue(sh, 'To'));
    const fromNum = numberFromSip(sipHeaderValue(sh, 'From'));
    if (!callId || !toNum) return ack();

    // Azienda proprietaria del numero chiamato.
    const { data: num } = await svc
      .from('wa_numbers')
      .select('assigned_user_id')
      .eq('e164', toNum)
      .eq('status', 'assigned')
      .maybeSingle();
    const ownerId = (num as { assigned_user_id?: string } | null)?.assigned_user_id;
    if (!ownerId) {
      if (voiceConfigured()) await rejectCall(callId, 603).catch(() => {});
      return ack();
    }

    const { data: prof } = await svc
      .from('profiles')
      .select('nome, settore, kb, meters, agent_goals, sector_kind')
      .eq('id', ownerId)
      .maybeSingle();
    const p = (prof as ProfileRow | null) || {};
    const phone = p.meters?.phone || { total: 0, used: 0 };
    const remaining = Math.max(0, Number(phone.total || 0) - Number(phone.used || 0));
    if (remaining <= 0) {
      // Minuti esauriti: rifiuta (occupato).
      if (voiceConfigured()) await rejectCall(callId, 486).catch(() => {});
      return ack();
    }

    // Istruzioni: KB via RAG (service-role) + settore + nomi file come fallback.
    const settore = String(p.settore || '');
    const kbFiles = Array.isArray(p.kb) ? p.kb.map((f) => String(f?.name || '')).filter(Boolean) : [];
    let ragContext = '';
    try {
      const chunks = await retrieveContextForUser(
        ownerId,
        `prodotti servizi prezzi offerta punti di forza FAQ tono di voce ${settore}`.trim(),
        8,
      );
      ragContext = formatContext(chunks, 5000);
    } catch {
      /* fallback ai nomi file */
    }
    const goals = Array.isArray((p as { agent_goals?: unknown }).agent_goals)
      ? ((p as { agent_goals?: AgentGoal[] }).agent_goals as AgentGoal[])
      : [];
    const sk = ((p as { sector_kind?: string }).sector_kind || null) as SectorKind | null;
    const goalDirective = agentGoalsDirective(goals, sk ? SECTOR_LABEL[sk] : null);

    // Memoria di trattativa: se chi chiama è un lead noto (stesso numero già
    // usato su WhatsApp o in una chiamata precedente), riprendi dal punto
    // raggiunto — è la STESSA memoria condivisa con l'agente WhatsApp.
    let memoryBlock = '';
    let callerLeadId: string | null = null;
    let callerStage: string | null = null;
    if (fromNum) {
      const { data: leadRow } = await svc
        .from('leads')
        .select('id, deal_stage, progress_summary')
        .eq('user_id', ownerId)
        .eq('phone', fromNum)
        .order('last_touch', { ascending: false })
        .limit(1)
        .maybeSingle();
      const lr = leadRow as { id?: string; deal_stage?: string; progress_summary?: string } | null;
      if (lr?.id) {
        callerLeadId = lr.id;
        callerStage = lr.deal_stage || null;
        memoryBlock = leadMemoryBlock({
          dealStage: lr.deal_stage || null,
          progressSummary: lr.progress_summary || null,
        });
      }
    }
    const instructions = buildPhonePrompt({ nome: String(p.nome || ''), settore, kbFiles, ragContext, goalDirective, memoryBlock });

    try {
      await acceptCall(callId, buildAcceptSession(instructions));
    } catch {
      return ack();
    }

    // Log + addebito minimo di 1 minuto all'inizio (riconciliato a fine chiamata).
    await svc.from('voice_calls').upsert(
      {
        call_id: callId,
        user_id: ownerId,
        direction: 'inbound',
        from_e164: fromNum || null,
        to_e164: toNum,
        status: 'answered',
        metered: 1,
      },
      { onConflict: 'call_id', ignoreDuplicates: true },
    );
    try {
      await svc.rpc('consume_meter_for', { p_user: ownerId, p_meter: 'phone', p_amount: 1 });
    } catch {
      /* best-effort */
    }

    // Timestamp di ultima interazione sul lead chiamante (parte della memoria
    // condivisa: la prossima azione — voce o WhatsApp — sa quand'è stato l'ultimo tocco).
    if (callerLeadId) {
      try {
        // Aggancio memoria lato voce: una chiamata risposta è un contatto reale →
        // avanza lo stage se è ancora al punto di partenza e aggiorna la recency.
        // NON tocchiamo progress_summary: l'audio va diretto DIDWW↔OpenAI e non è
        // trascritto lato webhook, quindi non inventiamo il contenuto della trattativa.
        const upd: Record<string, unknown> = { last_interaction_at: new Date().toISOString() };
        if (!callerStage || callerStage === 'nuovo') upd.deal_stage = 'contattato';
        await svc.from('leads').update(upd).eq('id', callerLeadId);
      } catch {
        /* best-effort */
      }
    }

    // Osservazione della chiamata: apre il WS sideband, cattura la trascrizione
    // e a fine chiamata riassume con Opus aggiornando la memoria CRM del lead.
    // Gira in background (waitUntil) → non blocca l'ACK del webhook.
    // Disattivabile con VOICE_TRANSCRIPT_SUMMARY=off.
    if (process.env.VOICE_TRANSCRIPT_SUMMARY !== 'off' && voiceConfigured()) {
      const task = observeCall(svc, { callId, ownerId, callerLeadId, fromE164: fromNum || null });
      try {
        waitUntil(task);
      } catch {
        void task; // fuori dal contesto Vercel: fire-and-forget
      }
    }
    return ack();
  }

  // ── Fine chiamata → metering reale ──────────────────────────────────────
  if (/^realtime\.call\.(ended|completed|hangup|hung_up|closed)$/.test(type)) {
    const callId = String(evt?.data?.call_id || '');
    if (!callId) return ack();
    const { data: row } = await svc
      .from('voice_calls')
      .select('user_id, created_at, status, metered')
      .eq('call_id', callId)
      .maybeSingle();
    const r = row as { user_id?: string; created_at?: string; status?: string; metered?: number } | null;
    if (r?.user_id && r.status !== 'ended') {
      const durSec =
        Number(evt?.data?.duration ?? evt?.data?.duration_seconds ?? evt?.data?.seconds ?? 0) ||
        (r.created_at ? Math.max(0, Math.round((Date.now() - new Date(r.created_at).getTime()) / 1000)) : 0);
      const minutes = Math.max(1, Math.ceil(durSec / 60));
      const already = Number(r.metered || 0);
      const delta = Math.max(0, minutes - already);
      if (delta > 0) {
        try {
          await svc.rpc('consume_meter_for', { p_user: r.user_id, p_meter: 'phone', p_amount: delta });
        } catch {
          /* best-effort */
        }
      }
      await svc
        .from('voice_calls')
        .update({ status: 'ended', seconds: durSec, metered: minutes, ended_at: new Date().toISOString() })
        .eq('call_id', callId);
    }
    return ack();
  }

  return ack();
}

// Health-check (la verifica del webhook OpenAI avviene via POST firmato).
export async function GET() {
  return NextResponse.json({ ok: true });
}
