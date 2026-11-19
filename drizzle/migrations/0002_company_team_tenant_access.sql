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
        AND cm.status IN ('pending', 'active')
      ORDER BY cm.invited_at DESC
      LIMIT 1
    )
  END
$$;
REVOKE ALL ON FUNCTION public.company_owner_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.company_owner_id(uuid) TO authenticated;

CREATE POLICY "Company managers read company orders" ON public.orders FOR SELECT TO authenticated
  USING (fleet_owner_user_id = public.company_owner_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers create company orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (fleet_owner_user_id = public.company_owner_id(auth.uid()) AND created_by = auth.uid() AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers update company orders" ON public.orders FOR UPDATE TO authenticated
  USING (fleet_owner_user_id = public.company_owner_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'))
  WITH CHECK (fleet_owner_user_id = public.company_owner_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Company managers manage company trucks" ON public.trucks FOR ALL TO authenticated
  USING (owner_id = public.company_owner_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'))
  WITH CHECK (owner_id = public.company_owner_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers manage company drivers" ON public.drivers FOR ALL TO authenticated
  USING (owner_id = public.company_owner_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'))
  WITH CHECK (owner_id = public.company_owner_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers manage company clients" ON public.clients FOR ALL TO authenticated
  USING (owner_id = public.company_owner_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'))
  WITH CHECK (owner_id = public.company_owner_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers manage company invoices" ON public.invoices FOR ALL TO authenticated
  USING (owner_id = public.company_owner_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'))
  WITH CHECK (owner_id = public.company_owner_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers manage company payments" ON public.payments FOR ALL TO authenticated
  USING (owner_id = public.company_owner_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'))
  WITH CHECK (owner_id = public.company_owner_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers manage company expenses" ON public.expenses FOR ALL TO authenticated
  USING (owner_id = public.company_owner_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'))
  WITH CHECK (owner_id = public.company_owner_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers manage invoice items" ON public.invoice_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers read invoice events" ON public.invoice_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers add invoice events" ON public.invoice_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers manage finance documents" ON public.finance_documents FOR ALL TO authenticated
  USING (owner_id = public.company_owner_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'))
  WITH CHECK (owner_id = public.company_owner_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers manage vehicle maintenance" ON public.vehicle_maintenance FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trucks t WHERE t.id = truck_id AND t.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trucks t WHERE t.id = truck_id AND t.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers manage vehicle fuel logs" ON public.vehicle_fuel_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trucks t WHERE t.id = truck_id AND t.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trucks t WHERE t.id = truck_id AND t.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers manage driver documents" ON public.driver_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers manage vehicle documents" ON public.vehicle_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trucks t WHERE t.id = truck_id AND t.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trucks t WHERE t.id = truck_id AND t.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers manage client contacts" ON public.client_contacts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers manage client documents" ON public.client_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers manage client notes" ON public.client_notes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers read client activity" ON public.client_activity FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers add client activity" ON public.client_activity FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.owner_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers read order events" ON public.order_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.fleet_owner_user_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers add order events" ON public.order_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.fleet_owner_user_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers read order documents" ON public.order_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.fleet_owner_user_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Company managers add order documents" ON public.order_documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.fleet_owner_user_id = public.company_owner_id(auth.uid())) AND public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Company admins upload own logo" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-branding' AND (storage.foldername(name))[1] = auth.uid()::text AND public.has_role(auth.uid(), 'fleet'));
CREATE POLICY "Company admins read own logo" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-branding' AND (storage.foldername(name))[1] = auth.uid()::text AND public.has_role(auth.uid(), 'fleet'));
CREATE POLICY "Company admins update own logo" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-branding' AND (storage.foldername(name))[1] = auth.uid()::text AND public.has_role(auth.uid(), 'fleet'))
  WITH CHECK (bucket_id = 'company-branding' AND (storage.foldername(name))[1] = auth.uid()::text AND public.has_role(auth.uid(), 'fleet'));
CREATE POLICY "Company admins remove own logo" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-branding' AND (storage.foldername(name))[1] = auth.uid()::text AND public.has_role(auth.uid(), 'fleet'));