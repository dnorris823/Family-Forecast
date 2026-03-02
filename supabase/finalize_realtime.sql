-- Final Realtime Setup & Cleanup
begin;
  -- 1. Remove debug table
  drop table if exists public.realtime_debug;

  -- 2. Finalize Publication (Keep the 3 main tables)
  alter publication supabase_realtime set table 
      public.events, 
      public.tasks, 
      public.second_brain;

  -- 3. Confirm Identity Full for all sync tables
  alter table public.events replica identity full;
  alter table public.tasks replica identity full;
  alter table public.second_brain replica identity full;
commit;
