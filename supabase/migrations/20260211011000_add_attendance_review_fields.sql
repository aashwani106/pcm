alter table public.attendance
add column if not exists review_status text not null default 'accepted'
  check (review_status in ('accepted', 'flagged')),
add column if not exists review_note text,
add column if not exists reviewed_at timestamptz,
add column if not exists reviewed_by uuid references auth.users(id),
add column if not exists reviewed_by_role text
  check (reviewed_by_role in ('admin', 'parent'));

create index if not exists attendance_review_status_idx
on public.attendance (review_status);
