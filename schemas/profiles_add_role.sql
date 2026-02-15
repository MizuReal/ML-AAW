alter table public.profiles
add column if not exists role smallint not null default 0
check (role in (0, 1));

comment on column public.profiles.role is '0 = user, 1 = admin';

-- set a specific user as admin (replace with real auth user id)
-- update public.profiles
-- set role = 1,
--     updated_at = now()
-- where id = '00000000-0000-0000-0000-000000000000'::uuid;
