import { NextResponse } from 'next/server';
import { userClient, serviceClient } from '@/lib/supabaseServer';
import { resendConfigured, createDomain, getDomain, verifyDomain, type ResendDomain } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Setup/verifica dell'email di invio dell'utente (Resend).
//  POST { action:'setup', email, fromName? } → crea/riusa il dominio in Resend,
//        salva sending_email/domain/resend_domain_id sul profilo, torna i record DNS.
//  POST { action:'verify' } → chiede a Resend di verificare, aggiorna email_verified.
//  GET  → stato corrente + record DNS.
//  Auth: Bearer token utente (RLS). Config: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY.
// ─────────────────────────────────────────────────────────────────────────

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

async function uid(req: Request): Promise<string | null> {
  const tok = bearer(req);
  if (!tok) return null;
  const { data } = await userClient(tok).auth.getUser();
  return data?.user?.id || null;
}

function payload(dom: ResendDomain | null, verified: boolean, sendingEmail: string | null) {
  return {
    sendingEmail,
    status: dom?.status || 'not_started',
    verified,
    records: dom?.records || [],
    domain: dom?.name || null,
  };
}

export async function GET(req: Request) {
  if (!resendConfigured()) return NextResponse.json({ error: 'RESEND_API_KEY mancante (env)' }, { status: 500 });
  const id = await uid(req);
  const svc = serviceClient();
  if (!id || !svc) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const { data: prof } = await svc
    .from('profiles')
    .select('sending_email, resend_domain_id, email_verified')
    .eq('id', id)
    .maybeSingle();
  const p = prof as { sending_email?: string; resend_domain_id?: string; email_verified?: boolean } | null;
  if (!p?.resend_domain_id) return NextResponse.json(payload(null, false, p?.sending_email || null));

  let dom: ResendDomain | null = null;
  try {
    dom = await getDomain(p.resend_domain_id);
  } catch {
    /* dominio non recuperabile: torna comunque lo stato salvato */
  }
  return NextResponse.json(payload(dom, !!p.email_verified, p.sending_email || null));
}

export async function POST(req: Request) {
  if (!resendConfigured()) return NextResponse.json({ error: 'RESEND_API_KEY mancante (env)' }, { status: 500 });
  const id = await uid(req);
  const svc = serviceClient();
  if (!id || !svc) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }
  const action = String(body?.action || 'setup');

  // ── SETUP: registra il dominio dell'email professionale ──────────────────
  if (action === 'setup') {
    const email = String(body?.email || '').trim().toLowerCase();
    const fromName = String(body?.fromName || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Indirizzo email non valido' }, { status: 400 });
    }
    const domain = email.split('@')[1];

    // Riusa il dominio se già registrato per lo stesso host, altrimenti crealo.
    const { data: prof } = await svc
      .from('profiles')
      .select('resend_domain_id, sending_domain')
      .eq('id', id)
      .maybeSingle();
    const p = prof as { resend_domain_id?: string; sending_domain?: string } | null;

    let dom: ResendDomain;
    try {
      if (p?.resend_domain_id && p.sending_domain === domain) {
        dom = await getDomain(p.resend_domain_id);
      } else {
        dom = await createDomain(domain);
      }
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 502 });
    }

    const verified = dom.status === 'verified';
    await svc
      .from('profiles')
      .update({
        sending_email: email,
        sending_from_name: fromName || null,
        sending_domain: domain,
        resend_domain_id: dom.id,
        email_verified: verified,
      })
      .eq('id', id);

    return NextResponse.json(payload(dom, verified, email));
  }

  // ── VERIFY: chiede a Resend di verificare i record DNS ───────────────────
  if (action === 'verify') {
    const { data: prof } = await svc
      .from('profiles')
      .select('sending_email, resend_domain_id')
      .eq('id', id)
      .maybeSingle();
    const p = prof as { sending_email?: string; resend_domain_id?: string } | null;
    if (!p?.resend_domain_id) {
      return NextResponse.json({ error: 'Nessun dominio da verificare: esegui prima il setup.' }, { status: 400 });
    }
    let dom: ResendDomain;
    try {
      dom = await verifyDomain(p.resend_domain_id);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 502 });
    }
    const verified = dom.status === 'verified';
    await svc.from('profiles').update({ email_verified: verified }).eq('id', id);
    return NextResponse.json(payload(dom, verified, p.sending_email || null));
  }

  return NextResponse.json({ error: 'Azione non riconosciuta' }, { status: 400 });
}
