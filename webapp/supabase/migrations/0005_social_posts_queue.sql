-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · Coda di pubblicazione social (Graph diretto)
-- I post organici programmati su Facebook/Instagram passano da qui. Un cron
-- (/api/social/cron) li pubblica all'orario previsto con il token della pagina
-- dell'utente (la pubblicazione IG non ha scheduling nativo lato server, quindi
-- lo gestiamo noi). Esegui nel SQL editor di Supabase (una tantum).
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.social_posts_queue (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  networks      jsonb not null default '["facebook","instagram"]'::jsonb,
  caption       text not null default '',
  image_url     text,
  scheduled_at  timestamptz not null,
  status        text not null default 'pending', -- pending|publishing|published|partial|failed
  results       jsonb,
  attempts      integer not null default 0,
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists social_queue_due_idx
  on public.social_posts_queue (status, scheduled_at);
create index if not exists social_queue_user_idx
  on public.social_posts_queue (user_id, scheduled_at desc);

alter table public.social_posts_queue enable row level security;

-- L'utente vede/gestisce solo i propri post in coda. Il cron pubblica con la
-- service_role (bypassa RLS).
drop policy if exists "spq_select_own" on public.social_posts_queue;
create policy "spq_select_own" on public.social_posts_queue
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "spq_insert_own" on public.social_posts_queue;
create policy "spq_insert_own" on public.social_posts_queue
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "spq_update_own" on public.social_posts_queue;
create policy "spq_update_own" on public.social_posts_queue
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "spq_delete_own" on public.social_posts_queue;
create policy "spq_delete_own" on public.social_posts_queue
  for delete to authenticated using (auth.uid() = user_id);
