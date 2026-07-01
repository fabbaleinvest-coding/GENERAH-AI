// ───────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Calendario appuntamenti (cal.com / Google Calendar).
//
//  Video-avatar, agente vocale (DIDWW) e WhatsApp usano lo STESSO helper per
//  fissare un appuntamento sul calendario che l'utente ha collegato nella dash.
//
//  • cal.com  → prenotazione via API v2 (Bearer API key + eventTypeId). È la via
//               a ZERO attrito: l'utente incolla API key + event type e siamo
//               operativi (niente OAuth di piattaforma).
//  • Google   → creazione evento via Google Calendar API con il refresh token
//               OAuth dell'utente. Richiede le credenziali OAuth di piattaforma
//               (GOOGLE_CLIENT_ID/SECRET); collegamento gestito nella dash.
//
//  Ritorno uniforme: { ok, id?, url?, provider, error? } così i chiamanti
//  (consulto/voce/WhatsApp) non conoscono i dettagli del provider.
// ───────────────────────────────────────────────────────────────────────────

export type CalProfile = {
  calendar_provider?: string | null;
  calcom_api_key?: string | null;
  calcom_event_type_id?: string | null;
  calcom_booking_url?: string | null;
  google_refresh_token?: string | null;
  google_calendar_id?: string | null;
  booking_timezone?: string | null;
};

export type BookResult = {
  ok: boolean;
  provider: 'calcom' | 'google' | 'none';
  id?: string;
  url?: string;
  error?: string;
};

export type BookInput = {
  startsAt: string; // ISO 8601
  durationMinutes?: number;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
};

// Un calendario è collegato e prenotabile programmaticamente?
export function calendarConnected(p: CalProfile | null | undefined): boolean {
  if (!p) return false;
  if (p.calendar_provider === 'calcom') return !!(p.calcom_api_key && p.calcom_event_type_id);
  if (p.calendar_provider === 'google') return !!p.google_refresh_token;
  return false;
}

const CALCOM = 'https://api.cal.com/v2';

// Prenotazione su cal.com (API v2). L'eventType definisce durata e disponibilità;
// cal.com rifiuta gli slot non disponibili → l'errore torna al chiamante.
async function bookCalcom(p: CalProfile, input: BookInput): Promise<BookResult> {
  const apiKey = (p.calcom_api_key || '').trim();
  const eventTypeId = Number((p.calcom_event_type_id || '').toString().trim());
  const tz = (p.booking_timezone || 'Europe/Rome').trim();
  if (!apiKey || !Number.isFinite(eventTypeId)) {
    return { ok: false, provider: 'calcom', error: 'cal.com non configurato (API key / event type mancante)' };
  }

  const body = {
    start: input.startsAt,
    eventTypeId,
    attendee: {
      name: input.name || 'Contatto',
      email: input.email || '',
      timeZone: tz,
      language: 'it',
    },
    ...(input.notes ? { metadata: { note: input.notes.slice(0, 480) } } : {}),
    ...(input.phone ? { bookingFieldsResponses: { attendeePhoneNumber: input.phone } } : {}),
  };

  try {
    const res = await fetch(`${CALCOM}/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        (data as any)?.error?.message ||
        (data as any)?.message ||
        `cal.com ${res.status}`;
      return { ok: false, provider: 'calcom', error: String(msg) };
    }
    const d = (data as any)?.data || data;
    return {
      ok: true,
      provider: 'calcom',
      id: String(d?.uid || d?.id || ''),
      url: d?.meetingUrl || d?.location || undefined,
    };
  } catch (e) {
    return { ok: false, provider: 'calcom', error: (e as Error).message };
  }
}

// Google Calendar: richiede scambio refresh_token → access_token e insert event.
// Le credenziali OAuth di piattaforma (GOOGLE_CLIENT_ID/SECRET) e il collegamento
// dell'utente sono gestiti in fase di connessione (dash). Qui creiamo l'evento.
async function bookGoogle(p: CalProfile, input: BookInput): Promise<BookResult> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refresh = (p.google_refresh_token || '').trim();
  const calId = (p.google_calendar_id || 'primary').trim();
  const tz = (p.booking_timezone || 'Europe/Rome').trim();
  if (!clientId || !clientSecret || !refresh) {
    return { ok: false, provider: 'google', error: 'Google Calendar non collegato' };
  }
  try {
    // 1) refresh → access token
    const tokRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refresh,
        grant_type: 'refresh_token',
      }),
    });
    const tok = await tokRes.json().catch(() => ({}));
    const access = (tok as any)?.access_token;
    if (!access) return { ok: false, provider: 'google', error: 'Google: refresh token non valido' };

    // 2) crea evento
    const dur = Math.max(15, input.durationMinutes || 30);
    const start = new Date(input.startsAt);
    const end = new Date(start.getTime() + dur * 60000);
    const ev = {
      summary: `Appuntamento · ${input.name || 'Contatto'}`,
      description: input.notes || 'Appuntamento fissato da GENERAH AI',
      start: { dateTime: start.toISOString(), timeZone: tz },
      end: { dateTime: end.toISOString(), timeZone: tz },
      attendees: input.email ? [{ email: input.email, displayName: input.name }] : undefined,
    };
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?sendUpdates=all`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(ev),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, provider: 'google', error: String((data as any)?.error?.message || `Google ${res.status}`) };
    }
    return { ok: true, provider: 'google', id: String((data as any)?.id || ''), url: (data as any)?.htmlLink };
  } catch (e) {
    return { ok: false, provider: 'google', error: (e as Error).message };
  }
}

// Prenotazione unificata: sceglie il provider collegato dall'utente.
export async function bookAppointment(p: CalProfile, input: BookInput): Promise<BookResult> {
  if (p?.calendar_provider === 'calcom') return bookCalcom(p, input);
  if (p?.calendar_provider === 'google') return bookGoogle(p, input);
  return { ok: false, provider: 'none', error: 'Nessun calendario collegato' };
}
