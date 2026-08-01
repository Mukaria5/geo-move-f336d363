-- 1. Vehicle status enum
create type public.vehicle_status as enum (
  'available','assigned','loading','on_trip','offloading','maintenance','out_of_service','offline','idle'
);

-- 2. Extend trucks
alter table public.trucks
  add column if not exists fleet_number text,
  add column if not exists vehicle_type text,
  add column if not exists make text,
  add column if not exists model text,
  add column if not exists year integer,
  add column if not exists color text,
  add column if not exists chassis_no text,
  add column if not exists axles integer,
  add column if not exists weight_kg numeric,
  add column if not exists fuel_type text,
  add column if not exists transmission text,
  add column if not exists branch text,
  add column if not exists photo_url text,
  add column if not exists tracker_provider text,
  add column if not exists tracker_id text,
  add column if not exists tracker_sim text,
  add column if not exists tracker_status text default 'unknown',
  add column if not exists insurance_expiry date,
  add column if not exists road_licence_expiry date,
  add column if not exists last_service_date date,
  add column if not exists next_service_date date,
  add column if not exists fuel_level_pct integer,
  add column if not exists status public.vehicle_status not null default 'available',
  add column if not exists status_changed_at timestamptz not null default now(),
  add column if not exists current_order_id uuid;

-- 3. Status history
create table public.vehicle_status_events (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references public.trucks(id) on delete cascade,
  actor_id uuid,
  status public.vehicle_status not null,
  note text,
  created_at timestamptz not null default now()
);
grant select, insert on public.vehicle_status_events to authenticated;
grant all on public.vehicle_status_events to service_role;
alter table public.vehicle_status_events enable row level security;
create policy "Read status events for own trucks" on public.vehicle_status_events
  for select to authenticated using (
    exists (select 1 from public.trucks t where t.id = truck_id and (t.owner_id = auth.uid() or t.driver_id = auth.uid()))
    or public.has_role(auth.uid(),'admin')
  );
create policy "Insert status events for own trucks" on public.vehicle_status_events
  for insert to authenticated with check (
    exists (select 1 from public.trucks t where t.id = truck_id and (t.owner_id = auth.uid() or t.driver_id = auth.uid()))
    or public.has_role(auth.uid(),'admin')
  );

-- 4. Maintenance
create table public.vehicle_maintenance (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references public.trucks(id) on delete cascade,
  created_by uuid,
  service_type text not null,
  description text,
  cost numeric default 0,
  odometer_km numeric,
  service_date date not null default current_date,
  next_due_date date,
  vendor text,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.vehicle_maintenance to authenticated;
grant all on public.vehicle_maintenance to service_role;
alter table public.vehicle_maintenance enable row level security;
create policy "Owner manages maintenance" on public.vehicle_maintenance
  for all to authenticated using (
    exists (select 1 from public.trucks t where t.id = truck_id and t.owner_id = auth.uid()) or public.has_role(auth.uid(),'admin')
  ) with check (
    exists (select 1 from public.trucks t where t.id = truck_id and t.owner_id = auth.uid()) or public.has_role(auth.uid(),'admin')
  );
create policy "Driver reads maintenance" on public.vehicle_maintenance
  for select to authenticated using (
    exists (select 1 from public.trucks t where t.id = truck_id and t.driver_id = auth.uid())
  );
create trigger trg_maintenance_touch before update on public.vehicle_maintenance
  for each row execute function public.touch_updated_at();

-- 5. Fuel logs
create table public.vehicle_fuel_logs (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references public.trucks(id) on delete cascade,
  created_by uuid,
  litres numeric not null default 0,
  cost numeric not null default 0,
  odometer_km numeric,
  station text,
  filled_at date not null default current_date,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.vehicle_fuel_logs to authenticated;
grant all on public.vehicle_fuel_logs to service_role;
alter table public.vehicle_fuel_logs enable row level security;
create policy "Owner manages fuel logs" on public.vehicle_fuel_logs
  for all to authenticated using (
    exists (select 1 from public.trucks t where t.id = truck_id and t.owner_id = auth.uid()) or public.has_role(auth.uid(),'admin')
  ) with check (
    exists (select 1 from public.trucks t where t.id = truck_id and t.owner_id = auth.uid()) or public.has_role(auth.uid(),'admin')
  );
create policy "Driver logs fuel" on public.vehicle_fuel_logs
  for select to authenticated using (
    exists (select 1 from public.trucks t where t.id = truck_id and t.driver_id = auth.uid())
  );

-- 6. Vehicle documents
create table public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references public.trucks(id) on delete cascade,
  uploaded_by uuid,
  kind text not null,
  label text,
  file_path text not null,
  expires_on date,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.vehicle_documents to authenticated;
grant all on public.vehicle_documents to service_role;
alter table public.vehicle_documents enable row level security;
create policy "Owner manages vehicle docs" on public.vehicle_documents
  for all to authenticated using (
    exists (select 1 from public.trucks t where t.id = truck_id and t.owner_id = auth.uid()) or public.has_role(auth.uid(),'admin')
  ) with check (
    exists (select 1 from public.trucks t where t.id = truck_id and t.owner_id = auth.uid()) or public.has_role(auth.uid(),'admin')
  );
create policy "Driver reads vehicle docs" on public.vehicle_documents
  for select to authenticated using (
    exists (select 1 from public.trucks t where t.id = truck_id and t.driver_id = auth.uid())
  );

-- 7. Log every vehicle status change
create or replace function public.log_vehicle_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and NEW.status is distinct from OLD.status then
    NEW.status_changed_at := now();
    insert into public.vehicle_status_events(truck_id, actor_id, status)
    values (NEW.id, auth.uid(), NEW.status);
  end if;
  return NEW;
end $$;

create trigger trg_truck_status_log before update on public.trucks
  for each row execute function public.log_vehicle_status_change();

-- 8. Sync vehicle status from order lifecycle
create or replace function public.sync_vehicle_from_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.truck_id is null then return NEW; end if;

  if NEW.status in ('en_route_pickup','arrived_pickup','loading','in_transit','delayed','arrived_dropoff') then
    update public.trucks
      set status = case NEW.status
            when 'loading' then 'loading'::vehicle_status
            when 'arrived_dropoff' then 'offloading'::vehicle_status
            else 'on_trip'::vehicle_status end,
          current_order_id = NEW.id
    where id = NEW.truck_id and status not in ('maintenance','out_of_service');
  elsif NEW.status = 'assigned' then
    update public.trucks set status = 'assigned'::vehicle_status, current_order_id = NEW.id
    where id = NEW.truck_id and status not in ('maintenance','out_of_service');
  elsif NEW.status in ('completed','delivered','cancelled') then
    update public.trucks set status = 'available'::vehicle_status, current_order_id = null
    where id = NEW.truck_id and status not in ('maintenance','out_of_service','offline');
  end if;
  return NEW;
end $$;

create trigger trg_order_vehicle_sync after insert or update of status, truck_id on public.orders
  for each row execute function public.sync_vehicle_from_order();