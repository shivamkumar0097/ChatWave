-- ChatWave migration 13: permission hardening and username uniqueness
-- Run this in the Supabase SQL Editor after schema12.sql.

revoke update on public.conversations from authenticated;
grant update (title, created_by, disappearing_timer) on public.conversations to authenticated;

drop policy if exists "Members can set disappearing messages" on public.conversations;

create or replace function public.set_disappearing_timer(p_conversation uuid, p_timer text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_conversation_member(p_conversation) then
    return false;
  end if;

  update public.conversations
     set disappearing_timer = case
       when p_timer in ('off', '24h', 'view_once') then p_timer
       else 'off'
     end
   where id = p_conversation;

  return true;
end;
$$;

revoke all on function public.set_disappearing_timer(uuid, text) from public;
grant execute on function public.set_disappearing_timer(uuid, text) to authenticated;

create or replace function public.guard_message_edits()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.sender_id <> auth.uid()
     and (
       new.content is distinct from old.content
       or new.deleted_for_all is distinct from old.deleted_for_all
       or new.image_url is distinct from old.image_url
       or new.file_url is distinct from old.file_url
       or new.edited_at is distinct from old.edited_at
     ) then
    raise exception 'Only the sender can edit or delete this message';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_message_edits on public.messages;
create trigger guard_message_edits
  before update on public.messages
  for each row execute function public.guard_message_edits();

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;
