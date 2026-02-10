/*
  E8.2 — Extend students as the master academic entity
  Phase 1 migration:
  - Add new columns (nullable where needed)
  - NO breaking constraints yet
*/

-- ---------------------------------------------------
-- 1. Student lifecycle enum (safe create)
-- ---------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'student_status'
  ) then
    create type student_status as enum (
      'active',
      'paused',
      'left'
    );
  end if;
end $$;

-- ---------------------------------------------------
-- 2. Core student fields (NULLABLE for now)
-- ---------------------------------------------------
alter table public.students
  add column if not exists full_name text,
  add column if not exists class_level text,
  add column if not exists batch_id text,
  add column if not exists roll_number text,
  add column if not exists status student_status not null default 'active',
  add column if not exists admission_date date,
  add column if not exists remark text;

-- ---------------------------------------------------
-- 3. Parent snapshot fields (denormalized by design)
-- ---------------------------------------------------
alter table public.students
  add column if not exists parent_name text,
  add column if not exists parent_email text,
  add column if not exists parent_phone text;

-- ---------------------------------------------------
-- 4. Operational control fields
-- ---------------------------------------------------
alter table public.students
  add column if not exists attendance_enabled boolean not null default true,
  add column if not exists last_attendance_at timestamptz,
  add column if not exists left_reason text;

-- ---------------------------------------------------
-- 5. Indexes for admin & reporting performance
-- ---------------------------------------------------
create index if not exists students_status_idx
  on public.students (status);

create index if not exists students_batch_idx
  on public.students (batch_id);

create index if not exists students_parent_idx
  on public.students (parent_id);