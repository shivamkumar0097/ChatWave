-- ChatWave migration 16: block or unblock other users
-- Run this in the Supabase SQL Editor after schema13.sql.

create table if not exists public.blocked_users (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

alter table public.blocked_users enable row level security;

drop policy if exists "Users can see their blocks" on public.blocked_users;
create policy "Users can see their blocks"
  on public.blocked_users for select to authenticated
  using (auth.uid() = blocker_id);

drop policy if exists "Users can block others" on public.blocked_users;
create policy "Users can block others"
  on public.blocked_users for insert to authenticated
  with check (auth.uid() = blocker_id);

drop policy if exists "Users can unblock others" on public.blocked_users;
create policy "Users can unblock others"
  on public.blocked_users for delete to authenticated
  using (auth.uid() = blocker_id);

grant select, insert, delete on public.blocked_users to authenticated;
