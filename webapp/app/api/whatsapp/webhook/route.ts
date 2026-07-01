import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { serviceClient } from '@/lib/supabaseServer';
import {
  verifyWebhookSignature,
  parseInbound,
  waConfigured,
  sendText,
  type InboundMessage,
} from '@/lib/whatsapp';
import { retrieveContextForUser, formatContext } from '@/lib/retrieve';
import { generateWaReply } from '@/lib/waReply';
import { bookForUser } from '@/lib/consult';
import { calendarConnected, type CalProfile } from '@/lib/calendar';
import { agentGoalsDirective, leadMemoryBlock, SECTOR_LABEL, type AgentGoal, type SectorKind } from '@/lib/crm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ─────────────────────────────────────────────────────────────────────────
//  Webhook WhatsApp Cloud API (Meta).
//
//  Una sola callback riceve i messaggi di TUTTI i numeri del Business. Ogni
//  messaggio porta il `phone_number_id` del numero GENERAH che lo ha ricevuto:
//  da lì si risale al numero nel pool (wa_numbers) e all'utente assegnatario.
//  Il messaggio viene registrato in wa_messages e il contatto entra/aggiorna il
//  CRM (leads). La risposta automatica AI è gestita altrove (fase successiva).
//
//  Config (env): WHATSAPP_VERIFY_TOKEN (GET), WHATSAPP_APP_SECRET|META_APP_SECRET
//  (firma POST), SUPABASE_SERVICE_ROLE_KEY (scrittura). Senza service_role il
//  webhook risponde 200 ma non scrive (degrado pulito).
// ─────────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new Response('forbidden', { status: 403 });
}

