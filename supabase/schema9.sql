-- ChatWave migration 9: group membership management + membership realtime
-- Run this in the Supabase SQL Editor after schema8.sql.

grant delete on public.conversation_members to authenticated;
grant delete on public.conversations to authenticated;

drop policy if exists "Creator can delete their group" on public.conversations;
create policy "Creator can delete their group"
  on public.conversations for delete to authenticated
  using (is_group and created_by = auth.uid());

drop policy if exists "Group members can add members" on public.conversation_members;
create policy "Group members can add members"
  on public.conversation_members for insert to authenticated
  with check (
    public.is_conversation_member(conversation_id)
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.is_group
    )
  );

drop policy if exists "Members can leave or creator can remove them" on public.conversation_members;
create policy "Members can leave or creator can remove them"
  on public.conversation_members for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.is_group
        and c.created_by = auth.uid()
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.conversation_members;
exception
  when duplicate_object then null;
end $$;
