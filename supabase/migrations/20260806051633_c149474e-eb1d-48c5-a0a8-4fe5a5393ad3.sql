create policy "finance media read own" on storage.objects for select to authenticated
using (bucket_id = 'finance-media' and (owner = auth.uid() or public.has_role(auth.uid(),'admin')));
create policy "finance media insert own" on storage.objects for insert to authenticated
with check (bucket_id = 'finance-media' and owner = auth.uid());
create policy "finance media update own" on storage.objects for update to authenticated
using (bucket_id = 'finance-media' and owner = auth.uid());
create policy "finance media delete own" on storage.objects for delete to authenticated
using (bucket_id = 'finance-media' and (owner = auth.uid() or public.has_role(auth.uid(),'admin')));