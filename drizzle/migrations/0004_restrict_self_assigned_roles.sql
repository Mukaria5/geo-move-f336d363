DROP POLICY IF EXISTS "Users can self-assign non-admin role once" ON public.user_roles;
CREATE POLICY "Users can self-assign approved public role once" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role IN ('client'::public.app_role, 'driver'::public.app_role, 'fleet'::public.app_role)
    AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
  );