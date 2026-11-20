-- ChatWave migration 15: 24-hour stories/status with views
-- Run this in the Supabase SQL Editor after schema13.sql.

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'image')),
  text_content text,
  image_url text,
  background text not null default '#7c5cff',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists stories_user_created_idx
  on public.stories (user_id, created_at);

alter table public.stories enable row level security;

drop policy if exists "Stories are readable by authenticated users" on public.stories;
create policy "Stories are readable by authenticated users"
  on public.stories for select to authenticated using (true);

drop policy if exists "Users can create their own stories" on public.stories;
create policy "Users can create their own stories"
  on public.stories for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own stories" on public.stories;
create policy "Users can delete their own stories"
  on public.stories for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.stories to authenticated;

create table if not exists public.story_views (
  story_id uuid not null references public.stories (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

alter table public.story_views enable row level security;

drop policy if exists "Story owners can see views" on public.story_views;
create policy "Story owners can see views"
  on public.story_views for select to authenticated
  using (
    exists (
      select 1 from public.stories s
      where s.id = story_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "Users can mark stories as viewed" on public.story_views;
create policy "Users can mark stories as viewed"
  on public.story_views for insert to authenticated
  with check (auth.uid() = viewer_id);

grant select, insert on public.story_views to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'story-images',
  'story-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "Story images are publicly readable" on storage.objects;
create policy "Story images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'story-images');

drop policy if exists "Users can upload story images" on storage.objects;
create policy "Users can upload story images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'story-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete their story images" on storage.objects;
create policy "Users can delete their story images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'story-images' and auth.uid()::text = (storage.foldername(name))[1]);

do $$
begin
  alter publication supabase_realtime add table public.stories;
exception
  when duplicate_object then null;
end $$;
