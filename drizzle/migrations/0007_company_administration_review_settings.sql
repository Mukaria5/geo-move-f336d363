ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS administration_settings jsonb NOT NULL DEFAULT '{"roles_reviewed":false,"integrations_reviewed":false}'::jsonb;
CREATE POLICY "Company staff read their employer profile" ON public.fleet_companies FOR SELECT TO authenticated
  USING (
    user_id = public.company_owner_id(auth.uid())
    AND public.has_role(auth.uid(), 'manager')
  );
CREATE POLICY "Company dispatchers read their employer profile" ON public.fleet_companies FOR SELECT TO authenticated
  USING (
    user_id = public.company_owner_id(auth.uid())
    AND public.has_role(auth.uid(), 'dispatcher')
  );
CREATE POLICY "Company drivers read their employer profile" ON public.fleet_companies FOR SELECT TO authenticated
  USING (
    user_id = public.company_owner_id(auth.uid())
    AND public.has_role(auth.uid(), 'driver')
  );