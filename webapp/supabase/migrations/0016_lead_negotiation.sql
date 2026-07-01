-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · Stato di avanzamento della trattativa con il lead.
--   deal_stage          fase pipeline (nuovo → … → vinto/perso)
--   progress_summary    riepilogo AI-mantenuto della conversazione/trattativa
--   last_interaction_at timestamp dell'ultima interazione dell'agente/lead
-- Formano la MEMORIA che ogni agente (voce/WhatsApp/video/email) legge prima di
-- agire, per riprendere dal punto giusto verso l'obiettivo.
-- ───────────────────────────────────────────────────────────────────────────

alter table public.leads
  add column if not exists deal_stage text,
  add column if not exists progress_summary text,
  add column if not exists last_interaction_at timestamptz;
