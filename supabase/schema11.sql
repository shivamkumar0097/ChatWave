-- ChatWave migration 11: disappearing messages (24 hours / after viewing)
-- Run this in the Supabase SQL Editor after schema10.sql.

alter table public.conversations
  add column if not exists disappearing_timer text not null default 'off';

alter table public.messages
  add column if not exists expires_at timestamptz,
  add column if not exists view_once boolean not null default false,
  add column if not exists viewed_by jsonb not null default '{}'::jsonb;

create index if not exists messages_expires_at_idx
  on public.messages (expires_at)
  where expires_at is not null;

drop policy if exists "Members can set disappearing messages" on public.conversations;
create policy "Members can set disappearing messages"
  on public.conversations for update to authenticated
  using (public.is_conversation_member(id))
  with check (public.is_conversation_member(id));
