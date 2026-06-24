-- Multi-channel broadcasts (email + sms). broadcast_logs already exists in the DB
-- (its create migration predates the repo), so add columns defensively.
alter table public.broadcast_logs  add column if not exists channel   text not null default 'email';
alter table public.broadcast_logs  add column if not exists sender_id text;

alter table public.broadcast_recipients add column if not exists channel         text not null default 'email';
alter table public.broadcast_recipients add column if not exists phone           text;
alter table public.broadcast_recipients add column if not exists sms_message_id  text;
alter table public.broadcast_recipients add column if not exists failed_at       timestamptz;
alter table public.broadcast_recipients add column if not exists error_message   text;

create unique index if not exists broadcast_recipients_sms_message_id_idx
  on public.broadcast_recipients (sms_message_id) where sms_message_id is not null;

-- Singleton SMS config (sender ID), admin-editable. Voodoo caps sender IDs at
-- 3-11 alphanumeric chars, so "LULVolunteers" (13) won't fit — seed "LULVols".
create table if not exists public.sms_config (
  id          boolean primary key default true,
  sender_id   text not null default 'LULVols',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.admins(id),
  constraint sms_config_singleton check (id = true)
);
insert into public.sms_config (id) values (true) on conflict (id) do nothing;

alter table public.sms_config enable row level security;
do $$ begin
  create policy "service role full access" on public.sms_config using (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

create trigger sms_config_updated_at
  before update on public.sms_config
  for each row execute function set_updated_at();
