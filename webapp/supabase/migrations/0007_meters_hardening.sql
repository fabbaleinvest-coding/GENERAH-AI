-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · Hardening della colonna profiles.meters
-- Obiettivo: la colonna `meters` diventa modificabile SOLO dalle funzioni
-- server SECURITY DEFINER (consume_meter / provision_plan_meters / topup_meter),
-- che girano come `postgres`. I ruoli client di PostgREST (`authenticated`,
-- `anon`) NON possono più alterare `meters` tramite l'upsert del profilo: non
-- possono azzerare `used` né gonfiare `total`.
--
-- Meccanismo: un trigger BEFORE INSERT/UPDATE che, quando il ruolo corrente è
-- un ruolo client, ripristina `meters` (UPDATE) o lo forza azzerato (INSERT).
-- Dentro le funzioni SECURITY DEFINER `current_user = postgres`, quindi i loro
-- update passano indenni.
--
-- Esegui nel SQL editor di Supabase (una tantum), dopo la 0006.
-- ───────────────────────────────────────────────────────────────────────────

-- 1) Default canonico azzerato (per le nuove righe che omettono meters).
alter table public.profiles
  alter column meters set default
  '{"phone":{"total":0,"used":0},"video":{"total":0,"used":0},"whatsapp":{"total":0,"used":0},"ads":{"total":0,"used":0}}'::jsonb;

-- 2) Provisioning dei meter all'attivazione di un piano (alloca i totali, used=0).
--    Il feature plan può essere il piano stesso o UN tier superiore (codici di
--    upgrade); altrimenti si torna al piano base. Totali identici a lib/plans.ts.
create or replace function public.provision_plan_meters(p_plan_id text, p_feature_plan_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_order text[] := array['starter','growth','premium','enterprise'];
  v_plan_idx int;
  v_feat text;
  v_feat_idx int;
  v_meters jsonb;
begin
  if v_uid is null then return null; end if;

  v_plan_idx := array_position(v_order, p_plan_id);
  if v_plan_idx is null then return null; end if; -- piano non valido

  v_feat := coalesce(nullif(p_feature_plan_id, ''), p_plan_id);
  v_feat_idx := array_position(v_order, v_feat);
  -- ammesso solo il piano stesso o un tier immediatamente superiore
  if v_feat_idx is null or v_feat_idx < v_plan_idx or v_feat_idx > v_plan_idx + 1 then
    v_feat := p_plan_id;
  end if;

  v_meters := case v_feat
    when 'starter'    then '{"phone":{"total":700,"used":0},"video":{"total":0,"used":0},"whatsapp":{"total":500,"used":0},"ads":{"total":1,"used":0}}'::jsonb
    when 'growth'     then '{"phone":{"total":2000,"used":0},"video":{"total":150,"used":0},"whatsapp":{"total":1250,"used":0},"ads":{"total":3,"used":0}}'::jsonb
    when 'premium'    then '{"phone":{"total":4500,"used":0},"video":{"total":500,"used":0},"whatsapp":{"total":3000,"used":0},"ads":{"total":6,"used":0}}'::jsonb
    when 'enterprise' then '{"phone":{"total":8000,"used":0},"video":{"total":1000,"used":0},"whatsapp":{"total":7500,"used":0},"ads":{"total":12,"used":0}}'::jsonb
    else '{"phone":{"total":0,"used":0},"video":{"total":0,"used":0},"whatsapp":{"total":0,"used":0},"ads":{"total":0,"used":0}}'::jsonb
  end;

  update public.profiles set meters = v_meters where id = v_uid;
  return v_meters;
end;
$$;

revoke all on function public.provision_plan_meters(text, text) from public;
grant execute on function public.provision_plan_meters(text, text) to authenticated;

-- 3) Top-up: aumenta `total` di un meter (used invariato). Qty > 0.
create or replace function public.topup_meter(p_meter text, p_qty numeric)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_meters jsonb;
  v_total numeric;
begin
  if v_uid is null then return null; end if;
  if p_meter not in ('phone','video','whatsapp','ads') then return null; end if;
  if coalesce(p_qty, 0) <= 0 then return null; end if;

  select coalesce(meters, '{}'::jsonb) into v_meters
  from public.profiles where id = v_uid for update;
  if v_meters is null then return null; end if;

  if not (v_meters ? p_meter) then
    v_meters := jsonb_set(v_meters, array[p_meter], jsonb_build_object('total', p_qty, 'used', 0), true);
  else
    v_total := coalesce((v_meters #>> array[p_meter,'total'])::numeric, 0) + p_qty;
    v_meters := jsonb_set(v_meters, array[p_meter,'total'], to_jsonb(v_total), true);
  end if;

  update public.profiles set meters = v_meters where id = v_uid;
  return v_meters;
end;
$$;

revoke all on function public.topup_meter(text, numeric) from public;
grant execute on function public.topup_meter(text, numeric) to authenticated;

-- 4) Trigger di protezione: i ruoli client non possono toccare `meters`.
create or replace function public.protect_meters()
returns trigger
language plpgsql
as $$
begin
  -- Le funzioni SECURITY DEFINER girano come `postgres`: non entrano qui.
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'UPDATE' then
      new.meters := old.meters; -- immutabile dal client
    elsif tg_op = 'INSERT' then
      new.meters := '{"phone":{"total":0,"used":0},"video":{"total":0,"used":0},"whatsapp":{"total":0,"used":0},"ads":{"total":0,"used":0}}'::jsonb;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_meters on public.profiles;
create trigger trg_protect_meters
  before insert or update on public.profiles
  for each row execute function public.protect_meters();
