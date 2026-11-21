ALTER TABLE public.company_members
  ADD COLUMN IF NOT EXISTS invitation_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days';
CREATE UNIQUE INDEX IF NOT EXISTS company_members_invitation_token_unique ON public.company_members(invitation_token);

CREATE OR REPLACE FUNCTION public.company_invite_details(_token uuid)
RETURNS TABLE (email text, full_name text, role public.app_role, company_name text, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.email, cm.full_name, cm.role, fc.company_name, cm.expires_at
  FROM public.company_members cm
  JOIN public.fleet_companies fc ON fc.user_id = cm.company_user_id
  WHERE cm.invitation_token = _token
    AND cm.status = 'invited'
    AND cm.user_id IS NULL
    AND cm.expires_at > now()
    AND cm.role IN ('manager'::public.app_role, 'dispatcher'::public.app_role, 'driver'::public.app_role)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.company_invite_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_invite_details(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_company_invitation(
  _email text,
  _full_name text,
  _phone text DEFAULT NULL,
  _department text DEFAULT NULL,
  _role public.app_role DEFAULT 'manager',
  _responsibilities jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (id uuid, invitation_token uuid, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  new_token uuid;
  expiry timestamptz := now() + interval '7 days';
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'fleet') OR NOT EXISTS (
    SELECT 1 FROM public.fleet_companies fc WHERE fc.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the company owner can invite staff';
  END IF;
  IF _role NOT IN ('manager'::public.app_role, 'dispatcher'::public.app_role, 'driver'::public.app_role) THEN
    RAISE EXCEPTION 'This role cannot be assigned through a company invitation';
  END IF;
  IF length(trim(_full_name)) < 2 OR length(trim(_email)) < 5 OR position('@' in _email) < 2 THEN
    RAISE EXCEPTION 'Enter a valid name and email';
  END IF;
  INSERT INTO public.company_members(company_user_id, email, full_name, phone, department, role, status, invited_by, responsibilities, expires_at)
  VALUES (auth.uid(), lower(trim(_email)), trim(_full_name), nullif(trim(coalesce(_phone,'')),''), nullif(trim(coalesce(_department,'')),''), _role, 'invited', auth.uid(), coalesce(_responsibilities,'[]'::jsonb), expiry)
  ON CONFLICT (company_user_id, email) DO UPDATE
    SET user_id = NULL, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone,
        department = EXCLUDED.department, role = EXCLUDED.role, status = 'invited',
        invited_by = auth.uid(), invited_at = now(), joined_at = NULL,
        responsibilities = EXCLUDED.responsibilities, invitation_token = gen_random_uuid(), expires_at = expiry;
  SELECT cm.id, cm.invitation_token INTO new_id, new_token
    FROM public.company_members cm WHERE cm.company_user_id = auth.uid() AND lower(cm.email) = lower(trim(_email));
  RETURN QUERY SELECT new_id, new_token, expiry;
END;
$$;
REVOKE ALL ON FUNCTION public.create_company_invitation(text,text,text,text,public.app_role,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_company_invitation(text,text,text,text,public.app_role,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.manage_company_member(
  _member_id uuid,
  _action text,
  _status text DEFAULT NULL,
  _role public.app_role DEFAULT NULL,
  _department text DEFAULT NULL,
  _responsibilities jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_row public.company_members%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'fleet') OR NOT EXISTS (
    SELECT 1 FROM public.fleet_companies fc WHERE fc.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the company owner can manage staff';
  END IF;
  SELECT * INTO member_row FROM public.company_members WHERE id = _member_id AND company_user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Team member not found'; END IF;
  IF _action NOT IN ('update','status','resend') THEN RAISE EXCEPTION 'Unsupported team action'; END IF;
  IF _role IS NOT NULL AND _role NOT IN ('manager'::public.app_role, 'dispatcher'::public.app_role, 'driver'::public.app_role) THEN
    RAISE EXCEPTION 'This role cannot be assigned to company staff';
  END IF;
  IF _action = 'resend' THEN
    IF member_row.status = 'active' THEN RAISE EXCEPTION 'Active members do not have pending invitations'; END IF;
    UPDATE public.company_members SET user_id = NULL, status = 'invited', invited_by = auth.uid(), invited_at = now(), joined_at = NULL,
      invitation_token = gen_random_uuid(), expires_at = now() + interval '7 days' WHERE id = _member_id;
  ELSIF _action = 'status' THEN
    IF _status NOT IN ('active','suspended','deactivated') THEN RAISE EXCEPTION 'Unsupported team status'; END IF;
    IF _status = 'active' AND member_row.user_id IS NULL THEN RAISE EXCEPTION 'A person must accept their verified invitation before activation'; END IF;
    UPDATE public.company_members SET status = _status WHERE id = _member_id;
    IF member_row.user_id IS NOT NULL THEN
      IF _status = 'active' THEN
        INSERT INTO public.user_roles(user_id, role) VALUES (member_row.user_id, member_row.role) ON CONFLICT (user_id, role) DO NOTHING;
      ELSE
        DELETE FROM public.user_roles WHERE user_id = member_row.user_id AND role = member_row.role;
      END IF;
    END IF;
  ELSE
    UPDATE public.company_members SET role = coalesce(_role, role), department = coalesce(_department, department), responsibilities = coalesce(_responsibilities, responsibilities) WHERE id = _member_id;
    IF member_row.user_id IS NOT NULL AND _role IS NOT NULL THEN
      DELETE FROM public.user_roles WHERE user_id = member_row.user_id AND role IN ('manager'::public.app_role, 'dispatcher'::public.app_role, 'driver'::public.app_role);
      INSERT INTO public.user_roles(user_id, role) VALUES (member_row.user_id, _role) ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.manage_company_member(uuid,text,text,public.app_role,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_company_member(uuid,text,text,public.app_role,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_company_invitation(_token uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE invite public.company_members%ROWTYPE;
DECLARE verified_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to accept this invitation'; END IF;
  SELECT u.email INTO verified_email FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL;
  IF verified_email IS NULL THEN RAISE EXCEPTION 'Verify your email before accepting this invitation'; END IF;
  SELECT * INTO invite FROM public.company_members cm WHERE cm.invitation_token = _token AND cm.status = 'invited' AND cm.user_id IS NULL AND cm.expires_at > now() AND lower(cm.email) = lower(verified_email) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This invitation is expired, already used, or belongs to another email'; END IF;
  IF EXISTS (SELECT 1 FROM public.company_members cm WHERE cm.user_id = auth.uid() AND cm.status = 'active' AND cm.company_user_id <> invite.company_user_id) THEN
    RAISE EXCEPTION 'This account is already connected to another company';
  END IF;
  UPDATE public.company_members SET user_id = auth.uid(), status = 'active', joined_at = now(), updated_at = now() WHERE id = invite.id;
  DELETE FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('manager'::public.app_role, 'dispatcher'::public.app_role, 'driver'::public.app_role);
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(), invite.role) ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.profiles(id, full_name, phone, onboarded) VALUES (auth.uid(), invite.full_name, coalesce(invite.phone,''), invite.role <> 'driver'::public.app_role)
  ON CONFLICT (id) DO UPDATE SET full_name = excluded.full_name, phone = coalesce(nullif(excluded.phone,''), public.profiles.phone), onboarded = excluded.onboarded;
  RETURN invite.role::text;
END;
$$;
REVOKE ALL ON FUNCTION public.accept_company_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_company_invitation(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_company_invitation_on_verified_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE invite public.company_members%ROWTYPE;
BEGIN
  IF NEW.email_confirmed_at IS NULL OR NEW.email IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO invite FROM public.company_members cm
    WHERE lower(cm.email) = lower(NEW.email)
      AND cm.invitation_token::text = NEW.raw_user_meta_data->>'company_invite_token'
      AND cm.status = 'invited' AND cm.user_id IS NULL AND cm.expires_at > now()
    LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR invite.role NOT IN ('manager'::public.app_role, 'dispatcher'::public.app_role, 'driver'::public.app_role) THEN RETURN NEW; END IF;
  UPDATE public.company_members SET user_id = NEW.id, status = 'active', joined_at = now(), full_name = coalesce(nullif(NEW.raw_user_meta_data->>'full_name',''), full_name), updated_at = now() WHERE id = invite.id;
  DELETE FROM public.user_roles WHERE user_id = NEW.id AND role IN ('manager'::public.app_role, 'dispatcher'::public.app_role, 'driver'::public.app_role);
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, invite.role) ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.profiles(id, full_name, phone, onboarded) VALUES (NEW.id, coalesce(nullif(NEW.raw_user_meta_data->>'full_name',''), invite.full_name), coalesce(nullif(NEW.raw_user_meta_data->>'phone',''), invite.phone, ''), invite.role <> 'driver'::public.app_role)
  ON CONFLICT (id) DO UPDATE SET full_name = excluded.full_name, phone = coalesce(nullif(excluded.phone,''), public.profiles.phone), onboarded = excluded.onboarded;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.accept_company_invitation_on_verified_email() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS activate_company_member_after_email_confirmation ON auth.users;
DROP TRIGGER IF EXISTS accept_company_invite_after_user_insert ON auth.users;
DROP TRIGGER IF EXISTS accept_company_invite_after_email_verification ON auth.users;
CREATE TRIGGER accept_company_invite_after_user_insert AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.accept_company_invitation_on_verified_email();
CREATE TRIGGER accept_company_invite_after_email_verification AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) EXECUTE FUNCTION public.accept_company_invitation_on_verified_email();