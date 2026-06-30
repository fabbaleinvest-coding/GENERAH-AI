-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · Tabella `leads` (CRM)
-- È la tabella su cui lo store legge/scrive i lead (loadLeads, addLead,
-- updateLead, removeLead, launchCampaign). Finora era referenziata ma non
-- creata: senza questa migrazione i lead restano solo in memoria.
-- Esegui nel SQL editor di Supabase (una tantum).
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.leads (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default '',
  phone       text not null default '',
  email       text not null default '',
  source      text not null default '',
  channel     text not null default '',
  interest    text not null default '',
  status      text not null default 'nuovo',
  score       integer not null default 0,
  notes       text not null default '',
  ai_summary  text not null default '',
  next_action text not null default '',
  ai_draft    jsonb,
  created_at  timestamptz not null default now(),
  last_touch  timestamptz not null default now()
);

create index if not exists leads_user_created_idx
  on public.leads (user_id, created_at desc);

alter table public.leads enable row level security;

-- Ogni utente vede e gestisce solo i propri lead. Il webhook Lead Ads scrive con
-- la service_role (bypassa RLS) inserendo i lead per l'utente proprietario della
-- pagina Meta.
drop policy if exists "leads_select_own" on public.leads;
create policy "leads_select_own" on public.leads
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "leads_insert_own" on public.leads;
create policy "leads_insert_own" on public.leads
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "leads_update_own" on public.leads;
create policy "leads_update_own" on public.leads
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "leads_delete_own" on public.leads;
create policy "leads_delete_own" on public.leads
  for delete to authenticated using (auth.uid() = user_id);
