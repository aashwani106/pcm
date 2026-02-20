alter table public.live_sessions
add column if not exists capacity integer not null default 100;
