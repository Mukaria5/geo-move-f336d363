ALTER TABLE public.company_members ADD COLUMN IF NOT EXISTS responsibilities jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS company_members_email_lower_unique ON public.company_members(company_user_id, lower(email));

CREATE OR REPLACE FUNCTION public.company_owner_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(_user_id, 'fleet') AND EXISTS (
      SELECT 1 FROM public.fleet_companies fc WHERE fc.user_id = _user_id
    ) THEN _user_id
    ELSE (
      SELECT cm.company_user_id
      FROM public.company_members cm
      WHERE cm.user_id = _user_id
        AND cm.status = 'active'
      ORDER BY cm.invited_at DESC
      LIMIT 1
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.activate_company_member_on_email_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.company_members
     SET status = 'active', joined_at = coalesce(joined_at, now()), updated_at = now()
   WHERE user_id = NEW.id AND status = 'invited';
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.activate_company_member_on_email_confirm() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER activate_company_member_after_email_confirmation
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.activate_company_member_on_email_confirm();

DROP POLICY IF EXISTS "Dispatchers read all orders" ON public.orders;
DROP POLICY IF EXISTS "Dispatcher updates orders" ON public.orders;
DROP POLICY IF EXISTS "Create orders" ON public.orders;
CREATE POLICY "Company dispatchers read own orders" ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'dispatcher') AND fleet_owner_user_id = public.company_owner_id(auth.uid()));
CREATE POLICY "Company dispatchers update own orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'dispatcher') AND fleet_owner_user_id = public.company_owner_id(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'dispatcher') AND fleet_owner_user_id = public.company_owner_id(auth.uid()));
CREATE POLICY "Create orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND (
      public.has_role(auth.uid(), 'admin') OR
      (public.has_role(auth.uid(), 'dispatcher') AND fleet_owner_user_id = public.company_owner_id(auth.uid())) OR
      (public.has_role(auth.uid(), 'manager') AND fleet_owner_user_id = public.company_owner_id(auth.uid())) OR
      public.has_role(auth.uid(), 'fleet') OR
      public.has_role(auth.uid(), 'client')
    )
  );