-- Create class status enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'class_status') then
    create type class_status as enum (
      'scheduled',
      'live',
      'ended'
    );
  end if;
end
$$;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),

  title text not null,

  teacher_id uuid not null references auth.users(id) on delete cascade,

  batch_id text not null,

  scheduled_at timestamptz not null,
  duration_minutes integer not null,

  status class_status not null default 'scheduled',

  livekit_room_name text not null unique,

  started_at timestamptz,
  ended_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists classes_teacher_idx
  on public.classes (teacher_id);

create index if not exists classes_batch_idx
  on public.classes (batch_id);

create index if not exists classes_status_idx
  on public.classes (status);
