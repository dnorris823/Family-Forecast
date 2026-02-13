-- Enable pgvector extension for embeddings (Safe to run if exists)
create extension if not exists vector;

-- Create Second Brain table if it doesn't exist
create table if not exists public.second_brain (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(768), 
  tags text[],
  is_shared boolean default false,
  user_id uuid references public.profiles(id) not null,
  family_id uuid references public.family_groups(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Prepare RLS (We use a DO block to safely enable RLS)
do $$
begin
  if not exists (
    select 1 from pg_class where relname = 'second_brain' and relrowsecurity = true
  ) then
    alter table public.second_brain enable row level security;
  end if;
end $$;

-- Policies for Second Brain (Drop policies if they exist before creating, to update/ensure correctness)
drop policy if exists "Users can view own notes or shared family notes" on second_brain;
create policy "Users can view own notes or shared family notes"
  on second_brain for select
  using ( 
    user_id = auth.uid() OR 
    (family_id = (select family_id from profiles where id = auth.uid()) AND is_shared = true)
  );

drop policy if exists "Users can insert own notes" on second_brain;
create policy "Users can insert own notes"
  on second_brain for insert
  with check ( user_id = auth.uid() );

drop policy if exists "Users can update own notes" on second_brain;
create policy "Users can update own notes"
  on second_brain for update
  using ( user_id = auth.uid() );

drop policy if exists "Users can delete own notes" on second_brain;
create policy "Users can delete own notes"
  on second_brain for delete
  using ( user_id = auth.uid() );


-- Vector Search Function (Safe to replace)
create or replace function match_second_brain (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_family_id uuid,
  filter_user_id uuid
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    second_brain.id,
    second_brain.content,
    1 - (second_brain.embedding <=> query_embedding) as similarity
  from second_brain
  where 1 - (second_brain.embedding <=> query_embedding) > match_threshold
  and (
      (second_brain.family_id = filter_family_id and second_brain.is_shared = true)
      OR
      second_brain.user_id = filter_user_id
  )
  order by second_brain.embedding <=> query_embedding
  limit match_count;
end;
$$;
