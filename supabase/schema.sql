-- Enable pgvector extension for embeddings
create extension if not exists vector;

-- Create Family Groups table
create table public.family_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  full_name text,
  avatar_url text,
  family_id uuid references public.family_groups(id) on delete set null,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(username) >= 3)
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.family_groups enable row level security;

-- Policies for Profiles
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Policies for Family Groups
-- (Simplified for now: allow authenticated users to view/join)
create policy "Family groups viewable by authenticated users"
  on family_groups for select
  to authenticated
  using ( true );

create policy "Authenticated users can create family groups"
  on family_groups for insert
  to authenticated
  with check ( true );

-- Create Events table (Calendar)
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  is_all_day boolean default false,
  location text,
  family_id uuid references public.family_groups(id) not null,
  created_by uuid references public.profiles(id) not null,
  is_private boolean default false, -- If true, only created_by can see details
  recurrence_rule text, -- RRULE string for recurring events
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.events enable row level security;

-- Events Policies
create policy "Users can view events in their family"
  on events for select
  using ( 
    auth.uid() = created_by OR 
    (family_id = (select family_id from profiles where id = auth.uid()) AND is_private = false)
  );

create policy "Users can create events for their family"
  on events for insert
  with check ( 
    family_id = (select family_id from profiles where id = auth.uid()) 
  );

create policy "Users can update their own events"
  on events for update
  using ( created_by = auth.uid() );

create policy "Users can delete their own events"
  on events for delete
  using ( created_by = auth.uid() );

-- Create Tasks table
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date timestamp with time zone,
  assignee_id uuid references public.profiles(id),
  family_id uuid references public.family_groups(id) not null,
  created_by uuid references public.profiles(id) not null,
  is_private boolean default false,
  recurrence_rule text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tasks enable row level security;

-- Tasks Policies (Similar to Events)
create policy "Users can view tasks in their family"
  on tasks for select
  using ( 
    auth.uid() = created_by OR 
    assignee_id = auth.uid() OR
    (family_id = (select family_id from profiles where id = auth.uid()) AND is_private = false)
  );

create policy "Users can create tasks for their family"
  on tasks for insert
  with check ( 
    family_id = (select family_id from profiles where id = auth.uid())
  );

create policy "Users can update tasks in their family"
  on tasks for update
  using ( 
     auth.uid() = created_by OR 
     assignee_id = auth.uid() OR
     family_id = (select family_id from profiles where id = auth.uid())
  );

-- Create Second Brain table
create table public.second_brain (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(768), -- Dimension depends on model, 768 is common for nomic-embed-text
  tags text[],
  is_shared boolean default false,
  user_id uuid references public.profiles(id) not null,
  family_id uuid references public.family_groups(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.second_brain enable row level security;

-- Second Brain Policies
create policy "Users can view own notes or shared family notes"
  on second_brain for select
  using ( 
    user_id = auth.uid() OR 
    (family_id = (select family_id from profiles where id = auth.uid()) AND is_shared = true)
  );

create policy "Users can insert own notes"
  on second_brain for insert
  with check ( user_id = auth.uid() );

create policy "Users can update own notes"
  on second_brain for update
  using ( user_id = auth.uid() );

create policy "Users can delete own notes"
  on second_brain for delete
  using ( user_id = auth.uid() );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Vector Search Function
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
