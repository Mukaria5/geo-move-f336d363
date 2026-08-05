
-- ENUMS
DO $$ BEGIN CREATE TYPE public.client_status AS ENUM ('active','preferred','inactive','suspended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.client_type AS ENUM ('business','individual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CLIENTS
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  client_code text,
  name text NOT NULL,
  client_type public.client_type NOT NULL DEFAULT 'business',
  industry text,
  website text,
  logo_url text,
  contact_name text,
  contact_phone text,
  contact_email text,
  address text,
  city text,
  country text DEFAULT 'Kenya',
  tax_number text,
  payment_terms text DEFAULT 'due_on_receipt',
  payment_method text,
  currency text NOT NULL DEFAULT 'KES',
  credit_limit numeric DEFAULT 0,
  outstanding_balance numeric NOT NULL DEFAULT 0,
  status public.client_status NOT NULL DEFAULT 'active',
  customer_since date NOT NULL DEFAULT current_date,
  last_order_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_owner_all" ON public.clients FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER clients_touch BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_clients_owner ON public.clients(owner_id);

-- CONTACTS
CREATE TABLE public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  position text,
  phone text,
  email text,
  preferred_method text DEFAULT 'phone',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_contacts TO authenticated;
GRANT ALL ON public.client_contacts TO service_role;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_contacts_owner_all" ON public.client_contacts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE TRIGGER client_contacts_touch BEFORE UPDATE ON public.client_contacts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_client_contacts_client ON public.client_contacts(client_id);

-- DOCUMENTS
CREATE TABLE public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  uploaded_by uuid,
  kind text NOT NULL,
  label text,
  file_path text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  expires_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_documents TO authenticated;
GRANT ALL ON public.client_documents TO service_role;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_documents_owner_all" ON public.client_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE INDEX idx_client_documents_client ON public.client_documents(client_id);

-- NOTES
CREATE TABLE public.client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  author_id uuid,
  body text NOT NULL,
  edited_at timestamptz,
  edit_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_notes TO authenticated;
GRANT ALL ON public.client_notes TO service_role;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_notes_owner_all" ON public.client_notes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE INDEX idx_client_notes_client ON public.client_notes(client_id);

-- ACTIVITY TIMELINE
CREATE TABLE public.client_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  actor_id uuid,
  kind text NOT NULL,
  title text NOT NULL,
  detail text,
  ref_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.client_activity TO authenticated;
GRANT ALL ON public.client_activity TO service_role;
ALTER TABLE public.client_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_activity_owner_select" ON public.client_activity FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "client_activity_owner_insert" ON public.client_activity FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE INDEX idx_client_activity_client ON public.client_activity(client_id, created_at DESC);

-- ORDERS LINK
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS crm_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_crm_client ON public.orders(crm_client_id);

CREATE OR REPLACE FUNCTION public.log_client_order_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.crm_client_id IS NOT NULL THEN
    INSERT INTO public.client_activity(client_id, actor_id, kind, title, detail, ref_id)
    VALUES (NEW.crm_client_id, auth.uid(), 'order', 'Order ' || NEW.order_number || ' placed', NEW.pickup_address || ' → ' || NEW.dropoff_address, NEW.id);
    UPDATE public.clients SET last_order_at = now() WHERE id = NEW.crm_client_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_client_order_activity AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_client_order_activity();
