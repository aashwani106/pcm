-- Extend students table with domain-specific fields

alter table public.students
add column if not exists roll_number text,
add column if not exists batch text,
add column if not exists joined_at date not null default current_date,
add column if not exists is_active boolean not null default true,
add column if not exists remark text;