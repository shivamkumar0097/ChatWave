-- ChatWave migration 19: persisted call invites for background/push delivery
-- Run this in the Supabase SQL Editor after schema18.sql.

create table if not exists public.call_invites (
  id uuid primary key default gen_random_uuid(),
  call_id text not null unique,
  caller_id uuid not null references auth.users (id) on delete cascade,
  callee_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'ended')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 minutes')
);

create index if not exists call_invites_callee_idx
  on public.call_invites (callee_id, status);

alter table public.call_invites enable row level security;

drop policy if exists "Callers can create call invites" on public.call_invites;
create policy "Callers can create call invites"
  on public.call_invites for insert to authenticated
  with check (auth.uid() = caller_id);

drop policy if exists "Participants can read call invites" on public.call_invites;
create policy "Participants can read call invites"
  on public.call_invites for select to authenticated
  using (auth.uid() = caller_id or auth.uid() = callee_id);

drop policy if exists "Participants can update call invites" on public.call_invites;
create policy "Participants can update call invites"
  on public.call_invites for update to authenticated
  using (auth.uid() = caller_id or auth.uid() = callee_id)
  with check (auth.uid() = caller_id or auth.uid() = callee_id);

drop policy if exists "Participants can delete call invites" on public.call_invites;
create policy "Participants can delete call invites"
  on public.call_invites for delete to authenticated
  using (auth.uid() = caller_id or auth.uid() = callee_id);

grant select, insert, update, delete on public.call_invites to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'call_invites'
  ) then
    execute 'alter publication supabase_realtime add table public.call_invites';
  end if;
end $$;
