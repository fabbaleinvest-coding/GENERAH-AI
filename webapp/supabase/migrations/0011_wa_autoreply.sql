-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · Auto-reply WhatsApp (interruttore per-utente)
--
-- Aggiunge profiles.wa_autoreply: se true (default), il webwook in entrata
-- risponde automaticamente ai messaggi del cliente con Opus 4.8 ancorato alla
-- knowledge base, entro la finestra di servizio 24h (testo libero, gratuito).
-- L'utente può disattivarlo dal tab WhatsApp.
-- ───────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists wa_autoreply boolean not null default true;
