-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · Voce (centralino AI inbound · OpenAI Realtime via SIP/DIDWW)
--
--   consume_meter_for   come consume_meter ma con utente ESPLICITO: serve al
--                       webhook delle chiamate (nessun JWT utente → auth.uid()
--                       è null). Eseguibile solo dal service_role.
--   match_kb_chunks_for variante service-role di match_kb_chunks con filtro
--                       esplicito sull'utente (il service_role bypassa la RLS,
--                       quindi il filtro è obbligatorio per non mischiare KB).
--   voice_calls         log delle chiamate (storico + base per il metering).
--
-- Esegui dopo la 0009.
-- ───────────────────────────────────────────────────────────────────────────

-- Consumo meter per un utente specifico (lato server, service_role).
create or replace function public.consume_meter_for(p_user uuid, p_meter text, p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_meters jsonb;
  v_total numeric;
  v_used numeric;
  v_new_used numeric;
  v_prev_remaining numeric;
  v_new_remaining numeric;
  v_alert boolean := false;
begin
  if p_user is null then return null; end if;

  select coalesce(meters, '{}'::jsonb) into v_meters
  from public.profiles where id = p_user for update;
  if v_meters is null then return null; end if;

  if not (v_meters ? p_meter) then
    return jsonb_build_object('meter', p_meter, 'total', 0, 'used', 0, 'remaining', 0,
      'exhausted', true, 'in_plan', false, 'alert', false);
  end if;

  v_total := coalesce((v_meters #>> array[p_meter, 'total'])::numeric, 0);
  v_used  := coalesce((v_meters #>> array[p_meter, 'used'])::numeric, 0);
  v_prev_remaining := greatest(v_total - v_used, 0);
  v_new_used       := least(v_total, v_used + greatest(coalesce(p_amount, 0), 0));
  v_new_remaining  := greatest(v_total - v_new_used, 0);

  v_meters := jsonb_set(v_meters, array[p_meter, 'used'], to_jsonb(v_new_used), true);
  update public.profiles set meters = v_meters where id = p_user;

  if v_total > 0 and v_new_remaining <= v_total * 0.10 and v_prev_remaining > v_total * 0.10 then
    v_alert := true;
  end if;

  return jsonb_build_object('meter', p_meter, 'total', v_total, 'used', v_new_used,
    'remaining', v_new_remaining, 'exhausted', v_new_remaining <= 0, 'in_plan', true, 'alert', v_alert);
end;
$$;

revoke all on function public.consume_meter_for(uuid, text, numeric) from public;
grant execute on function public.consume_meter_for(uuid, text, numeric) to service_role;

-- RAG per utente esplicito (service_role): stesso ranking di match_kb_chunks.
create or replace function public.match_kb_chunks_for(p_user uuid, query_embedding vector, match_count integer default 8)
returns table(id uuid, file_name text, content text, similarity double precision)
language sql
stable
set search_path to 'public', 'extensions'
as $$
  select c.id, c.file_name, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.kb_chunks c
  where c.user_id = p_user and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

revoke all on function public.match_kb_chunks_for(uuid, vector, integer) from public;
grant execute on function public.match_kb_chunks_for(uuid, vector, integer) to service_role;

-- Log chiamate (storico + metering).
create table if not exists public.voice_calls (
  call_id    text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  direction  text not null default 'inbound' check (direction in ('inbound','outbound')),
  from_e164  text,
  to_e164    text,
  status     text not null default 'answered',
  seconds    integer not null default 0,
  metered    integer not null default 0,
  created_at timestamptz not null default now(),
  ended_at   timestamptz
);

alter table public.voice_calls enable row level security;
drop policy if exists "voice_calls_select_own" on public.voice_calls;
create policy "voice_calls_select_own" on public.voice_calls
  for select to authenticated using (auth.uid() = user_id);

create index if not exists voice_calls_user_idx on public.voice_calls(user_id, created_at desc);
