-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · Obiettivi degli AGENTI AI (multi-selezione) scelti dall'utente
-- nella Knowledge Base. Array di codici obiettivo (es. ["invio_offerte",
-- "appuntamento_azienda"]). Guida i prompt degli agenti (voce/WhatsApp/video)
-- e l'architettura del flusso CRM (email + WhatsApp + chiamate).
-- ───────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists agent_goals jsonb not null default '[]'::jsonb;
