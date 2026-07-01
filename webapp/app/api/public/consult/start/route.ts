import { NextResponse } from 'next/server';
import { profileBySlug, upsertConsultLead } from '@/lib/consult';
import { calendarConnected } from '@/lib/calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Avvio del video-consulto PUBBLICO (lead dell'azienda utente).
//  POST { slug, nome, email?, telefono?, motivo? }
//   → risolve lo slug al profilo dell'azienda (consulto attivo),
//   → crea/aggiorna il lead nel CRM dell'azienda (source "Video-consulto"),
//   → ritorna { ok, leadId, business, bookingEnabled } per la pagina pubblica.
//  Pubblico (nessun login del visitatore): scrive via service_role.
// ─────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: { slug?: string; nome?: string; email?: string; telefono?: string; motivo?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'payload non valido' }, { status: 400 });
  }

  const slug = String(body.slug || '').trim();
  const nome = String(body.nome || '').trim();
  const email = String(body.email || '').trim();
  const telefono = String(body.telefono || '').trim();
  if (!slug) return NextResponse.json({ ok: false, error: 'slug mancante' }, { status: 400 });
  if (!nome) return NextResponse.json({ ok: false, error: 'Inserisci il tuo nome.' }, { status: 400 });
  if (!email && !telefono) return NextResponse.json({ ok: false, error: 'Inserisci email o telefono.' }, { status: 400 });

  const prof = await profileBySlug(slug);
  if (!prof) return NextResponse.json({ ok: false, error: 'Consulto non disponibile.' }, { status: 404 });

  const leadId = await upsertConsultLead(prof.id, { nome, email, telefono, motivo: body.motivo });
  if (!leadId) return NextResponse.json({ ok: false, error: 'Impossibile registrare il contatto.' }, { status: 500 });

  return NextResponse.json({
    ok: true,
    leadId,
    bookingEnabled: calendarConnected(prof),
    business: {
      name: `${prof.nome || ''} ${prof.cognome || ''}`.trim() || 'Consulente',
      settore: prof.settore || '',
      headline: prof.consult_headline || '',
      subheadline: prof.consult_subheadline || '',
      hasCalendar: calendarConnected(prof),
    },
  });
}