async function ingestOne(db: NonNullable<ReturnType<typeof serviceClient>>, m: InboundMessage) {
  if (!m.phoneNumberId) return;
  // Risali al numero del pool e all'utente assegnatario.
  const { data: num } = await db
    .from('wa_numbers')
    .select('id, assigned_user_id')
    .eq('phone_number_id', m.phoneNumberId)
    .maybeSingle();
  const userId = (num as { assigned_user_id?: string } | null)?.assigned_user_id;
  const numberId = (num as { id?: string } | null)?.id ?? null;
  if (!userId) return; // numero non assegnato: nulla da fare

  const nowIso = new Date().toISOString();

  // 1) Registra il messaggio (idempotente sul wamid). `.select()` ci dice se la
  //    riga è NUOVA: l'auto-reply scatta solo allora → niente doppie risposte
  //    sui retry di Meta.
  const ins = await db
    .from('wa_messages')
    .upsert(
      {
        id: `wa_${m.wamid}`,
        user_id: userId,
        wa_number_id: numberId,
        contact: m.contact,
        direction: 'inbound',
        wamid: m.wamid,
        msg_type: m.type,
        body: m.text,
        status: 'received',
        created_at: new Date(m.timestamp * 1000).toISOString(),
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    .select('id');
  const isNew = Array.isArray(ins.data) && ins.data.length > 0;

  // 2) CRM: crea il lead se non esiste (id stabile per contatto), poi aggiorna
  //    sempre l'ultimo contatto senza sovrascrivere i campi gestiti dall'AI.
  const leadId = `wa_${userId}_${m.contact}`;
  await db.from('leads').upsert(
    {
      id: leadId,
      user_id: userId,
      name: m.contactName || m.contact,
      phone: m.contact,
      email: '',
      source: 'WhatsApp',
      channel: 'WhatsApp',
      interest: '',
      status: 'nuovo',
      score: 0,
      notes: '',
      ai_summary: '',
      next_action: '',
      ai_draft: null,
      created_at: nowIso,
      last_touch: nowIso,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  await db.from('leads').update({ last_touch: nowIso }).eq('id', leadId);

  // 3) Auto-reply AI: solo per messaggi di TESTO appena registrati (idempotente).
  if (isNew && m.type === 'text' && m.text.trim()) {
    await maybeAutoReply(db, {
      userId,
      numberId,
      phoneNumberId: m.phoneNumberId,
      contact: m.contact,
    });
  }
}

// Risposta automatica con Opus 4.8 ancorata alla knowledge base (RAG service-role),
// inviata entro la finestra 24h (il cliente ha appena scritto → testo libero,
// gratuito, nessun consumo di meter). Disattivabile per-utente (wa_autoreply).
// Best-effort: ogni errore è silenzioso, il webhook ACK comunque.
async function maybeAutoReply(
  db: NonNullable<ReturnType<typeof serviceClient>>,
  ctx: { userId: string; numberId: string | null; phoneNumberId: string; contact: string },
) {
  if (!waConfigured() || !process.env.ANTHROPIC_API_KEY) return;

  const { data: prof } = await db
    .from('profiles')
    .select(
      'wa_autoreply, nome, settore, kb, agent_goals, sector_kind, calendar_provider, calcom_api_key, calcom_event_type_id, calcom_booking_url, google_refresh_token, google_calendar_id, booking_timezone',
    )
    .eq('id', ctx.userId)
    .maybeSingle();
  const p = prof as
    | {
        wa_autoreply?: boolean;
        nome?: string;
        settore?: string;
        kb?: { name?: string }[];
        agent_goals?: AgentGoal[];
        sector_kind?: string;
      }
    | null;
  if (!p || p.wa_autoreply === false) return; // auto-reply disattivato

  const cal = (prof as CalProfile | null) || null;
  const bookingEnabled = calendarConnected(cal);
  const timezone = String((cal?.booking_timezone as string) || 'Europe/Rome');

  // Storico recente con questo contatto (per dare contesto alla risposta).
  const { data: hist } = await db
    .from('wa_messages')
    .select('direction, body, created_at')
    .eq('user_id', ctx.userId)
    .eq('contact', ctx.contact)
    .order('created_at', { ascending: true })
    .limit(14);
  const history = Array.isArray(hist)
    ? hist.map((h: { direction?: string; body?: string }) => ({
        direction: String(h.direction || ''),
        body: String(h.body || ''),
      }))
    : [];

  const lastInbound = [...history].reverse().find((h) => h.direction === 'inbound')?.body || '';
  let ragContext = '';
  try {
    const chunks = await retrieveContextForUser(
      ctx.userId,
      (lastInbound || String(p.settore || '')).slice(0, 400),
      6,
    );
    ragContext = formatContext(chunks, 5000);
  } catch {
    /* fallback ai nomi file */
  }
  const kbFiles = Array.isArray(p.kb) ? p.kb.map((f) => String(f?.name || '')).filter(Boolean) : [];
  const waGoals = Array.isArray(p.agent_goals) ? p.agent_goals : [];
  const waSk = (p.sector_kind || null) as SectorKind | null;
  const goalDirective = agentGoalsDirective(waGoals, waSk ? SECTOR_LABEL[waSk] : null);

  // Memoria di trattativa del lead (la STESSA che legge l'agente vocale): fase
  // pipeline + riepilogo AI, così l'auto-reply riprende dal punto raggiunto e
  // non ricomincia da capo tra un canale e l'altro.
  const leadId = `wa_${ctx.userId}_${ctx.contact}`;
  const { data: leadRow } = await db
    .from('leads')
    .select('deal_stage, progress_summary, name, email, phone')
    .eq('id', leadId)
    .maybeSingle();
  const lr = leadRow as
    | { deal_stage?: string; progress_summary?: string; name?: string; email?: string; phone?: string }
    | null;
  const memoryBlock = leadMemoryBlock({
    dealStage: lr?.deal_stage || null,
    progressSummary: lr?.progress_summary || null,
  });

  const { reply, progressSummary, booking } = await generateWaReply({
    history,
    nome: String(p.nome || ''),
    settore: String(p.settore || ''),
    kbFiles,
    ragContext,
    goalDirective,
    memoryBlock,
    bookingEnabled,
    nowISO: new Date().toISOString(),
    timezone,
    timeoutMs: 12000,
  });
  if (!reply) return;

  try {
    const r = (await sendText(ctx.phoneNumberId, ctx.contact, reply)) as { wamid?: string };
    const wamid = r?.wamid || null;
    await db.from('wa_messages').upsert(
      {
        id: `wao_${wamid || crypto.randomUUID()}`,
        user_id: ctx.userId,
        wa_number_id: ctx.numberId,
        contact: ctx.contact,
        direction: 'outbound',
        wamid,
        msg_type: 'text',
        body: reply,
        status: 'auto',
        created_at: new Date().toISOString(),
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );

    // Persisti la MEMORIA aggiornata della trattativa + timestamp ultima
    // interazione: il prossimo turno (WhatsApp o voce) riparte da qui.
    const memUpdate: Record<string, unknown> = { last_interaction_at: new Date().toISOString() };
    if (progressSummary) memUpdate.progress_summary = progressSummary;
    await db.from('leads').update(memUpdate).eq('id', leadId);

    // Appuntamento concordato: prenota sul calendario collegato dell'utente
    // (cal.com/Google) e registra appuntamento + evento in timeline. Best-effort.
    if (booking?.startsAt && bookingEnabled && cal) {
      try {
        await bookForUser(ctx.userId, cal, {
          startsAt: booking.startsAt,
          name: String(lr?.name || ctx.contact),
          email: String(lr?.email || ''),
          phone: String(lr?.phone || ctx.contact),
          notes: booking.notes,
          leadId,
        });
      } catch {
        /* best-effort */
      }
    }
  } catch {
    /* invio fallito: si prosegue */
  }
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get('x-hub-signature-256'))) {
    return new Response('bad signature', { status: 401 });
  }
  try {
    const db = serviceClient();
    if (db) {
      const messages = parseInbound(JSON.parse(raw));
      for (const m of messages) {
        try {
          await ingestOne(db, m);
        } catch {
          // singolo messaggio fallito: si prosegue
        }
      }
    }
  } catch {
    // body non parsabile: si ACK comunque per non far ritentare Meta
  }
  return NextResponse.json({ received: true });
}
