alter table public.live_join_requests replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.live_join_requests;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.live_sessions;
exception
  when duplicate_object then null;
end;
$$;
