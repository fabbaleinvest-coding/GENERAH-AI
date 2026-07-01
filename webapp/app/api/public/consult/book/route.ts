import { NextResponse } from 'next/server';
import { profileBySlug } from '@/lib/consult';
import { serviceClient } from '@/lib/supabaseServer';
import { bookAppointment, calendarConnected } from '@/lib/calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Fissa appuntamento dal video-consulto pubblico.
//  POST { slug, leadId?, startsAt (ISO), nome, email?, telefono?, notes? }
//   → prenota sul calendario collegato dall'utente (cal.com o Google),
//     registra la riga in `appointments` e un evento in timeline del lead.
//  Pubblico (slug + service_role). Lo stesso endpoint-pattern è riusabile da
//  voce e WhatsApp con l'identità dell'utente.
// ─────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: {
    slug?: string;
    leadId?: string;
    startsAt?: string;
    nome?: string;
    email?: string;
    telefono?: string;
    notes?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, booked: false, error: 'payload non valido' }, { status: 400 });
  }

  const slug = String(body.slug || '').trim();
  const when = body.startsAt ? new Date(body.startsAt) : null;
  if (!slug || !when || Number.isNaN(when.getTime())) {
    return NextResponse.json({ ok: false, booked: false, error: 'slug o data/ora non validi' }, { status: 400 });
  }

  const prof = await profileBySlug(slug);
  const svc = serviceClient();
  if (!prof || !svc) return NextResponse.json({ ok: false, booked: false, error: 'non disponibile' }, { status: 404 });

  // Nessun calendario prenotabile: registra una proposta interna (da confermare).
  if (!calendarConnected(prof)) {
    await svc.from('appointments').insert({
      user_id: prof.id,
      lead_id: body.leadId || null,
      title: `Consulto · ${body.nome || 'Contatto'}`,
      starts_at: when.toISOString(),
      status: 'proposed',
      notes: body.notes || null,
      created_by: 'ai',
    });
    return NextResponse.json({
      ok: true,
      booked: false,
      proposed: true,
      bookingUrl: prof.calcom_booking_url || null,
      message: 'Appuntamento proposto: sarà confermato a breve.',
    });
  }

  const result = await bookAppointment(prof, {
    startsAt: when.toISOString(),
    name: body.nome || 'Contatto',
    email: body.email || '',
    phone: body.telefono || '',
    notes: body.notes || '',
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, booked: false, error: result.error }, { status: 200 });
  }

  await svc.from('appointments').insert({
    user_id: prof.id,
    lead_id: body.leadId || null,
    title: `Consulto · ${body.nome || 'Contatto'}`,
    starts_at: when.toISOString(),
    status: 'confirmed',
    location: result.url || null,
    notes: body.notes || null,
    created_by: 'ai',
  });

  if (body.leadId) {
    await svc.from('lead_events').insert({
      user_id: prof.id,
      lead_id: body.leadId,
      type: 'appuntamento',
      channel: 'video',
      summary: `Appuntamento fissato per ${when.toLocaleString('it-IT')}`,
      payload: { provider: result.provider, id: result.id, url: result.url },
    });
    await svc.from('leads').update({ last_interaction_at: new Date().toISOString() }).eq('id', body.leadId).eq('user_id', prof.id);
  }

  return NextResponse.json({ ok: true, booked: true, provider: result.provider, url: result.url });
}
