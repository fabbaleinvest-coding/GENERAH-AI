import { NextResponse } from 'next/server';

export const runtime = 'edge';

type Payload = {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  sector?: string;
  message?: string;
  lang?: string;
};

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: Request) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const message = (body.message || '').trim();

  if (!name || !email || !message || !isEmail(email)) {
    return NextResponse.json({ ok: false, error: 'validation' }, { status: 422 });
  }

  // Lead ricevuto. In produzione: inoltrare a CRM / email provider (es. Resend,
  // SendGrid) o webhook. Le credenziali vanno in variabili d'ambiente su Vercel.
  const lead = {
    receivedAt: new Date().toISOString(),
    name,
    company: (body.company || '').trim(),
    email,
    phone: (body.phone || '').trim(),
    sector: (body.sector || '').trim(),
    message,
    lang: body.lang === 'en' ? 'en' : 'it',
  };

  // Log strutturato visibile nei Runtime Logs di Vercel.
  console.log('[generah-ai:lead]', JSON.stringify(lead));

  // Esempio di inoltro (decommenta e configura RESEND_API_KEY + LEAD_TO su Vercel):
  // if (process.env.RESEND_API_KEY && process.env.LEAD_TO) {
  //   await fetch('https://api.resend.com/emails', {
  //     method: 'POST',
  //     headers: {
  //       Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       from: 'GENERAH AI <lead@your-domain.com>',
  //       to: process.env.LEAD_TO,
  //       subject: `Nuovo lead · ${lead.name}${lead.company ? ' — ' + lead.company : ''}`,
  //       text: JSON.stringify(lead, null, 2),
  //     }),
  //   });
  // }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'generah-ai contact' });
}
