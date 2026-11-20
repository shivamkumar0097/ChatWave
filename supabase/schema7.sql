-- ChatWave migration 7: profile bio / about text

alter table public.profiles add column if not exists bio text;
