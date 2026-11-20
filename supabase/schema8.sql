-- ChatWave migration 8: message actions (edit/delete), reactions policy and attachments

alter table public.messages add column if not exists edited_at timestamptz;
alter table public.messages add column if not exists deleted_for_all boolean not null default false;
alter table public.messages add column if not exists file_url text;
alter table public.messages add column if not exists file_name text;
alter table public.messages add column if not exists file_type text;
alter table public.messages add column if not exists file_size bigint;

alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages
  add constraint messages_content_check
  check (
    deleted_for_all
    or char_length(content) > 0
    or image_url is not null
    or file_url is not null
  );

-- Members can update messages (needed for reactions); senders control edit/delete.
drop policy if exists "Members can update messages" on public.messages;
create policy "Members can update messages"
  on public.messages for update to authenticated
  using (public.is_conversation_member(conversation_id))
  with check (public.is_conversation_member(conversation_id));

drop policy if exists "Senders can delete messages" on public.messages;
create policy "Senders can delete messages"
  on public.messages for delete to authenticated
  using (sender_id = auth.uid());

grant update, delete on public.messages to authenticated;

-- Storage bucket for documents, audio and video
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-files',
  'chat-files',
  true,
  26214400,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/wav',
    'application/pdf', 'text/plain', 'application/zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

drop policy if exists "Chat files are publicly readable" on storage.objects;
create policy "Chat files are publicly readable"
  on storage.objects for select
  using (bucket_id = 'chat-files');

drop policy if exists "Users can upload chat files" on storage.objects;
create policy "Users can upload chat files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their chat files" on storage.objects;
create policy "Users can delete their chat files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
