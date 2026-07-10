
-- Update handle_new_user to also create user_roles row from signup metadata,
-- so new users skip the role picker on subsequent logins.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  meta_role text;
  role_val app_role;
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', new.phone, '')
  )
  on conflict (id) do nothing;

  meta_role := new.raw_user_meta_data->>'role';
  if meta_role in ('client','driver','fleet','admin') then
    role_val := meta_role::app_role;
    insert into public.user_roles (user_id, role)
    values (new.id, role_val)
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$$;

-- Backfill: for existing users who have a role in metadata but no user_roles row.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, (u.raw_user_meta_data->>'role')::app_role
FROM auth.users u
WHERE u.raw_user_meta_data->>'role' IN ('client','driver','fleet','admin')
  AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT (user_id, role) DO NOTHING;
