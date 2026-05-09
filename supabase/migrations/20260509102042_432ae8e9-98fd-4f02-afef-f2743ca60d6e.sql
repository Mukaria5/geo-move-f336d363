
-- Roles enum
create type public.app_role as enum ('client', 'driver', 'fleet', 'admin');

-- Document types enum
create type public.doc_type as enum (
  'national_id', 'driving_license', 'truck_logbook',
  'insurance', 'ntsa_inspection', 'company_registration'
);
create type public.doc_status as enum ('pending', 'approved', 'rejected');

-- =========================
-- profiles
-- =========================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- =========================
-- user_roles (separate table, security best practice)
-- =========================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Security definer fn to check role without recursion
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create policy "Users can view own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can view all roles"
  on public.user_roles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can insert roles"
  on public.user_roles for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

-- Allow new users to assign themselves a non-admin role on signup
create policy "Users can self-assign non-admin role once"
  on public.user_roles for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and role <> 'admin'
    and not exists (select 1 from public.user_roles where user_id = auth.uid())
  );

-- =========================
-- driver profiles
-- =========================
create table public.driver_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  national_id_no text,
  license_no text,
  vehicle_make text,
  vehicle_model text,
  plate text,
  capacity_tons numeric,
  years_experience integer,
  is_online boolean not null default false,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.driver_profiles enable row level security;

create policy "Drivers manage own profile"
  on public.driver_profiles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all driver profiles"
  on public.driver_profiles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins update driver verification"
  on public.driver_profiles for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- =========================
-- fleet companies
-- =========================
create table public.fleet_companies (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_name text not null,
  registration_no text,
  kra_pin text,
  contact_email text,
  contact_phone text,
  fleet_size integer default 1,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.fleet_companies enable row level security;

create policy "Fleet manages own company"
  on public.fleet_companies for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all companies"
  on public.fleet_companies for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins update company verification"
  on public.fleet_companies for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- =========================
-- documents
-- =========================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_type public.doc_type not null,
  file_path text not null,
  status public.doc_status not null default 'pending',
  notes text,
  uploaded_at timestamptz not null default now()
);
alter table public.documents enable row level security;

create policy "Users manage own documents"
  on public.documents for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all documents"
  on public.documents for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins update document status"
  on public.documents for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- =========================
-- updated_at trigger fn
-- =========================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger driver_profiles_touch before update on public.driver_profiles
  for each row execute function public.touch_updated_at();
create trigger fleet_companies_touch before update on public.fleet_companies
  for each row execute function public.touch_updated_at();

-- =========================
-- handle_new_user trigger
-- =========================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', new.phone, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================
-- Storage bucket: documents (private)
-- =========================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false);

-- Path convention: <user_id>/<doc_type>-<timestamp>.<ext>
create policy "Users upload own docs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own docs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own docs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Admins read all docs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and public.has_role(auth.uid(), 'admin')
  );
