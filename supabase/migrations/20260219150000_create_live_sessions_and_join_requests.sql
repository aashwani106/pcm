create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  room_name text not null,
  status text not null default 'live' check (status in ('live', 'ended')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.live_join_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  display_name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  token text,
  created_at timestamptz not null default now()
);

create index if not exists live_sessions_teacher_idx
  on public.live_sessions (teacher_id);

create index if not exists live_sessions_status_idx
  on public.live_sessions (status);

create index if not exists live_join_requests_session_idx
  on public.live_join_requests (session_id);

create index if not exists live_join_requests_status_idx
  on public.live_join_requests (status);
