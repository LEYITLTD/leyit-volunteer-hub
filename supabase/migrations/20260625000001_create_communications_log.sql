-- Unified per-volunteer communications log: direct messages + system notifications.
-- Broadcasts stay in broadcast_recipients; the history view unions both.
create table public.communications (
  id                  uuid primary key default gen_random_uuid(),
  volunteer_id        uuid not null references public.volunteers(id) on delete cascade,
  channel             text not null,                       -- 'email' | 'sms'
  category            text not null default 'direct',      -- 'system' | 'direct'
  subject             text,                                -- null for sms
  body                text,
  status              text not null default 'sent',        -- sent | delivered | failed
  provider_message_id text,
  error_message       text,
  sent_by             uuid references public.admins(id),   -- null for system
  created_at          timestamptz not null default now()
);

create index communications_volunteer_idx on public.communications (volunteer_id, created_at desc);

alter table public.communications enable row level security;
create policy "service role full access" on public.communications
  using (auth.role() = 'service_role');
