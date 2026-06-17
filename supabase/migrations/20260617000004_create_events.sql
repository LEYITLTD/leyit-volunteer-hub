create type event_status as enum ('draft', 'published', 'active', 'completed', 'cancelled');

create table events (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  description             text,
  venue_name              text,
  venue_address           text,
  event_start             timestamptz not null,
  event_end               timestamptz not null,
  doors_open              timestamptz,
  status                  event_status not null default 'draft',
  early_bird_cutoff_days  int not null default 14,
  created_by              uuid not null references admins(id),
  published_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint event_end_after_start check (event_end > event_start)
);

create index events_status_idx on events (status);
create index events_event_start_idx on events (event_start);

alter table events enable row level security;

-- Approved volunteers can read published/active/completed events
create policy "approved volunteers read published events" on events
  for select using (
    status in ('published', 'active', 'completed')
    and exists (
      select 1 from volunteer_compliance vc
      join volunteers v on v.id = vc.volunteer_id
      where v.auth_user_id = auth.uid()
      and vc.overall_status = 'approved'
    )
  );

create policy "service role full access" on events
  using (auth.role() = 'service_role');

create trigger events_updated_at
  before update on events
  for each row execute function set_updated_at();
