-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · Assegnazione automatica del numero WhatsApp
--
--   wa_number_requests   lista d'attesa: registrata quando il pool è vuoto, così
--                        il titolare sa di dover rifornire i numeri (avviso admin)
--   assign_wa_number()   aggiornata: se non ci sono numeri liberi registra la
--                        richiesta in attesa; quando assegna, la segna evasa
--   release_wa_number()  libera il numero dell'utente (disdetta / cambio piano)
--
-- Esegui nel SQL editor di Supabase (una tantum), dopo la 0008.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.wa_number_requests (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','fulfilled')),
  created_at   timestamptz not null default now(),
  fulfilled_at timestamptz
);

alter table public.wa_number_requests enable row level security;

drop policy if exists "wa_req_select_own" on public.wa_number_requests;
create policy "wa_req_select_own" on public.wa_number_requests
  for select to authenticated using (auth.uid() = user_id);

-- Assegnazione (aggiornata): idempotente + gestione lista d'attesa.
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

  -- già assegnato?
  select * into v_row from public.wa_numbers
  where assigned_user_id = v_uid and status = 'assigned'
  limit 1;
  if found then
    return jsonb_build_object('assigned', true, 'already', true, 'pending', false,
      'id', v_row.id, 'e164', v_row.e164,
      'phone_number_id', v_row.phone_number_id, 'display_name', v_row.display_name);
  end if;

  -- numero libero dal pool
  select * into v_row from public.wa_numbers
  where status = 'available'
  order by created_at
  for update skip locked
  limit 1;

  if not found then
    -- pool vuoto: registra la richiesta in attesa (avviso per il titolare)
    insert into public.wa_number_requests (user_id, status, created_at)
    values (v_uid, 'pending', now())
    on conflict (user_id) do update set status = 'pending', fulfilled_at = null;
    return jsonb_build_object('assigned', false, 'pending', true, 'reason', 'no_numbers');
  end if;

  update public.wa_numbers
  set status = 'assigned', assigned_user_id = v_uid, assigned_at = now()
  where id = v_row.id;

  -- evade un'eventuale richiesta in attesa
  update public.wa_number_requests
  set status = 'fulfilled', fulfilled_at = now()
  where user_id = v_uid and status = 'pending';

  return jsonb_build_object('assigned', true, 'already', false, 'pending', false,
    'id', v_row.id, 'e164', v_row.e164,
    'phone_number_id', v_row.phone_number_id, 'display_name', v_row.display_name);
end;
$$;

revoke all on function public.assign_wa_number() from public;
grant execute on function public.assign_wa_number() to authenticated;

-- Rilascio del numero (per disdetta / cambio piano): torna disponibile nel pool.
create or replace function public.release_wa_number()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id text;
begin
  if v_uid is null then return null; end if;
  update public.wa_numbers
  set status = 'available', assigned_user_id = null, assigned_at = null
  where assigned_user_id = v_uid and status = 'assigned'
  returning id into v_id;
  return jsonb_build_object('released', v_id is not null, 'id', v_id);
end;
$$;

revoke all on function public.release_wa_number() from public;
grant execute on function public.release_wa_number() to authenticated;
