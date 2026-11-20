DROP POLICY IF EXISTS "Company admins view and manage own team" ON public.company_members;
DROP POLICY IF EXISTS "Members can view their own membership" ON public.company_members;
REVOKE UPDATE, DELETE ON public.company_members FROM authenticated;
GRANT SELECT, INSERT ON public.company_members TO authenticated;
CREATE POLICY "Company admins view own team" ON public.company_members FOR SELECT TO authenticated
  USING (company_user_id = auth.uid() AND public.has_role(auth.uid(), 'fleet'));
CREATE POLICY "Company admins create unassigned invitations" ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (
    company_user_id = auth.uid()
    AND invited_by = auth.uid()
    AND user_id IS NULL
    AND status = 'invited'
    AND role IN ('manager'::public.app_role, 'dispatcher'::public.app_role, 'driver'::public.app_role)
    AND public.has_role(auth.uid(), 'fleet')
  );

REVOKE INSERT ON public.company_audit_logs FROM authenticated;
GRANT SELECT ON public.company_audit_logs TO authenticated;
DROP POLICY IF EXISTS "Company admins append own audit events" ON public.company_audit_logs;

CREATE OR REPLACE FUNCTION public.audit_company_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_id uuid;
  actor uuid;
  event_name text;
  module_name text;
  target_id text;
  message text;
  extra jsonb := '{}'::jsonb;
  record_new jsonb;
  record_old jsonb;
BEGIN
  record_new := CASE WHEN TG_OP = 'DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END;
  record_old := CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
  actor := auth.uid();
  target_id := coalesce(record_new->>'id', record_old->>'id');

  IF TG_TABLE_NAME = 'fleet_companies' THEN
    company_id := coalesce((record_new->>'user_id')::uuid, (record_old->>'user_id')::uuid);
    module_name := 'company';
    event_name := CASE WHEN TG_OP = 'INSERT' THEN 'company.created' ELSE 'company.profile_updated' END;
    message := CASE WHEN TG_OP = 'INSERT' THEN 'Company profile created' ELSE 'Company profile updated' END;
  ELSIF TG_TABLE_NAME = 'company_settings' THEN
    company_id := (record_new->>'company_user_id')::uuid;
    module_name := 'settings';
    event_name := CASE WHEN TG_OP = 'INSERT' THEN 'settings.created' ELSE 'settings.updated' END;
    message := CASE WHEN TG_OP = 'INSERT' THEN 'Company settings created' ELSE 'Company settings updated' END;
  ELSIF TG_TABLE_NAME = 'company_members' THEN
    company_id := (record_new->>'company_user_id')::uuid;
    actor := coalesce(actor, nullif(record_new->>'invited_by', '')::uuid);
    module_name := 'team';
    IF TG_OP = 'INSERT' THEN
      event_name := 'user.invited';
      message := 'Team invitation created';
      extra := jsonb_build_object('role', record_new->>'role', 'status', record_new->>'status');
    ELSE
      event_name := 'user.activated';
      message := 'Team invitation accepted after email verification';
      extra := jsonb_build_object('role', record_new->>'role', 'status', record_new->>'status');
    END IF;
  ELSIF TG_TABLE_NAME = 'orders' THEN
    company_id := nullif(record_new->>'fleet_owner_user_id', '')::uuid;
    module_name := 'orders';
    IF TG_OP = 'INSERT' THEN
      event_name := 'order.created'; message := 'Order created';
    ELSE
      event_name := 'order.status_changed'; message := 'Order status changed';
      extra := jsonb_build_object('from', record_old->>'status', 'to', record_new->>'status');
    END IF;
  ELSIF TG_TABLE_NAME IN ('trucks', 'drivers', 'clients', 'invoices', 'payments', 'expenses') THEN
    company_id := nullif(record_new->>'owner_id', '')::uuid;
    module_name := CASE WHEN TG_TABLE_NAME = 'trucks' THEN 'fleet' WHEN TG_TABLE_NAME = 'drivers' THEN 'drivers' WHEN TG_TABLE_NAME = 'clients' THEN 'clients' ELSE 'finance' END;
    event_name := CASE TG_TABLE_NAME WHEN 'trucks' THEN 'vehicle.added' WHEN 'drivers' THEN 'driver.added' WHEN 'clients' THEN 'client.created' WHEN 'invoices' THEN 'invoice.created' WHEN 'payments' THEN 'payment.recorded' ELSE 'expense.created' END;
    message := CASE TG_TABLE_NAME WHEN 'trucks' THEN 'Vehicle added' WHEN 'drivers' THEN 'Driver added' WHEN 'clients' THEN 'Client added' WHEN 'invoices' THEN 'Invoice created' WHEN 'payments' THEN 'Payment recorded' ELSE 'Expense recorded' END;
  ELSE
    RETURN coalesce(NEW, OLD);
  END IF;

  IF company_id IS NOT NULL THEN
    INSERT INTO public.company_audit_logs(company_user_id, actor_id, event_type, module, record_id, description, metadata)
    VALUES (company_id, actor, event_name, module_name, target_id, message, extra);
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.audit_company_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER audit_company_profile AFTER INSERT OR UPDATE OF company_name, registration_no, kra_pin, contact_email, contact_phone, alternative_phone, physical_address, city, county, country, postal_address, website, business_description, timezone, preferred_language, date_format, currency, logo_path, display_name, invoice_footer, bank_details, mpesa_details ON public.fleet_companies FOR EACH ROW EXECUTE FUNCTION public.audit_company_change();
CREATE TRIGGER audit_company_settings AFTER INSERT OR UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.audit_company_change();
CREATE TRIGGER audit_company_members AFTER INSERT OR UPDATE OF status ON public.company_members FOR EACH ROW EXECUTE FUNCTION public.audit_company_change();
CREATE TRIGGER audit_company_orders AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.audit_company_change();
CREATE TRIGGER audit_company_trucks AFTER INSERT ON public.trucks FOR EACH ROW EXECUTE FUNCTION public.audit_company_change();
CREATE TRIGGER audit_company_drivers AFTER INSERT ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.audit_company_change();
CREATE TRIGGER audit_company_clients AFTER INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.audit_company_change();
CREATE TRIGGER audit_company_invoices AFTER INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.audit_company_change();
CREATE TRIGGER audit_company_payments AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.audit_company_change();
CREATE TRIGGER audit_company_expenses AFTER INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.audit_company_change();

