
-- ENUMS
create type public.invoice_status as enum ('draft','sent','partially_paid','paid','overdue','cancelled');
create type public.payment_method as enum ('cash','bank_transfer','mobile_money','credit_card','cheque','other');
create type public.expense_category as enum ('fuel','maintenance','driver_allowance','tolls','accommodation','repairs','office','insurance','licences','other');

-- INVOICES
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  invoice_number text not null,
  client_id uuid references public.clients(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  client_name text not null default '',
  issue_date date not null default current_date,
  due_date date not null default (current_date + 30),
  currency text not null default 'KES',
  subtotal numeric not null default 0,
  tax_rate numeric not null default 0,
  tax_amount numeric not null default 0,
  discount numeric not null default 0,
  extra_charges numeric not null default 0,
  total numeric not null default 0,
  amount_paid numeric not null default 0,
  status public.invoice_status not null default 'draft',
  notes text,
  terms text,
  sent_at timestamptz,
  paid_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, invoice_number)
);
grant select, insert, update, delete on public.invoices to authenticated;
grant all on public.invoices to service_role;
alter table public.invoices enable row level security;
create policy "Owners and admins manage invoices" on public.invoices for all to authenticated
  using (auth.uid() = owner_id or public.has_role(auth.uid(),'admin'))
  with check (auth.uid() = owner_id or public.has_role(auth.uid(),'admin'));

create index idx_invoices_owner on public.invoices(owner_id);
create index idx_invoices_client on public.invoices(client_id);
create index idx_invoices_order on public.invoices(order_id);

-- INVOICE ITEMS
create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  amount numeric not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.invoice_items to authenticated;
grant all on public.invoice_items to service_role;
alter table public.invoice_items enable row level security;
create policy "Invoice owners manage items" on public.invoice_items for all to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and (i.owner_id = auth.uid() or public.has_role(auth.uid(),'admin'))))
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and (i.owner_id = auth.uid() or public.has_role(auth.uid(),'admin'))));
create index idx_invoice_items_invoice on public.invoice_items(invoice_id);

-- PAYMENTS
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  payment_number text,
  client_id uuid references public.clients(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  amount numeric not null default 0,
  method public.payment_method not null default 'mobile_money',
  reference_no text,
  payment_date date not null default current_date,
  proof_path text,
  notes text,
  recorded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "Owners and admins manage payments" on public.payments for all to authenticated
  using (auth.uid() = owner_id or public.has_role(auth.uid(),'admin'))
  with check (auth.uid() = owner_id or public.has_role(auth.uid(),'admin'));
create index idx_payments_owner on public.payments(owner_id);
create index idx_payments_invoice on public.payments(invoice_id);
create index idx_payments_client on public.payments(client_id);

-- EXPENSES
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  category public.expense_category not null default 'other',
  amount numeric not null default 0,
  expense_date date not null default current_date,
  truck_id uuid references public.trucks(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  vendor text,
  receipt_path text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.expenses to authenticated;
grant all on public.expenses to service_role;
alter table public.expenses enable row level security;
create policy "Owners and admins manage expenses" on public.expenses for all to authenticated
  using (auth.uid() = owner_id or public.has_role(auth.uid(),'admin'))
  with check (auth.uid() = owner_id or public.has_role(auth.uid(),'admin'));
create index idx_expenses_owner on public.expenses(owner_id);
create index idx_expenses_order on public.expenses(order_id);

-- INVOICE EVENTS
create table public.invoice_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  actor_id uuid,
  kind text not null,
  title text not null,
  detail text,
  created_at timestamptz not null default now()
);
grant select, insert on public.invoice_events to authenticated;
grant all on public.invoice_events to service_role;
alter table public.invoice_events enable row level security;
create policy "Invoice owners read events" on public.invoice_events for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and (i.owner_id = auth.uid() or public.has_role(auth.uid(),'admin'))));
create policy "Invoice owners add events" on public.invoice_events for insert to authenticated
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and (i.owner_id = auth.uid() or public.has_role(auth.uid(),'admin'))));
create index idx_invoice_events_invoice on public.invoice_events(invoice_id);

