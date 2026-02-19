create unique index if not exists enrollment_requests_pending_student_email_unique
  on public.enrollment_requests (lower(student_email))
  where status = 'pending';

create unique index if not exists enrollment_requests_pending_parent_email_unique
  on public.enrollment_requests (lower(parent_email))
  where status = 'pending';
