
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'pending','confirmed','assigned','en_route_pickup','arrived_pickup',
    'loading','in_transit','delayed','arrived_dropoff','delivered','completed','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT ('ORD-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  created_by uuid NOT NULL,
  fleet_owner_user_id uuid REFERENCES public.fleet_companies(user_id) ON DELETE SET NULL,
  client_id uuid,
  client_name text NOT NULL,
  client_phone text,
  client_email text,
  pickup_address text NOT NULL,
  pickup_lat double precision,
  pickup_lng double precision,
  pickup_contact_name text,
  pickup_contact_phone text,
  pickup_notes text,
  pickup_at timestamptz,
  dropoff_address text NOT NULL,
  dropoff_lat double precision,
  dropoff_lng double precision,
  dropoff_contact_name text,
  dropoff_contact_phone text,
  dropoff_notes text,
  dropoff_at timestamptz,
  cargo_name text,
  cargo_category text,
  cargo_weight_tons numeric,
  cargo_dimensions text,
  cargo_quantity integer DEFAULT 1,
  special_instructions text,
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  driver_id uuid,
  distance_km numeric,
  eta_minutes integer,
  price_per_km numeric DEFAULT 0,
  base_charge numeric DEFAULT 0,
  fuel_surcharge numeric DEFAULT 0,
  toll_charges numeric DEFAULT 0,
  loading_fee numeric DEFAULT 0,
  offloading_fee numeric DEFAULT 0,
  extra_charges numeric DEFAULT 0,
  estimated_total numeric DEFAULT 0,
  final_total numeric,
  status public.order_status NOT NULL DEFAULT 'pending',
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_orders_fleet ON public.orders(fleet_owner_user_id);
CREATE INDEX idx_orders_client ON public.orders(client_id);
CREATE INDEX idx_orders_driver ON public.orders(driver_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

CREATE POLICY "Admins read all orders" ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Dispatchers read all orders" ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'dispatcher'));
CREATE POLICY "Fleet reads own orders" ON public.orders FOR SELECT TO authenticated
  USING (fleet_owner_user_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Client reads own orders" ON public.orders FOR SELECT TO authenticated
  USING (client_id = auth.uid());
CREATE POLICY "Driver reads assigned orders" ON public.orders FOR SELECT TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Create orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND (
      public.has_role(auth.uid(),'admin') OR
      public.has_role(auth.uid(),'dispatcher') OR
      public.has_role(auth.uid(),'fleet') OR
      public.has_role(auth.uid(),'client')
    )
  );

CREATE POLICY "Admins update all orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Fleet updates own orders" ON public.orders FOR UPDATE TO authenticated
  USING (fleet_owner_user_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (fleet_owner_user_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Dispatcher updates orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'dispatcher'));
CREATE POLICY "Driver updates own status" ON public.orders FOR UPDATE TO authenticated
  USING (driver_id = auth.uid()) WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_id uuid,
  status public.order_status NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_order_events_order ON public.order_events(order_id, created_at DESC);

CREATE POLICY "Read events for visible orders" ON public.order_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id));
CREATE POLICY "Insert events for visible orders" ON public.order_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id));

CREATE TABLE public.order_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  uploaded_by uuid,
  kind text NOT NULL,
  file_path text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.order_documents TO authenticated;
GRANT ALL ON public.order_documents TO service_role;
ALTER TABLE public.order_documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_order_docs_order ON public.order_documents(order_id);

CREATE POLICY "Read docs for visible orders" ON public.order_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id));
CREATE POLICY "Insert docs for visible orders" ON public.order_documents FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id));
CREATE POLICY "Delete own docs" ON public.order_documents FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.order_events(order_id, actor_id, status, note)
    VALUES (NEW.id, auth.uid(), NEW.status, NULL);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_order_status_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_orders_status_event
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_events;
