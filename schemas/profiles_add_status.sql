alter table public.profiles
add column if not exists status text not null default 'active'
check (status in ('active', 'deactivated'));

comment on column public.profiles.status is 'Account lifecycle status: active or deactivated';

update public.profiles
set status = 'active'
where status is null;

-- example: deactivate one user account
-- update public.profiles
-- set status = 'deactivated',
--     updated_at = now()
-- where id = '00000000-0000-0000-0000-000000000000'::uuid;

-- example: reactivate one user account
-- update public.profiles
-- set status = 'active',
--     updated_at = now()
-- where id = '00000000-0000-0000-0000-000000000000'::uuid;
