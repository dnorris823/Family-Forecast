-- TEMPORARY: Allow all authenticated users to see all tasks to test Realtime
-- This rules out if the specific family_id logic in RLS is the blocker.
begin;
  drop policy if exists "Debug Realtime Tasks" on public.tasks;
  create policy "Debug Realtime Tasks" 
    on public.tasks for select 
    to authenticated 
    using (true);
commit;

-- Just in case, refresh the publication
alter publication supabase_realtime set table 
    public.events, 
    public.tasks, 
    public.second_brain, 
    public.realtime_debug;
