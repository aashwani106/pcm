alter table public.students
add column if not exists attendance_enabled boolean not null default true,
add column if not exists admission_date date,
add column if not exists class_level text,
add column if not exists batch_id text,
add column if not exists last_attendance_at timestamptz;
