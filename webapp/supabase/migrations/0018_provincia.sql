-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · Provincia dell'attività + assegnazione numero per prefisso
--
-- Alla registrazione l'utente indica la PROVINCIA in cui svolge l'attività. Da
-- lì ricaviamo il prefisso geografico (teleselettivo del capoluogo) e, quando
-- assegniamo il numero del pool DIDWW (lo STESSO per WhatsApp e agente vocale),
-- preferiamo un numero locale a quella zona, così il cliente finale riconosce
-- un recapito del proprio territorio.
--
--   profiles.provincia         nome della provincia scelto in registrazione
--   profiles.provincia_prefix  prefisso geografico (con lo zero: '06','0922'…)
--   assign_wa_number_by_prefix(p_prefix)  RPC: assegna un numero preferendo il
--                                         prefisso; fallback a qualsiasi numero
--                                         libero; gestisce la lista d'attesa.
--
-- Idempotente. Esegui nel SQL editor di Supabase (una tantum), dopo la 0017.
-- ───────────────────────────────────────────────────────────────────────────

-- 1) Provincia sul profilo --------------------------------------------------
alter table public.profiles
  add column if not exists provincia        text,
  add column if not exists provincia_prefix text;

-- 2) Assegnazione numero preferendo il prefisso -----------------------------
-- Come assign_wa_number() (0009) ma, a parità di disponibilità, sceglie prima
-- un numero il cui E.164 inizia per +39<prefisso> (numero locale della zona).
-- Se non ce n'è uno locale libero, ripiega su un qualsiasi numero disponibile.
-- Se il pool è del tutto vuoto, registra la richiesta in attesa (avviso admin).
create or replace function public.assign_wa_number_by_prefix(p_prefix text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_row    public.wa_numbers;
  v_prefix text := nullif(regexp_replace(coalesce(p_prefix, ''), '\D', '', 'g'), '');
  v_like   text;
begin
  if v_uid is null then return null; end if;

  -- già assegnato? (idempotente — non riassegna, non spreca numeri del pool)
  select * into v_row from public.wa_numbers
  where assigned_user_id = v_uid and status = 'assigned'
  limit 1;
  if found then
    return jsonb_build_object('assigned', true, 'already', true, 'pending', false,
      'local', v_prefix is not null and v_row.e164 like '+39' || v_prefix || '%',
      'id', v_row.id, 'e164', v_row.e164,
      'phone_number_id', v_row.phone_number_id, 'display_name', v_row.display_name);
  end if;

  -- 1º tentativo: numero locale (E.164 che inizia per +39<prefisso>)
  if v_prefix is not null then
    v_like := '+39' || v_prefix || '%';
    select * into v_row from public.wa_numbers
    where status = 'available' and e164 like v_like
    order by created_at
    for update skip locked
    limit 1;
  end if;

  -- 2º tentativo: qualsiasi numero libero
  if not found then
    select * into v_row from public.wa_numbers
    where status = 'available'
    order by created_at
    for update skip locked
    limit 1;
  end if;

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
    'local', v_prefix is not null and v_row.e164 like '+39' || v_prefix || '%',
    'id', v_row.id, 'e164', v_row.e164,
    'phone_number_id', v_row.phone_number_id, 'display_name', v_row.display_name);
end;
$$;

revoke all on function public.assign_wa_number_by_prefix(text) from public;
grant execute on function public.assign_wa_number_by_prefix(text) to authenticated;
