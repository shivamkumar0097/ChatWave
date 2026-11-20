-- ChatWave migration 3: prevent duplicate direct chats + clean existing ones

create or replace function public.start_direct_chat(other_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing uuid;
  conv uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if other_id = uid then
    raise exception 'cannot chat with yourself';
  end if;

  select c.id into existing
  from public.conversations c
  join public.conversation_members m1
    on m1.conversation_id = c.id and m1.user_id = uid
  join public.conversation_members m2
    on m2.conversation_id = c.id and m2.user_id = other_id
  where c.is_group = false
    and (
      select count(*)
      from public.conversation_members m
      where m.conversation_id = c.id
    ) = 2
  order by c.created_at asc
  limit 1;

  if existing is not null then
    return existing;
  end if;

  insert into public.conversations (created_by)
  values (uid)
  returning id into conv;

  insert into public.conversation_members (conversation_id, user_id)
  values (conv, uid), (conv, other_id);

  return conv;
end;
$$;

revoke all on function public.start_direct_chat(uuid) from public;
grant execute on function public.start_direct_chat(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.conversation_members;
exception
  when duplicate_object then null;
end $$;

alter table public.conversation_members replica identity full;

-- Delete duplicate direct conversations, keeping the one with the most messages
with direct as (
  select
    c.id,
    c.created_at,
    min(m.user_id::text) || ':' || max(m.user_id::text) as pair,
    (select count(*) from public.messages msg where msg.conversation_id = c.id) as msg_count
  from public.conversations c
  join public.conversation_members m on m.conversation_id = c.id
  where c.is_group = false
  group by c.id
  having count(*) = 2
),
ranked as (
  select
    id,
    row_number() over (
      partition by pair
      order by msg_count desc, created_at asc
    ) as rn
  from direct
)
delete from public.conversations
where id in (select id from ranked where rn > 1);
