alter table public.live_sessions
add column if not exists started_at timestamptz;

alter table public.live_sessions
add column if not exists expires_at timestamptz;
