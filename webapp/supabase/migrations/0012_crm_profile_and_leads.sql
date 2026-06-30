-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · CRM avanzato (1/2) — estensione profilo + lead
-- Aggiunge al profilo la "testa" del CRM autonomo (settore classificato dalla
-- KB, obiettivo dell'automazione, livello di autonomia, orari di lavoro) e ai
-- lead i campi operativi (tag, batch d'import Excel, consenso outreach, pausa
-- automazione per singolo lead). Tutto idempotente.
-- Esegui nel SQL editor di Supabase (una tantum).
-- ───────────────────────────────────────────────────────────────────────────

-- Profilo: testa del CRM autonomo
alter table public.profiles
  -- settore "operativo" derivato dalla knowledge base (clinica/veterinaria/
  -- odontoiatra/prodotti_servizi/altro): guida la logica delle automazioni.
  add column if not exists sector_kind text,
  -- obiettivo: 'appuntamento' (fissare una visita) oppure 'offerta_chiusura'
  -- (inviare un'offerta dettagliata e chiudere la vendita).
  add column if not exists automation_goal text,
  -- 'auto' = l'AI agisce da sola; 'approva' = prepara e attende l'ok dell'admin.
  add column if not exists crm_autonomy text not null default 'auto',
  -- orari di lavoro per il calendario interno e la finestra di contatto.
  add column if not exists crm_business_hours jsonb not null default '{}'::jsonb;

-- Lead: campi operativi del CRM
alter table public.leads
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists import_batch text,
  add column if not exists consent boolean not null default false,
  add column if not exists automation_paused boolean not null default false;