-- FINANCE DOCUMENTS
create table public.finance_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  invoice_id uuid references public.invoices(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  kind text not null default 'other',
  label text,
  file_path text not null,
  version integer not null default 1,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.finance_documents to authenticated;
grant all on public.finance_documents to service_role;
alter table public.finance_documents enable row level security;
create policy "Owners and admins manage finance documents" on public.finance_documents for all to authenticated
  using (auth.uid() = owner_id or public.has_role(auth.uid(),'admin'))
  with check (auth.uid() = owner_id or public.has_role(auth.uid(),'admin'));
create index idx_finance_documents_owner on public.finance_documents(owner_id);

-- TOUCH TRIGGERS
create trigger invoices_touch before update on public.invoices for each row execute function public.touch_updated_at();
create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();
create trigger expenses_touch before update on public.expenses for each row execute function public.touch_updated_at();

-- INVOICE RECALC FROM PAYMENTS
create or replace function public.recalc_invoice_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invoices%rowtype;
  paid numeric;
  target uuid;
begin
  target := coalesce(NEW.invoice_id, OLD.invoice_id);
  if target is null then return coalesce(NEW, OLD); end if;

  select * into inv from public.invoices where id = target;
  if not found then return coalesce(NEW, OLD); end if;

  select coalesce(sum(amount),0) into paid from public.payments where invoice_id = target;

  update public.invoices set
    amount_paid = paid,
    status = case
      when inv.status = 'cancelled' then 'cancelled'::invoice_status
      when paid >= inv.total and inv.total > 0 then 'paid'::invoice_status
      when paid > 0 then 'partially_paid'::invoice_status
      when inv.due_date < current_date then 'overdue'::invoice_status
      when inv.sent_at is not null then 'sent'::invoice_status
      else inv.status end,
    paid_at = case when paid >= inv.total and inv.total > 0 then now() else null end
  where id = target;

  if TG_OP = 'INSERT' then
    insert into public.invoice_events(invoice_id, actor_id, kind, title, detail)
    values (target, auth.uid(),
      case when paid >= inv.total and inv.total > 0 then 'paid' else 'partial_payment' end,
      case when paid >= inv.total and inv.total > 0 then 'Invoice fully paid' else 'Partial payment received' end,
      'Payment of ' || NEW.amount::text || ' via ' || NEW.method::text);
  end if;

  -- client outstanding balance
  if inv.client_id is not null then
    update public.clients c set outstanding_balance = coalesce((
      select sum(i.total - i.amount_paid) from public.invoices i
      where i.client_id = c.id and i.status not in ('cancelled','draft')
    ),0) where c.id = inv.client_id;
  end if;

  return coalesce(NEW, OLD);
end $$;

create trigger trg_payments_recalc
after insert or update or delete on public.payments
for each row execute function public.recalc_invoice_balance();

-- INVOICE CREATED EVENT
create or replace function public.log_invoice_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.invoice_events(invoice_id, actor_id, kind, title, detail)
  values (NEW.id, auth.uid(), 'created', 'Invoice ' || NEW.invoice_number || ' created', NEW.client_name);
  if NEW.client_id is not null then
    insert into public.client_activity(client_id, actor_id, kind, title, detail, ref_id)
    values (NEW.client_id, auth.uid(), 'invoice', 'Invoice ' || NEW.invoice_number || ' created', NEW.total::text, NEW.id);
  end if;
  return NEW;
end $$;

create trigger trg_invoice_created after insert on public.invoices
for each row execute function public.log_invoice_created();

revoke execute on function public.recalc_invoice_balance() from anon, authenticated;
revoke execute on function public.log_invoice_created() from anon, authenticated;
