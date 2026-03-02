-- 1. Create a debug table with NO security (Public)
create table if not exists public.realtime_debug (
    id uuid primary key default gen_random_uuid(),
    message text,
    created_at timestamptz default now()
);

-- 2. Force the publication to include ALL tables we care about
-- Using SET overwrites the list, ensuring they are definitely added.
alter publication supabase_realtime set table 
    public.events, 
    public.tasks, 
    public.second_brain, 
    public.realtime_debug;

-- 3. Ensure Replica Identity is FULL for all (just to be safe)
alter table public.events replica identity full;
alter table public.tasks replica identity full;
alter table public.second_brain replica identity full;
alter table public.realtime_debug replica identity full;

-- 4. Grant access to anon/authenticated (since we are testing from client)
grant all on public.realtime_debug to anon, authenticated, service_role;
