CREATE POLICY "Driver media upload own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'driver-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Driver media read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'driver-media' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "Driver media update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'driver-media' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'driver-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Driver media delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'driver-media' AND (storage.foldername(name))[1] = auth.uid()::text);