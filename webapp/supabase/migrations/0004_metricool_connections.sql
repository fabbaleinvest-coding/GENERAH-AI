-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · Connessione Metricool per-utente
-- Ogni admin collega il PROPRIO account Metricool (token API + userId) e sceglie
-- un brand (blogId). Il token è cifrato (AES-256-GCM, chiave server-only) e
-- salvato qui, una riga per utente, protetta da RLS. La programmazione dei post
-- usa poi queste credenziali.
-- Esegui nel SQL editor di Supabase (una tantum).
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.metricool_connections (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  token_cipher text not null,
  mc_user_id   text not null,
  blog_id      text not null,
  brand_label  text,
  networks     jsonb not null default '[]'::jsonb,
  connected_at timestamptz not null default now()
);

alter table public.metricool_connections enable row level security;

drop policy if exists "mc_conn_select_own" on public.metricool_connections;
create policy "mc_conn_select_own" on public.metricool_connections
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "mc_conn_insert_own" on public.metricool_connections;
create policy "mc_conn_insert_own" on public.metricool_connections
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "mc_conn_update_own" on public.metricool_connections;
create policy "mc_conn_update_own" on public.metricool_connections
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "mc_conn_delete_own" on public.metricool_connections;
create policy "mc_conn_delete_own" on public.metricool_connections
  for delete to authenticated using (auth.uid() = user_id);
