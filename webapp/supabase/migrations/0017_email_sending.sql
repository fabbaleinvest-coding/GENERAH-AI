-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · Email di invio dell'utente (Resend, dominio verificato).
--
-- L'utente invia dalla PROPRIA email professionale (dominio verificato in Resend
-- — account unico di piattaforma) così le email non finiscono in spam. I campi
-- sono gestiti dal server (service role) durante il setup/verifica; il client li
-- legge in sola lettura (userToRow NON li scrive, per non sovrascriverli).
--   sending_email     indirizzo mittente professionale (es. info@azienda.it)
--   sending_from_name nome visualizzato del mittente
--   sending_domain    dominio di sending_email (verificato in Resend)
--   resend_domain_id  id del dominio nell'account Resend di piattaforma
--   email_verified    true quando il dominio risulta 'verified' su Resend
-- ───────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists sending_email     text,
  add column if not exists sending_from_name text,
  add column if not exists sending_domain    text,
  add column if not exists resend_domain_id  text,
  add column if not exists email_verified    boolean not null default false;
