-- Extend profiles with core user fields

alter table public.profiles
add column if not exists full_name text,
add column if not exists email text,
add column if not exists status text not null default 'active';

-- Optional safety check
alter table public.profiles
add constraint profiles_status_check
check (status in ('active', 'suspended'));