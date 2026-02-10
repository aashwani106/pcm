-- Enable RLS
alter table public.attendance enable row level security;

-- Admin: full access
create policy "admin_full_access_attendance"
on public.attendance
for all
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

-- Student: read own attendance
create policy "student_read_own_attendance"
on public.attendance
for select
using (
  auth.uid() in (
    select user_id from public.students
    where students.id = attendance.student_id
  )
);

-- Parent: read child attendance
create policy "parent_read_child_attendance"
on public.attendance
for select
using (
  auth.uid() in (
    select parent_id from public.students
    where students.id = attendance.student_id
  )
);

alter table public.attendance_photos enable row level security;

-- Admin full access
create policy "admin_full_access_attendance_photos"
on public.attendance_photos
for all
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

-- Student: read own photos
create policy "student_read_own_attendance_photos"
on public.attendance_photos
for select
using (
  auth.uid() in (
    select s.user_id
    from public.students s
    join public.attendance a on a.student_id = s.id
    where a.id = attendance_photos.attendance_id
  )
);

-- Parent: read child photos
create policy "parent_read_child_attendance_photos"
on public.attendance_photos
for select
using (
  auth.uid() in (
    select s.parent_id
    from public.students s
    join public.attendance a on a.student_id = s.id
    where a.id = attendance_photos.attendance_id
  )
);

alter table public.students enable row level security;

-- Admin full access
create policy "admin_full_access_students"
on public.students
for all
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

-- Student: read own student record
create policy "student_read_self"
on public.students
for select
using (auth.uid() = user_id);

-- Parent: read child record
create policy "parent_read_child"
on public.students
for select
using (auth.uid() = parent_id);

alter table public.profiles enable row level security;

-- User can read own profile
create policy "read_own_profile"
on public.profiles
for select
using (auth.uid() = id);

-- Admin full access
create policy "admin_full_access_profiles"
on public.profiles
for all
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);
