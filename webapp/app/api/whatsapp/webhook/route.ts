import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabaseServer';
import { verifyWebhookSignature, parseInbound, type InboundMessage } from '@/lib/whatsapp';

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

  // 1) Registra il messaggio (idempotente sul wamid).
  await db.from('wa_messages').upsert(
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
  );

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
