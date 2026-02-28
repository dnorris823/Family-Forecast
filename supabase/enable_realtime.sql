-- Enable Realtime for tables
begin;
  -- Remove if exists to avoid errors (idempotent)
  -- alter publication supabase_realtime drop table public.events; 
  -- alter publication supabase_realtime drop table public.tasks;
  -- alter publication supabase_realtime drop table public.second_brain;

  alter publication supabase_realtime add table public.events;
  alter publication supabase_realtime add table public.tasks;
  alter publication supabase_realtime add table public.second_brain;
commit;
