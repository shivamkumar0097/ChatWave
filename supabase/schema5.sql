-- ChatWave migration 5: image attachments in messages

alter table public.messages add column if not exists image_url text;

alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages
  add constraint messages_content_check
  check (char_length(content) > 0 or image_url is not null);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-images',
  'chat-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "Chat images are publicly readable" on storage.objects;
create policy "Chat images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'chat-images');

drop policy if exists "Users can upload chat images" on storage.objects;
create policy "Users can upload chat images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their chat images" on storage.objects;
create policy "Users can delete their chat images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
