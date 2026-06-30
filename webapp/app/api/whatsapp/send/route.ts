import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { userClient, serviceClient } from '@/lib/supabaseServer';
import { waConfigured, sendText, sendTemplate, WhatsAppError } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ─────────────────────────────────────────────────────────────────────────
//  Invio messaggio WhatsApp dal numero assegnato all'utente.
//
//  Regole WhatsApp + modello economico:
//   - dentro la finestra di 24h (l'utente ha scritto da meno di 24h) si può
//     inviare testo libero: è gratuito e NON consuma il meter;
//   - fuori finestra è obbligatorio un TEMPLATE approvato: è business-initiated
//     e consuma il meter `whatsapp`.
//
//  Config (env): WHATSAPP_TOKEN. Senza, la route degrada in demo (configured:false).
// ─────────────────────────────────────────────────────────────────────────

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

interface SendBody {
  to?: string;
  text?: string;
  template?: { name?: string; lang?: string; components?: unknown[] };
}

export async function POST(req: Request) {
  const tok = bearer(req);
  if (!tok) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });

  let body: SendBody;
  try {
    body = (await req.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }
  const to = String(body.to || '').trim();
  if (!to) return NextResponse.json({ error: 'Destinatario mancante' }, { status: 400 });

  const client = userClient(tok);
  const { data: auth, error: authErr } = await client.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });
  const userId = auth.user.id;

  // Numero assegnato all'utente (RLS: vede solo il proprio).
  const { data: num } = await client
    .from('wa_numbers')
    .select('id, phone_number_id, status')
    .eq('assigned_user_id', userId)
    .eq('status', 'assigned')
    .maybeSingle();
  const phoneNumberId = (num as { phone_number_id?: string } | null)?.phone_number_id;
  const waNumberId = (num as { id?: string } | null)?.id ?? null;
  if (!phoneNumberId) {
    return NextResponse.json({ ok: false, configured: false, reason: 'no_number' });
  }
  if (!waConfigured()) {
    return NextResponse.json({ ok: false, configured: false, reason: 'not_configured' });
  }

  // Finestra di servizio: ultimo messaggio in entrata da questo contatto.
  const { data: lastIn } = await client
    .from('wa_messages')
    .select('created_at')
    .eq('contact', to)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastTs = (lastIn as { created_at?: string } | null)?.created_at;
  const withinWindow = !!lastTs && Date.now() - new Date(lastTs).getTime() < 24 * 60 * 60 * 1000;

  const wantsTemplate = !!body.template?.name;
  let meterResult: unknown = null;

  try {
    let wamid: string | null = null;
    let logType = 'text';
    let templateName: string | null = null;

    if (wantsTemplate) {
      // business-initiated → consuma il meter `whatsapp` (autorevole, lato DB).
      const { data: meter } = await client.rpc('consume_meter', { p_meter: 'whatsapp', p_amount: 1 });
      meterResult = meter ?? null;
      const t = body.template!;
      const r = await sendTemplate(phoneNumberId, to, String(t.name), String(t.lang || 'it'), t.components);
      wamid = r.wamid;
      logType = 'template';
      templateName = String(t.name);
    } else {
      const text = String(body.text || '').trim();
      if (!text) return NextResponse.json({ error: 'Testo mancante' }, { status: 400 });
      if (!withinWindow) {
        // Fuori finestra il testo libero verrebbe rifiutato da Meta: serve template.
        return NextResponse.json({ ok: false, reason: 'outside_window', need_template: true });
      }
      const r = await sendText(phoneNumberId, to, text); // in-finestra: gratis, niente meter
      wamid = r.wamid;
    }

    // Log in uscita (service_role: nessuna policy di scrittura lato client).
    const db = serviceClient();
    if (db) {
      await db.from('wa_messages').insert({
        id: `wao_${wamid || crypto.randomUUID()}`,
        user_id: userId,
        wa_number_id: waNumberId,
        contact: to,
        direction: 'outbound',
        wamid,
        msg_type: logType,
        body: wantsTemplate ? '' : String(body.text || ''),
        template_name: templateName,
        status: 'sent',
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true, wamid, metered: wantsTemplate, meter: meterResult });
  } catch (e) {
    const msg = e instanceof WhatsAppError ? e.message : 'Invio fallito';
    const status = e instanceof WhatsAppError ? 502 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
