-- 1. Ensure the handle_new_user function is correct (same as before)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_family_id uuid;
  user_name text;
begin
  user_name := coalesce(new.raw_user_meta_data->>'full_name', 'My Family');
  
  -- Create a new family group
  insert into public.family_groups (name)
  values (user_name || '''s Family')
  returning id into new_family_id;

  -- Insert profile with family_id
  insert into public.profiles (id, full_name, avatar_url, family_id)
  values (
    new.id, 
    user_name, 
    new.raw_user_meta_data->>'avatar_url',
    new_family_id
  );
  return new;
end;
$$ language plpgsql security definer;

-- 2. Backfill: Ensure all Auth Users have a Profile
-- Note: We need to check auth.users. 
-- If you run this in Table Editor -> SQL, it usually works. 
-- If 'auth' schema is restricted, this part might fail, but let's try.
do $$
declare
  user_rec record;
begin
  for user_rec in select * from auth.users loop
    if not exists (select 1 from public.profiles where id = user_rec.id) then
       insert into public.profiles (id, full_name, avatar_url)
       values (
         user_rec.id, 
         coalesce(user_rec.raw_user_meta_data->>'full_name', 'User'), 
         user_rec.raw_user_meta_data->>'avatar_url'
       );
    end if;
  end loop;
end;
$$;

-- 3. Backfill: Ensure all Profiles have a Family
do $$
declare
  ro record;
  new_fam_id uuid;
begin
  for ro in select * from public.profiles where family_id is null loop
    -- Create Family
    insert into public.family_groups (name)
    values (coalesce(ro.full_name, 'My') || '''s Family')
    returning id into new_fam_id;

    -- Update Profile
    update public.profiles
    set family_id = new_fam_id
    where id = ro.id;
  end loop;
end;
$$;
