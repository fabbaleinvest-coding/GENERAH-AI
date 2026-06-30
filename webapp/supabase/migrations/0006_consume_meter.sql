-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · Metering lato server: funzione atomica di consumo
-- Il registro dei consumi diventa autorevole nel database. `consume_meter`
-- legge i meters dell'utente autenticato (lock di riga), incrementa `used` del
-- meter indicato (cap a `total`, mai negativo), e rileva l'attraversamento della
-- soglia del 10% residuo. È atomica: chiamate concorrenti non si sovrascrivono.
--
-- Forma della colonna profiles.meters (jsonb):
--   { "phone": {"total": N, "used": M}, "video": {...}, "whatsapp": {...}, "ads": {...} }
--
-- Esegui nel SQL editor di Supabase (una tantum).
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.consume_meter(p_meter text, p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_meters jsonb;
  v_total numeric;
  v_used numeric;
  v_new_used numeric;
  v_prev_remaining numeric;
  v_new_remaining numeric;
  v_alert boolean := false;
begin
  if v_uid is null then
    return null; -- nessuna sessione utente
  end if;

  -- Lock di riga: serializza i consumi concorrenti dello stesso utente.
  select coalesce(meters, '{}'::jsonb) into v_meters
  from public.profiles
  where id = v_uid
  for update;

  if v_meters is null then
    return null; -- profilo inesistente
  end if;

  -- Meter non incluso nel piano: nessuna scrittura.
  if not (v_meters ? p_meter) then
    return jsonb_build_object(
      'meter', p_meter, 'total', 0, 'used', 0, 'remaining', 0,
      'exhausted', true, 'in_plan', false, 'alert', false
    );
  end if;

  v_total := coalesce((v_meters #>> array[p_meter, 'total'])::numeric, 0);
  v_used  := coalesce((v_meters #>> array[p_meter, 'used'])::numeric, 0);

  v_prev_remaining := greatest(v_total - v_used, 0);
  v_new_used       := least(v_total, v_used + greatest(coalesce(p_amount, 0), 0));
  v_new_remaining  := greatest(v_total - v_new_used, 0);

  v_meters := jsonb_set(v_meters, array[p_meter, 'used'], to_jsonb(v_new_used), true);
  update public.profiles set meters = v_meters where id = v_uid;

  -- Soglia 10%: scatta solo nell'attraversamento (prima sopra, ora sotto/uguale).
  if v_total > 0
     and v_new_remaining <= v_total * 0.10
     and v_prev_remaining > v_total * 0.10 then
    v_alert := true;
  end if;

  return jsonb_build_object(
    'meter', p_meter,
    'total', v_total,
    'used', v_new_used,
    'remaining', v_new_remaining,
    'exhausted', v_new_remaining <= 0,
    'in_plan', true,
    'alert', v_alert
  );
end;
$$;

-- Eseguibile solo dagli utenti autenticati (agisce sull'utente del JWT).
revoke all on function public.consume_meter(text, numeric) from public;
grant execute on function public.consume_meter(text, numeric) to authenticated;
