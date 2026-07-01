-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · Connessione Higgsfield DI PIATTAFORMA (MCP OAuth) — SINGLETON
--
-- Una sola riga (id = 'singleton'): l'account Higgsfield di GENERAH che fa da
-- motore creativo condiviso per TUTTI gli utenti a pagamento. NON è per-utente.
--
-- Sicurezza: la RLS è abilitata SENZA policy per gli utenti (deny-all). Solo il
-- service_role (server, chiave segreta SUPABASE_SERVICE_ROLE_KEY) legge/scrive
-- questa tabella. Access/refresh token e client_secret sono comunque CIFRATI a
-- livello applicativo (AES-256-GCM) prima dell'inserimento.
--
-- Esegui questo file nel SQL editor di Supabase (una tantum).
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.higgsfield_platform_connection (
  id                    text primary key default 'singleton',
  client_id             text,
  client_secret_cipher  text,
  endpoints             jsonb,
  scopes                text,
  access_token_cipher   text,
  refresh_token_cipher  text,
  expires_at            timestamptz,
  pending_cipher        text,
  connected_at          timestamptz,
  updated_at            timestamptz not null default now()
);

-- RLS on, nessuna policy → nessun accesso per anon/authenticated. Solo il
-- service_role (che bypassa la RLS) può operare su questa tabella.
alter table public.higgsfield_platform_connection enable row level security;

-- Blindatura esplicita: revoca ogni privilegio ai ruoli client.
revoke all on public.higgsfield_platform_connection from anon, authenticated;
