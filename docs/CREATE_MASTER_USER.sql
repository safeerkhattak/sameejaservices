-- SAMEEJA COMMISSION SERVICES: ONE-TIME MASTER USER SETUP
--
-- IMPORTANT:
-- 1. First create the user in Supabase Dashboard -> Authentication -> Users.
-- 2. Replace the two values below with that user's email and display name.
-- 3. Run this script in Supabase Dashboard -> SQL Editor only once.
-- 4. Never put a password in this SQL file.

begin;

-- Enforce one master account at the database level.
create unique index if not exists app_users_single_owner_key
  on public.app_users (role)
  where role = 'owner';

do $$
declare
  master_email text := lower('CHANGE-ME@example.com');
  master_name text := 'CHANGE ME';
  master_auth_id uuid;
begin
  if master_email = 'change-me@example.com' or master_name = 'CHANGE ME' then
    raise exception 'Replace master_email and master_name before running this script.';
  end if;

  select id
    into master_auth_id
    from auth.users
   where lower(email) = master_email
   limit 1;

  if master_auth_id is null then
    raise exception 'No Supabase Authentication user exists for email %', master_email;
  end if;

  if exists (
    select 1
      from public.app_users
     where role = 'owner'
       and id <> master_auth_id
  ) then
    raise exception 'A different master user already exists. Stop and review app_users.';
  end if;

  insert into public.app_users (id, email, display_name, role, is_active)
  values (master_auth_id, master_email, master_name, 'owner', true)
  on conflict (id) do update
     set email = excluded.email,
         display_name = excluded.display_name,
         role = 'owner',
         is_active = true;
end $$;

commit;

-- Verify the result. This never displays passwords or secret keys.
select id, email, display_name, role, is_active, created_at
  from public.app_users
 order by created_at;
