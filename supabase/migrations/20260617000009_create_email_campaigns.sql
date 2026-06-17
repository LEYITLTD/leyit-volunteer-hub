create type campaign_status as enum ('draft', 'sent', 'partial_fail', 'failed');

create table email_campaigns (
  id               uuid primary key default gen_random_uuid(),
  created_by       uuid not null references admins(id),
  event_id         uuid references events(id),    -- null for general campaigns
  subject          text not null,
  body_html        text not null,
  attachment_urls  jsonb default '[]'::jsonb,    -- array of R2 signed URL metadata
  recipient_count  int not null default 0,
  sent_at          timestamptz,
  status           campaign_status not null default 'draft',
  resend_batch_id  text,
  created_at       timestamptz not null default now()
);

create index campaigns_event_idx on email_campaigns (event_id);

alter table email_campaigns enable row level security;

create policy "service role full access" on email_campaigns
  using (auth.role() = 'service_role');
