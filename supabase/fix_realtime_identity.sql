-- Set Replica Identity to Full to ensure RLS works correctly for Realtime updates
alter table public.events replica identity full;
alter table public.tasks replica identity full;
alter table public.second_brain replica identity full;
