-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · CRM avanzato (2/2) — calendario, timeline, automazioni
--   • appointments    → calendario interno (proposti/confermati dall'AI o dall'admin)
--   • lead_events     → timeline per lead (messaggi, azioni AI, cambi stato, import…)
--   • automation_runs → log delle automazioni con dedupe_key univoco (idempotenza:
--                       niente azioni doppie sullo stesso lead per lo stesso trigger)
-- Tutto con RLS per-utente. Le scritture automatiche server-to-server passano
-- dalla service_role (bypassa RLS) per conto dell'utente proprietario.
-- Esegui nel SQL editor di Supabase (una tantum).
-- ───────────────────────────────────────────────────────────────────────────

-- ── Calendario interno ───────────────────────────────────────────────────────
create table if not exists public.appointments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  lead_id    uuid references public.leads(id) on delete set null,
  title      text not null default '',
  starts_at  timestamptz not null,
  ends_at    timestamptz,
  status     text not null default 'proposed',  -- proposed/confirmed/done/cancelled
  location   text,
  notes      text,
  created_by text not null default 'ai',          -- 'ai' | 'admin'
  created_at timestamptz not null default now()
);

create index if not exists appointments_user_time_idx
  on public.appointments (user_id, starts_at);

alter table public.appointments enable row level security;

drop policy if exists "appointments_own" on public.appointments;
create policy "appointments_own" on public.appointments
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Timeline per lead ────────────────────────────────────────────────────────
create table if not exists public.lead_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  lead_id    uuid not null references public.leads(id) on delete cascade,
  type       text not null,                  -- nota/stato/email/whatsapp/chiamata/ai/appuntamento/import
  channel    text,                           -- email/whatsapp/telefono/sistema…
  summary    text not null default '',
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lead_events_lead_idx
  on public.lead_events (lead_id, created_at desc);
create index if not exists lead_events_user_idx
  on public.lead_events (user_id, created_at desc);

alter table public.lead_events enable row level security;

drop policy if exists "lead_events_select_own" on public.lead_events;
create policy "lead_events_select_own" on public.lead_events
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "lead_events_insert_own" on public.lead_events;
create policy "lead_events_insert_own" on public.lead_events
  for insert to authenticated with check (auth.uid() = user_id);

-- ── Log automazioni (idempotente) ────────────────────────────────────────────
create table if not exists public.automation_runs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  lead_id    uuid references public.leads(id) on delete cascade,
  automation text not null,                  -- es. 'first_touch', 'followup', 'book_appointment'
  dedupe_key text,                           -- univoco per (user_id, dedupe_key) → niente doppioni
  status     text not null default 'done',   -- done/skipped/failed/pending
  detail     text,
  created_at timestamptz not null default now()
);

create unique index if not exists automation_runs_dedupe_idx
  on public.automation_runs (user_id, dedupe_key) where (dedupe_key is not null);
create index if not exists automation_runs_lead_idx
  on public.automation_runs (lead_id, created_at desc);

alter table public.automation_runs enable row level security;

-- Sola lettura per l'utente; le scritture arrivano dalla service_role.
drop policy if exists "automation_runs_select_own" on public.automation_runs;
create policy "automation_runs_select_own" on public.automation_runs
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "automation_runs_insert_own" on public.automation_runs;
create policy "automation_runs_insert_own" on public.automation_runs
  for insert to authenticated with check (auth.uid() = user_id);
