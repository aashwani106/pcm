do $$
begin
  if not exists (select 1 from pg_type where typname = 'enrollment_status') then
    create type public.enrollment_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

create table if not exists public.enrollment_requests (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  student_email text not null,
  class_level text not null,
  stream text not null,
  board text not null,
  parent_name text not null,
  parent_phone text not null,
  parent_email text not null,
  previous_marks numeric(5,2),
  city text,
  status public.enrollment_status not null default 'pending',
  rejection_reason text,
  processed_by uuid references auth.users(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists enrollment_requests_status_idx
  on public.enrollment_requests (status);

create index if not exists enrollment_requests_created_at_idx
  on public.enrollment_requests (created_at desc);

create index if not exists enrollment_requests_parent_email_idx
  on public.enrollment_requests (parent_email);

alter table public.enrollment_requests enable row level security;

-- Public can submit enrollment requests.
drop policy if exists "public_insert_enrollment_requests" on public.enrollment_requests;
create policy "public_insert_enrollment_requests"
  on public.enrollment_requests
  for insert
  to anon, authenticated
  with check (true);

-- Only admins can view/update enrollment requests.
drop policy if exists "admin_select_enrollment_requests" on public.enrollment_requests;
create policy "admin_select_enrollment_requests"
  on public.enrollment_requests
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "admin_update_enrollment_requests" on public.enrollment_requests;
create policy "admin_update_enrollment_requests"
  on public.enrollment_requests
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
