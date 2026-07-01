-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · Video-avatar pubblico (leads dell'utente) + calendario appuntamenti
--
-- (A) L'utente pubblica il proprio video-consulto ai PROPRI lead tramite una
--     pagina pubblica /c/<public_slug>. Il visitatore lascia i contatti in un
--     form → nasce un lead nel CRM dell'utente → parte il consulto (ancorato
--     alla KB dell'utente). A fine consulto Opus 4.8 scrive un recap nel CRM.
--
-- (B) Video-avatar, chiamate vocali (DIDWW) e WhatsApp possono FISSARE
--     appuntamenti su cal.com OPPURE Google Calendar collegato dall'utente.
--
--   profiles.public_slug          handle pubblico univoco (URL del consulto)
--   profiles.consult_enabled      il consulto pubblico è attivo?
--   profiles.consult_headline     titolo mostrato sulla pagina pubblica
--   profiles.consult_subheadline  sottotitolo/descrizione
--   profiles.calendar_provider    'calcom' | 'google' | null
--   profiles.calcom_api_key       API key cal.com dell'utente (server-managed)
--   profiles.calcom_event_type_id id dell'event type cal.com da prenotare
--   profiles.calcom_booking_url   link pubblico di prenotazione (fallback)
--   profiles.google_refresh_token refresh token OAuth Google (server-managed)
--   profiles.google_calendar_id   id del calendario Google (default 'primary')
--   profiles.booking_timezone     timezone per gli appuntamenti (default Europe/Rome)
--
--   public_business_by_slug(slug) RPC SICURA: dai lo slug, torna SOLO i campi
--                                 pubblici (nome attività, settore, titoli,
--                                 se il consulto è attivo). Nessun dato privato.
--
-- Idempotente. Esegui nel SQL editor di Supabase (una tantum), dopo la 0018.
-- ───────────────────────────────────────────────────────────────────────────

-- 1) Campi consulto pubblico + calendario -----------------------------------
alter table public.profiles
  add column if not exists public_slug          text,
  add column if not exists consult_enabled       boolean not null default false,
  add column if not exists consult_headline       text,
  add column if not exists consult_subheadline     text,
  add column if not exists calendar_provider      text,
  add column if not exists calcom_api_key         text,
  add column if not exists calcom_event_type_id   text,
  add column if not exists calcom_booking_url     text,
  add column if not exists google_refresh_token   text,
  add column if not exists google_calendar_id     text,
  add column if not exists booking_timezone       text not null default 'Europe/Rome';

-- Slug univoco (case-insensitive) quando presente.
create unique index if not exists profiles_public_slug_uniq
  on public.profiles (lower(public_slug)) where public_slug is not null;

-- 2) Lettura pubblica sicura del business per slug ---------------------------
-- security definer: bypassa la RLS ma restituisce SOLO campi pubblici e SOLO se
-- il consulto è attivo. Niente email, telefono, chiavi o dati privati.
create or replace function public.public_business_by_slug(p_slug text)
returns table (
  user_id       uuid,
  business_name text,
  settore       text,
  headline      text,
  subheadline   text,
  has_calendar  boolean
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    p.id as user_id,
    trim(coalesce(p.nome,'') || ' ' || coalesce(p.cognome,'')) as business_name,
    coalesce(p.settore,'') as settore,
    coalesce(p.consult_headline,'') as headline,
    coalesce(p.consult_subheadline,'') as subheadline,
    (p.calendar_provider is not null) as has_calendar
  from public.profiles p
  where lower(p.public_slug) = lower(p_slug)
    and p.consult_enabled = true
  limit 1;
$$;

revoke all on function public.public_business_by_slug(text) from public;
grant execute on function public.public_business_by_slug(text) to anon, authenticated;
