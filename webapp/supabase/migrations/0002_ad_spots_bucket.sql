-- ───────────────────────────────────────────────────────────────────────────
-- GENERAH AI · Bucket pubblico per gli spot montati
-- Lo spot finale (scene + voce + sottotitoli) è assemblato nel browser e
-- caricato qui: Meta ha bisogno di un URL pubblico scaricabile (file_url) da
-- usare come creatività della campagna. Nessun dato sensibile (sono annunci).
-- Esegui questo file nel SQL editor di Supabase (una tantum).
-- ───────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('ad-spots', 'ad-spots', true)
on conflict (id) do update set public = true;

-- Upload consentito agli utenti autenticati, solo nella propria cartella (<uid>/…).
drop policy if exists "ad_spots_insert_own" on storage.objects;
create policy "ad_spots_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ad-spots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "ad_spots_update_own" on storage.objects;
create policy "ad_spots_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'ad-spots'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'ad-spots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- La lettura pubblica è servita dall'URL del bucket pubblico: nessuna policy
-- di select necessaria.
