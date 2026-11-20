-- ChatWave migration 10: group rename, admin transfer and conversation realtime
-- Run this in the Supabase SQL Editor after schema9.sql.

grant update on public.conversations to authenticated;

drop policy if exists "Creator can update their group" on public.conversations;
create policy "Creator can update their group"
  on public.conversations for update to authenticated
  using (is_group and created_by = auth.uid())
  with check (
    is_group
    and exists (
      select 1 from public.conversation_members m
      where m.conversation_id = conversations.id and m.user_id = auth.uid()
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception
  when duplicate_object then null;
end $$;