CREATE OR REPLACE FUNCTION public.accept_company_invitation_on_verified_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invited_role public.app_role;
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN RETURN NEW; END IF;
  SELECT role INTO invited_role
    FROM public.company_members
   WHERE lower(email) = lower(NEW.email)
     AND invitation_token::text = NEW.raw_user_meta_data->>'company_invite_token'
     AND status = 'invited'
     AND user_id IS NULL
   LIMIT 1;
  IF invited_role IS NULL OR invited_role NOT IN ('manager'::public.app_role, 'dispatcher'::public.app_role, 'driver'::public.app_role) THEN
    RETURN NEW;
  END IF;
  UPDATE public.company_members
     SET user_id = NEW.id, status = 'active', joined_at = now(), full_name = coalesce(nullif(NEW.raw_user_meta_data->>'full_name', ''), full_name), updated_at = now()
   WHERE lower(email) = lower(NEW.email)
     AND invitation_token::text = NEW.raw_user_meta_data->>'company_invite_token'
     AND status = 'invited'
     AND user_id IS NULL;
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, invited_role) ON CONFLICT (user_id, role) DO NOTHING;
  UPDATE public.profiles SET full_name = coalesce(nullif(NEW.raw_user_meta_data->>'full_name', ''), full_name), phone = coalesce(nullif(NEW.raw_user_meta_data->>'phone', ''), phone), onboarded = true WHERE id = NEW.id;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.accept_company_invitation_on_verified_email() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER accept_company_invite_after_user_insert AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.accept_company_invitation_on_verified_email();
CREATE TRIGGER accept_company_invite_after_email_verification AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) EXECUTE FUNCTION public.accept_company_invitation_on_verified_email();