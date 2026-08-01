create policy "vehicle media insert own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vehicle-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "vehicle media read" on storage.objects
  for select to authenticated
  using (bucket_id = 'vehicle-media' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));

create policy "vehicle media update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'vehicle-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "vehicle media delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'vehicle-media' and (storage.foldername(name))[1] = auth.uid()::text);