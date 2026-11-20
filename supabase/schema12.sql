-- ChatWave migration 12: usernames for accounts and username search
-- Run this in the Supabase SQL Editor after schema11.sql.

alter table public.profiles add column if not exists username text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    nullif(lower(coalesce(new.raw_user_meta_data ->> 'username', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
