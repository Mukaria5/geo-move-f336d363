ALTER TABLE public.fleet_companies
  ADD COLUMN IF NOT EXISTS alternative_phone text,
  ADD COLUMN IF NOT EXISTS physical_address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'Kenya',
  ADD COLUMN IF NOT EXISTS postal_address text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS business_description text,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Africa/Nairobi',
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS date_format text NOT NULL DEFAULT 'dd/MM/yyyy',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS logo_path text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS invoice_footer text,
  ADD COLUMN IF NOT EXISTS bank_details text,
  ADD COLUMN IF NOT EXISTS mpesa_details text;

CREATE TABLE public.company_settings (
  company_user_id uuid PRIMARY KEY REFERENCES public.fleet_companies(user_id) ON DELETE CASCADE,
  operational_settings jsonb NOT NULL DEFAULT '{"order":{"number_format":"ORD-{YYYY}-{0000}","starting_number":1,"default_status":"pending","required_fields":["pickup_address","dropoff_address","cargo_name"],"pricing_method":"per_km","price_per_km":0,"loading_allowance":0,"unloading_allowance":0,"delivery_buffer_minutes":60},"fleet":{"number_format":"TRK-{0000}","maintenance_reminder_days":30,"fuel_recording_required":false},"drivers":{"number_format":"DRV-{0000}","licence_warning_days":30,"required_documents":["driving_license"],"availability_statuses":["available","assigned","driving","off_duty"]},"delivery":{"proof_required":true,"confirmation_required":true,"photo_required":false,"signature_required":false,"checklist":[]}}'::jsonb,
  finance_settings jsonb NOT NULL DEFAULT '{"currency":"KES","tax_enabled":false,"vat_percentage":0,"invoice_number_format":"INV-{YYYY}-{0000}","invoice_prefix":"INV","payment_terms_days":30,"default_due_days":30,"payment_methods":["cash","bank_transfer","mobile_money","cheque","other"],"expense_categories":["fuel","maintenance","driver_allowance","tolls","repairs","insurance","licences","other"],"revenue_categories":["transport","loading","offloading","fuel_surcharge","other"],"invoice_notes":"","invoice_footer":"","bank_details":"","mpesa_details":""}'::jsonb,
  notification_settings jsonb NOT NULL DEFAULT '{"in_app":{"new_order":true,"order_assigned":true,"order_delayed":true,"order_completed":true,"order_cancelled":true,"maintenance_due":true,"insurance_expiry":true,"inspection_expiry":true,"vehicle_unavailable":true,"licence_expiry":true,"driver_unavailable":true,"driver_suspended":true,"invoice_created":true,"payment_received":true,"invoice_overdue":true,"expense_submitted":true,"user_invitation":true,"user_changes":true,"security_alerts":true},"email":{}}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company admins manage their own settings" ON public.company_settings FOR ALL TO authenticated
  USING (company_user_id = auth.uid() AND public.has_role(auth.uid(), 'fleet'))
  WITH CHECK (company_user_id = auth.uid() AND public.has_role(auth.uid(), 'fleet'));
CREATE TRIGGER company_settings_touch BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_user_id uuid NOT NULL REFERENCES public.fleet_companies(user_id) ON DELETE CASCADE,
  user_id uuid,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  department text,
  role public.app_role NOT NULL,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','pending','active','suspended','deactivated')),
  invited_by uuid NOT NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_user_id, email),
  UNIQUE(company_user_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company admins view and manage own team" ON public.company_members FOR ALL TO authenticated
  USING (company_user_id = auth.uid() AND public.has_role(auth.uid(), 'fleet'))
  WITH CHECK (company_user_id = auth.uid() AND public.has_role(auth.uid(), 'fleet') AND role <> 'admin');
CREATE POLICY "Members can view their own membership" ON public.company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE TRIGGER company_members_touch BEFORE UPDATE ON public.company_members FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX company_members_company_status_idx ON public.company_members(company_user_id, status);

CREATE TABLE public.company_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_user_id uuid NOT NULL REFERENCES public.fleet_companies(user_id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL,
  module text NOT NULL,
  record_id text,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.company_audit_logs TO authenticated;
GRANT ALL ON public.company_audit_logs TO service_role;
ALTER TABLE public.company_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company admins read own audit events" ON public.company_audit_logs FOR SELECT TO authenticated
  USING (company_user_id = auth.uid() AND public.has_role(auth.uid(), 'fleet'));
CREATE POLICY "Company admins append own audit events" ON public.company_audit_logs FOR INSERT TO authenticated
  WITH CHECK (company_user_id = auth.uid() AND actor_id = auth.uid() AND public.has_role(auth.uid(), 'fleet'));
CREATE INDEX company_audit_logs_company_created_idx ON public.company_audit_logs(company_user_id, created_at DESC);
CREATE OR REPLACE FUNCTION public.prevent_company_audit_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Company audit events cannot be changed or removed';
END;
$$;
CREATE TRIGGER company_audit_logs_immutable BEFORE UPDATE OR DELETE ON public.company_audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_company_audit_mutation();
REVOKE EXECUTE ON FUNCTION public.prevent_company_audit_mutation() FROM PUBLIC, anon, authenticated;