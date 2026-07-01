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
import { agentGoalsDirective, SECTOR_LABEL, type AgentGoal, type SectorKind } from '@/lib/crm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

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
      .select('nome, settore, kb, meters')
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
    const instructions = buildPhonePrompt({ nome: String(p.nome || ''), settore, kbFiles, ragContext, goalDirective });

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
