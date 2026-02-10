-- Attendance photos for manual verification (no AI)

create table if not exists public.attendance_photos (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null
    references public.attendance(id)
    on delete cascade,
  photo_url text not null,
  accuracy_meters numeric,
  created_at timestamptz not null default now()
);

create index if not exists attendance_photos_attendance_id_idx
on public.attendance_photos(attendance_id);