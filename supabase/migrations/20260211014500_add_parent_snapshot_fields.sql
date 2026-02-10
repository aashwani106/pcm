alter table public.students
add column if not exists parent_name text,
add column if not exists parent_phone text,
add column if not exists parent_email text;
