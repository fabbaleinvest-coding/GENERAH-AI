import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';
import { googleConfigured } from '@/lib/google';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Configurazione del video-avatar pubblico + calendario.
//  GET  → stato (slug, consulto attivo, titoli, calendario collegato, base URL).
//  POST { action: 'save-consult', publicSlug, consultEnabled, headline, subheadline }
//  POST { action: 'save-calcom', calcomApiKey, calcomEventTypeId, calcomBookingUrl, timezone }
//  POST { action: 'disconnect-calendar' }
//  Auth: Bearer token utente (RLS su profiles).
// ─────────────────────────────────────────────────────────────────────────

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

function baseUrl(req: Request): string {
  const env = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');
  if (env) return env;
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  return host ? `${proto}://${host}` : '';
}

function normalizeSlug(raw: string): string {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export async function GET(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ ok: false, error: 'non autenticato' }, { status: 401 });
  const sb = userClient(token);
  const { data: u } = await sb.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) return NextResponse.json({ ok: false, error: 'sessione non valida' }, { status: 401 });

  const { data: prof } = await sb
    .from('profiles')
    .select(
      'public_slug, consult_enabled, consult_headline, consult_subheadline, calendar_provider, calcom_event_type_id, calcom_booking_url, booking_timezone',
    )
    .eq('id', uid)
    .maybeSingle();
  const p = (prof as Record<string, any> | null) || {};
  const base = baseUrl(req);
  const slug = p.public_slug || null;

  return NextResponse.json({
    ok: true,
    slug,
    consultEnabled: !!p.consult_enabled,
    headline: p.consult_headline || '',
    subheadline: p.consult_subheadline || '',
    calendarProvider: p.calendar_provider || null,
    calcomEventTypeId: p.calcom_event_type_id || '',
    calcomBookingUrl: p.calcom_booking_url || '',
    timezone: p.booking_timezone || 'Europe/Rome',
    googleConfigured: googleConfigured(),
    baseUrl: base,
    consultUrl: slug && base ? `${base}/c/${slug}` : null,
  });
}

export async function POST(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ ok: false, error: 'non autenticato' }, { status: 401 });
  const sb = userClient(token);
  const { data: u } = await sb.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) return NextResponse.json({ ok: false, error: 'sessione non valida' }, { status: 401 });

  let body: Record<string, any> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'payload non valido' }, { status: 400 });
  }
  const action = String(body.action || '');
  const base = baseUrl(req);

  if (action === 'save-consult') {
    let slug = normalizeSlug(String(body.publicSlug || ''));
    if (!slug) {
      // Genera uno slug se non fornito.
      const { data: prof } = await sb.from('profiles').select('nome').eq('id', uid).maybeSingle();
      slug = normalizeSlug(String((prof as { nome?: string } | null)?.nome || 'azienda')) || 'azienda';
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }
    const { error } = await sb
      .from('profiles')
      .update({
        public_slug: slug,
        consult_enabled: !!body.consultEnabled,
        consult_headline: String(body.headline || '').slice(0, 120) || null,
        consult_subheadline: String(body.subheadline || '').slice(0, 240) || null,
      })
      .eq('id', uid);
    if (error) {
      const dup = /duplicate|unique/i.test(error.message);
      return NextResponse.json(
        { ok: false, error: dup ? 'Questo indirizzo è già in uso, scegline un altro.' : error.message },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, slug, consultUrl: base ? `${base}/c/${slug}` : null });
  }

  if (action === 'save-calcom') {
    const apiKey = String(body.calcomApiKey || '').trim();
    const eventTypeId = String(body.calcomEventTypeId || '').trim();
    const bookingUrl = String(body.calcomBookingUrl || '').trim();
    const timezone = String(body.timezone || 'Europe/Rome').trim();
    if (!apiKey || !eventTypeId) {
      return NextResponse.json({ ok: false, error: 'Inserisci API key e Event Type ID di cal.com.' }, { status: 400 });
    }
    const { error } = await sb
      .from('profiles')
      .update({
        calendar_provider: 'calcom',
        calcom_api_key: apiKey,
        calcom_event_type_id: eventTypeId,
        calcom_booking_url: bookingUrl || null,
        booking_timezone: timezone,
      })
      .eq('id', uid);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, calendarProvider: 'calcom' });
  }

  if (action === 'disconnect-calendar') {
    const { error } = await sb
      .from('profiles')
      .update({
        calendar_provider: null,
        calcom_api_key: null,
        calcom_event_type_id: null,
        calcom_booking_url: null,
        google_refresh_token: null,
      })
      .eq('id', uid);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, calendarProvider: null });
  }

  return NextResponse.json({ ok: false, error: 'azione sconosciuta' }, { status: 400 });
}
