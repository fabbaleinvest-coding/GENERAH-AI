-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · Connessione Meta per-utente (OAuth)
-- Una riga per utente. I token (utente long-lived + pagina) sono CIFRATI lato
-- applicazione (AES-256-GCM) prima dell'inserimento: anche leggendo la riga, i
-- campi *_cipher sono inutilizzabili senza la chiave server-only.
-- Esegui questo file nel SQL editor di Supabase (una tantum).
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.meta_connections (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  ad_account_id     text,
  page_id           text,
  ig_actor_id       text,
  account_name      text,
  page_name         text,
  token_cipher      text not null,
  page_token_cipher text,
  scopes            text,
  expires_at        timestamptz,
  connected_at      timestamptz not null default now()
);

alter table public.meta_connections enable row level security;

drop policy if exists "meta_connections_select_own" on public.meta_connections;
create policy "meta_connections_select_own"
  on public.meta_connections for select
  using (auth.uid() = user_id);

drop policy if exists "meta_connections_insert_own" on public.meta_connections;
create policy "meta_connections_insert_own"
  on public.meta_connections for insert
  with check (auth.uid() = user_id);

drop policy if exists "meta_connections_update_own" on public.meta_connections;
create policy "meta_connections_update_own"
  on public.meta_connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "meta_connections_delete_own" on public.meta_connections;
create policy "meta_connections_delete_own"
  on public.meta_connections for delete
  using (auth.uid() = user_id);
