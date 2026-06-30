-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · WhatsApp (numeri di proprietà + conversazioni)
--
-- Modello: GENERAH (titolare) possiede un POOL di numeri (comprati su DIDWW e
-- registrati su WhatsApp Cloud API di Meta). All'acquisto di un pacchetto, un
-- numero libero viene ASSEGNATO all'utente. WhatsApp lega un numero a una sola
-- identità, quindi "condividere" = un numero dedicato per utente, di proprietà
-- e a carico del titolare.
--
--   wa_numbers   pool dei numeri (1 riga per numero) + stato/assegnazione
--   wa_messages  log delle conversazioni in entrata/uscita (per CRM e dashboard)
--   assign_wa_number()  RPC che assegna un numero libero all'utente autenticato
--
-- Esegui nel SQL editor di Supabase (una tantum), dopo la 0007.
-- ───────────────────────────────────────────────────────────────────────────

-- 1) Pool numeri ------------------------------------------------------------
create table if not exists public.wa_numbers (
  id               text primary key,
  e164             text not null unique,
  provider         text not null default 'didww',
  waba_id          text,                 -- WhatsApp Business Account id (Meta)
  phone_number_id  text unique,          -- Phone Number ID della Cloud API
  display_name     text not null default '',
  capabilities     jsonb not null default '["whatsapp"]'::jsonb, -- es. ["whatsapp","voice"]
  status           text not null default 'available'
                     check (status in ('available','assigned','suspended')),
  assigned_user_id uuid references auth.users(id) on delete set null,
  assigned_at      timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists wa_numbers_status_idx on public.wa_numbers (status);
create index if not exists wa_numbers_assigned_idx on public.wa_numbers (assigned_user_id);

alter table public.wa_numbers enable row level security;

-- L'utente vede SOLO il proprio numero assegnato. La gestione del pool
-- (inserimento numeri, sospensione) avviene con la service_role / lato admin.
drop policy if exists "wa_numbers_select_own" on public.wa_numbers;
create policy "wa_numbers_select_own" on public.wa_numbers
  for select to authenticated using (auth.uid() = assigned_user_id);

-- 2) Log conversazioni ------------------------------------------------------
create table if not exists public.wa_messages (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  wa_number_id  text references public.wa_numbers(id) on delete set null,
  contact       text not null,           -- numero E.164 del cliente finale
  direction     text not null check (direction in ('inbound','outbound')),
  wamid         text,                     -- id messaggio WhatsApp (idempotenza)
  msg_type      text not null default 'text',
  body          text not null default '',
  template_name text,
  status        text not null default '',
  created_at    timestamptz not null default now()
);

create index if not exists wa_messages_user_created_idx
  on public.wa_messages (user_id, created_at desc);
create index if not exists wa_messages_user_contact_idx
  on public.wa_messages (user_id, contact, created_at desc);
create unique index if not exists wa_messages_wamid_uniq
  on public.wa_messages (wamid) where wamid is not null;

alter table public.wa_messages enable row level security;

-- L'utente legge solo le proprie conversazioni. Le scritture (webhook in
-- entrata, invio in uscita) avvengono con la service_role.
drop policy if exists "wa_messages_select_own" on public.wa_messages;
create policy "wa_messages_select_own" on public.wa_messages
  for select to authenticated using (auth.uid() = user_id);

-- 3) Assegnazione di un numero all'utente -----------------------------------
-- Idempotente: se l'utente ha già un numero assegnato lo restituisce; altrimenti
-- prende un numero `available` (lock con SKIP LOCKED per concorrenza) e lo
-- assegna. Restituisce un jsonb con l'esito.
create or replace function public.assign_wa_number()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.wa_numbers;
begin
  if v_uid is null then return null; end if;

  select * into v_row from public.wa_numbers
  where assigned_user_id = v_uid and status = 'assigned'
  limit 1;
  if found then
    return jsonb_build_object('assigned', true, 'already', true,
      'id', v_row.id, 'e164', v_row.e164,
      'phone_number_id', v_row.phone_number_id, 'display_name', v_row.display_name);
  end if;

  select * into v_row from public.wa_numbers
  where status = 'available'
  order by created_at
  for update skip locked
  limit 1;
  if not found then
    return jsonb_build_object('assigned', false, 'reason', 'no_numbers');
  end if;

  update public.wa_numbers
  set status = 'assigned', assigned_user_id = v_uid, assigned_at = now()
  where id = v_row.id;

  return jsonb_build_object('assigned', true, 'already', false,
    'id', v_row.id, 'e164', v_row.e164,
    'phone_number_id', v_row.phone_number_id, 'display_name', v_row.display_name);
end;
$$;

revoke all on function public.assign_wa_number() from public;
grant execute on function public.assign_wa_number() to authenticated;
