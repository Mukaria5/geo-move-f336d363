DO $$ BEGIN
  CREATE TYPE public.driver_status AS ENUM ('available','assigned','driving','loading','offloading','rest_break','off_duty','on_leave','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_id text,
  full_name text NOT NULL,
  photo_url text,
  date_of_birth date,
  gender text,
  national_id_no text,
  passport_no text,
  phone text,
  email text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  blood_group text,
  licence_no text,
  licence_class text,
  licence_issue_date date,
  licence_expiry date,
  medical_expiry date,
  branch text,
  department text,
  hire_date date,
  employment_type text,
  employment_status text NOT NULL DEFAULT 'active',
  years_experience integer,
  assigned_truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  current_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  status public.driver_status NOT NULL DEFAULT 'available',
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  status_note text,
  rating numeric NOT NULL DEFAULT 5,
  total_trips integer NOT NULL DEFAULT 0,
  on_time_trips integer NOT NULL DEFAULT 0,
  distance_km numeric NOT NULL DEFAULT 0,
  hours_driven numeric NOT NULL DEFAULT 0,
  current_lat double precision,
  current_lng double precision,
  location_updated_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their drivers" ON public.drivers
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Drivers read their own record" ON public.drivers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.driver_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  uploaded_by uuid,
  kind text NOT NULL,
  label text,
  file_path text NOT NULL,
  expires_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_documents TO authenticated;
GRANT ALL ON public.driver_documents TO service_role;
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage driver documents" ON public.driver_documents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND (d.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND (d.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE POLICY "Drivers read their own documents" ON public.driver_documents
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.driver_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  actor_id uuid,
  status public.driver_status NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.driver_status_events TO authenticated;
GRANT ALL ON public.driver_status_events TO service_role;
ALTER TABLE public.driver_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read driver activity" ON public.driver_status_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND (d.owner_id = auth.uid() OR d.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE POLICY "Owners write driver activity" ON public.driver_status_events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND (d.owner_id = auth.uid() OR d.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TRIGGER drivers_touch BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.log_driver_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
    INSERT INTO public.driver_status_events(driver_id, actor_id, status, note)
    VALUES (NEW.id, auth.uid(), NEW.status, NEW.status_note);
  END IF;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.log_driver_status_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_driver_status_log BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.log_driver_status_change();

CREATE INDEX IF NOT EXISTS drivers_owner_idx ON public.drivers(owner_id);
CREATE INDEX IF NOT EXISTS driver_documents_driver_idx ON public.driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS driver_status_events_driver_idx ON public.driver_status_events(driver_id, created_at DESC);