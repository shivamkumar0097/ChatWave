-- ChatWave migration 6: reply threads, reactions and forwarded flag on messages

alter table public.messages add column if not exists reply_to uuid references public.messages (id) on delete set null;
alter table public.messages add column if not exists reactions jsonb not null default '{}'::jsonb;
alter table public.messages add column if not exists forwarded boolean not null default false;

create index if not exists messages_reply_to_idx on public.messages (reply_to);
