
create table public.trucks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  fleet_owner_user_id uuid references public.fleet_companies(user_id) on delete set null,
  driver_id uuid,
  truck_model text not null,
  plate text not null,
  capacity_tons numeric not null default 30,
  base_price numeric not null default 5000,
  price_per_km numeric not null default 300,
  is_available boolean not null default true,
  is_online boolean not null default false,
  current_lat double precision,
  current_lng double precision,
  location_updated_at timestamptz,
  verified boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plate)
);
create index idx_trucks_online on public.trucks (is_online, is_available, verified);
create index idx_trucks_owner on public.trucks (owner_id);
create index idx_trucks_driver on public.trucks (driver_id);

alter table public.trucks enable row level security;

create policy "Owner manages trucks" on public.trucks
  for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Assigned driver updates location" on public.trucks
  for update to authenticated using (auth.uid() = driver_id) with check (auth.uid() = driver_id);
create policy "Authenticated users see live trucks" on public.trucks
  for select to authenticated using (is_online = true and is_available = true and verified = true);
create policy "Admins read all trucks" on public.trucks
  for select to authenticated using (has_role(auth.uid(), 'admin'));
create policy "Admins update all trucks" on public.trucks
  for update to authenticated using (has_role(auth.uid(), 'admin'));

create trigger trucks_touch before update on public.trucks
  for each row execute function public.touch_updated_at();

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  truck_id uuid references public.trucks(id) on delete set null,
  driver_id uuid,
  pickup_address text not null,
  pickup_lat double precision,
  pickup_lng double precision,
  dropoff_address text not null,
  dropoff_lat double precision,
  dropoff_lng double precision,
  machinery_type text,
  weight_tons numeric,
  distance_km numeric,
  estimated_price numeric,
  final_price numeric,
  status text not null default 'requested',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_bookings_client on public.bookings (client_id);
create index idx_bookings_driver on public.bookings (driver_id);
create index idx_bookings_status on public.bookings (status);

alter table public.bookings enable row level security;

create policy "Clients manage own bookings" on public.bookings
  for all to authenticated using (auth.uid() = client_id) with check (auth.uid() = client_id);
create policy "Assigned driver reads bookings" on public.bookings
  for select to authenticated using (auth.uid() = driver_id);
create policy "Assigned driver updates bookings" on public.bookings
  for update to authenticated using (auth.uid() = driver_id) with check (auth.uid() = driver_id);
create policy "Truck owner reads bookings" on public.bookings
  for select to authenticated using (
    exists (select 1 from public.trucks t where t.id = bookings.truck_id and t.owner_id = auth.uid())
  );
create policy "Truck owner updates bookings" on public.bookings
  for update to authenticated using (
    exists (select 1 from public.trucks t where t.id = bookings.truck_id and t.owner_id = auth.uid())
  );
create policy "Admins read all bookings" on public.bookings
  for select to authenticated using (has_role(auth.uid(), 'admin'));
create policy "Admins update all bookings" on public.bookings
  for update to authenticated using (has_role(auth.uid(), 'admin'));

create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

alter publication supabase_realtime add table public.trucks;
alter publication supabase_realtime add table public.bookings;
alter table public.trucks replica identity full;
alter table public.bookings replica identity full;

insert into storage.buckets (id, name, public) values ('trip-photos', 'trip-photos', false)
  on conflict (id) do nothing;

create policy "Users upload own trip photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'trip-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users read own trip photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'trip-photos' and auth.uid()::text = (storage.foldername(name))[1]);
