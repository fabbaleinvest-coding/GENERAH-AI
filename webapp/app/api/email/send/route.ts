import { NextResponse } from 'next/server';
import { userClient, serviceClient } from '@/lib/supabaseServer';
import { resendConfigured, sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Invio email dalla mail professionale dell'utente (Resend).
//  POST { to, subject, html?, text?, replyTo? }
//  Invia SOLO se il dominio dell'utente è verificato (email_verified). Il
//  mittente è la sua sending_email; reply-to di default alla stessa.
//  Auth: Bearer token utente. Config: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY.
// ─────────────────────────────────────────────────────────────────────────

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

export async function POST(req: Request) {
  if (!resendConfigured()) return NextResponse.json({ error: 'RESEND_API_KEY mancante (env)' }, { status: 500 });

  const tok = bearer(req);
  const svc = serviceClient();
  if (!tok || !svc) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  const { data: auth } = await userClient(tok).auth.getUser();
  const id = auth?.user?.id;
  if (!id) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }

  const to = String(body?.to || '').trim();
  const subject = String(body?.subject || '').trim();
  const text = typeof body?.text === 'string' ? body.text : undefined;
  const html = typeof body?.html === 'string' ? body.html : undefined;
  const replyTo = typeof body?.replyTo === 'string' ? body.replyTo : undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Destinatario non valido' }, { status: 400 });
  }
  if (!subject) return NextResponse.json({ error: 'Oggetto mancante' }, { status: 400 });
  if (!text && !html) return NextResponse.json({ error: 'Corpo mancante' }, { status: 400 });

  const { data: prof } = await svc
    .from('profiles')
    .select('sending_email, sending_from_name, email_verified')
    .eq('id', id)
    .maybeSingle();
  const p = prof as { sending_email?: string; sending_from_name?: string; email_verified?: boolean } | null;
  if (!p?.sending_email || !p.email_verified) {
    return NextResponse.json(
      { error: 'Email di invio non configurata o dominio non verificato.' },
      { status: 409 },
    );
  }

  try {
    const r = await sendEmail({
      from: p.sending_email,
      fromName: p.sending_from_name || undefined,
      to,
      subject,
      text,
      html,
      replyTo: replyTo || p.sending_email,
    });
    return NextResponse.json({ ok: true, id: r.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
