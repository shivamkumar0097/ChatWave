-- ChatWave migration 17: status updates with views
-- Run this in the Supabase SQL Editor after schema16.sql.

create table if not exists public.statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'image')),
  text_content text,
  image_url text,
  background text not null default '#7c5cff',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists statuses_user_created_idx
  on public.statuses (user_id, created_at);

alter table public.statuses enable row level security;

drop policy if exists "Statuses are readable by authenticated users" on public.statuses;
create policy "Statuses are readable by authenticated users"
  on public.statuses for select to authenticated using (true);

drop policy if exists "Users can create their own status" on public.statuses;
create policy "Users can create their own status"
  on public.statuses for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own status" on public.statuses;
create policy "Users can delete their own status"
  on public.statuses for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.statuses to authenticated;

create table if not exists public.status_views (
  status_id uuid not null references public.statuses (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (status_id, viewer_id)
);

alter table public.status_views enable row level security;

drop policy if exists "Status owners can see views" on public.status_views;
create policy "Status owners can see views"
  on public.status_views for select to authenticated
  using (
    exists (select 1 from public.statuses s where s.id = status_id and s.user_id = auth.uid())
  );

drop policy if exists "Users can view statuses" on public.status_views;
create policy "Users can view statuses"
  on public.status_views for insert to authenticated
  with check (auth.uid() = viewer_id);

grant select, insert on public.status_views to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'status-images',
  'status-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "Status images are publicly readable" on storage.objects;
create policy "Status images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'status-images');

drop policy if exists "Users can upload status images" on storage.objects;
create policy "Users can upload status images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'status-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete their status images" on storage.objects;
create policy "Users can delete their status images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'status-images' and auth.uid()::text = (storage.foldername(name))[1]);

do $$
begin
  alter publication supabase_realtime add table public.statuses;
exception
  when duplicate_object then null;
end $$;
