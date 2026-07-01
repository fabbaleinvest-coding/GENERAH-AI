// ───────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Helper del video-consulto pubblico (lato server, service_role).
//
//  Il visitatore (lead dell'azienda dell'utente) non ha un account: il consulto
//  gira per conto dell'UTENTE proprietario, individuato dallo slug pubblico.
//  Qui: risoluzione slug→profilo completo (per grounding/booking), creazione/
//  aggiornamento del lead nel CRM dell'utente + evento in timeline, e la
//  prenotazione riutilizzabile da voce / WhatsApp / video-consulto.
// ───────────────────────────────────────────────────────────────────────────

import { serviceClient } from './supabaseServer';
import { bookAppointment, calendarConnected, type CalProfile, type BookInput } from './calendar';

export type ConsultProfile = {
  id: string;
  nome: string | null;
  cognome: string | null;
  settore: string | null;
  sector_kind: string | null;
  agent_goals: string[] | null;
  consult_enabled: boolean | null;
  consult_headline: string | null;
  consult_subheadline: string | null;
  calendar_provider: string | null;
  calcom_api_key: string | null;
  calcom_event_type_id: string | null;
  calcom_booking_url: string | null;
  google_refresh_token: string | null;
  google_calendar_id: string | null;
  booking_timezone: string | null;
};

// Risolve lo slug → profilo COMPLETO (privato). Solo se il consulto è attivo.
export async function profileBySlug(slug: string): Promise<ConsultProfile | null> {
  const svc = serviceClient();
  if (!svc || !slug?.trim()) return null;
  const { data } = await svc
    .from('profiles')
    .select(
      'id,nome,cognome,settore,sector_kind,agent_goals,consult_enabled,consult_headline,consult_subheadline,calendar_provider,calcom_api_key,calcom_event_type_id,calcom_booking_url,google_refresh_token,google_calendar_id,booking_timezone'
    )
    .ilike('public_slug', slug.trim())
    .eq('consult_enabled', true)
    .maybeSingle();
  return (data as ConsultProfile) || null;
}

export type VisitorInput = {
  nome: string;
  email?: string;
  telefono?: string;
  motivo?: string;
};

// Crea (o riusa, per email/telefono) il lead del visitatore nel CRM dell'utente.
// Ritorna l'id del lead, o null se il DB non è disponibile.
export async function upsertConsultLead(userId: string, v: VisitorInput): Promise<string | null> {
  const svc = serviceClient();
  if (!svc || !userId) return null;

  const name = (v.nome || '').trim() || 'Contatto video-consulto';
  const email = (v.email || '').trim().toLowerCase();
  const phone = (v.telefono || '').trim();

  // Riuso: stesso utente + stessa email o telefono → aggiorno, non duplico.
  let existingId: string | null = null;
  if (email || phone) {
    const or = [email ? `email.eq.${email}` : '', phone ? `phone.eq.${phone}` : '']
      .filter(Boolean)
      .join(',');
    const { data: found } = await svc
      .from('leads')
      .select('id')
      .eq('user_id', userId)
      .or(or)
      .limit(1)
      .maybeSingle();
    existingId = (found as { id?: string } | null)?.id || null;
  }

  const now = new Date().toISOString();
  let leadId = existingId;

  if (existingId) {
    await svc
      .from('leads')
      .update({ name, email, phone, consent: true, last_interaction_at: now })
      .eq('id', existingId)
      .eq('user_id', userId);
  } else {
    const { data: ins } = await svc
      .from('leads')
      .insert({
        user_id: userId,
        name,
        email,
        phone,
        source: 'Video-consulto',
        status: 'nuovo',
        consent: true,
        last_interaction_at: now,
      })
      .select('id')
      .maybeSingle();
    leadId = (ins as { id?: string } | null)?.id || null;
  }

  // Timeline: il lead ha avviato un video-consulto.
  if (leadId) {
    await svc.from('lead_events').insert({
      user_id: userId,
      lead_id: leadId,
      type: 'ai',
      channel: 'video',
      summary: v.motivo ? `Avviato video-consulto — «${v.motivo.slice(0, 200)}»` : 'Avviato video-consulto',
      payload: { motivo: v.motivo || '' },
    });
  }
  return leadId;
}

// ── Booking riutilizzabile (voce / WhatsApp / video-consulto) ────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BookForUserInput = BookInput & { leadId?: string | null };

// Prenota sul calendario collegato dell'utente (cal.com o Google) e registra
// appuntamento + evento in timeline. Tollera lead con id non-uuid (es. WhatsApp):
// in quel caso non collega la FK ma prenota comunque sul calendario esterno.
// Best-effort.
export async function bookForUser(
  userId: string,
  cal: CalProfile,
  input: BookForUserInput,
): Promise<{ ok: boolean; booked: boolean; provider?: string; url?: string; error?: string }> {
  const svc = serviceClient();
  if (!svc || !userId) return { ok: false, booked: false, error: 'db non disponibile' };

  const leadFk = input.leadId && UUID_RE.test(input.leadId) ? input.leadId : null;
  const title = `Appuntamento · ${input.name || 'Contatto'}`;
  const startIso = input.startsAt;

  // Nessun calendario prenotabile: registra solo la proposta interna.
  if (!calendarConnected(cal)) {
    try {
      await svc.from('appointments').insert({
        user_id: userId,
        lead_id: leadFk,
        title,
        starts_at: startIso,
        status: 'proposed',
        notes: input.notes || null,
        created_by: 'ai',
      });
    } catch {
      /* best-effort */
    }
    return { ok: true, booked: false };
  }

  const result = await bookAppointment(cal, {
    startsAt: startIso,
    name: input.name || 'Contatto',
    email: input.email || '',
    phone: input.phone || '',
    notes: input.notes || '',
    durationMinutes: input.durationMinutes,
  });

  if (!result.ok) return { ok: false, booked: false, provider: result.provider, error: result.error };

  try {
    await svc.from('appointments').insert({
      user_id: userId,
      lead_id: leadFk,
      title,
      starts_at: startIso,
      status: 'confirmed',
      location: result.url || null,
      notes: input.notes || null,
      created_by: 'ai',
    });
    if (leadFk) {
      await svc.from('lead_events').insert({
        user_id: userId,
        lead_id: leadFk,
        type: 'appuntamento',
        channel: 'sistema',
        summary: `Appuntamento fissato per ${new Date(startIso).toLocaleString('it-IT')}`,
        payload: { provider: result.provider, id: result.id, url: result.url },
      });
      await svc.from('leads').update({ last_interaction_at: new Date().toISOString() }).eq('id', leadFk).eq('user_id', userId);
    }
  } catch {
    /* best-effort */
  }

  return { ok: true, booked: true, provider: result.provider, url: result.url };
}
