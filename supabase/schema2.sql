-- ChatWave migration 2: online + typing + read receipts + unread counts
-- Run this in the Supabase SQL Editor.

create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_reads enable row level security;

drop policy if exists "Members can view reads" on public.conversation_reads;
create policy "Members can view reads"
  on public.conversation_reads for select
  using (public.is_conversation_member(conversation_id));

drop policy if exists "Users can insert own read" on public.conversation_reads;
create policy "Users can insert own read"
  on public.conversation_reads for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

drop policy if exists "Users can update own read" on public.conversation_reads;
create policy "Users can update own read"
  on public.conversation_reads for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.conversation_reads to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.conversation_reads;
exception
  when duplicate_object then null;
end $$;

alter table public.conversation_reads replica identity full;
