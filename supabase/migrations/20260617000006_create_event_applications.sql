create type application_status as enum (
  'applied', 'confirmed', 'waitlisted', 'declined', 'no_show', 'cancelled'
);

create table event_applications (
  id                uuid primary key default gen_random_uuid(),
  volunteer_id      uuid not null references volunteers(id) on delete cascade,
  event_id          uuid not null references events(id) on delete cascade,
  role_id           uuid not null references event_roles(id),
  status            application_status not null default 'applied',
  applied_at        timestamptz not null default now(),
  confirmed_at      timestamptz,     -- used for early bird check
  qr_token          uuid not null unique default gen_random_uuid(),
  waitlist_position int,             -- null if not waitlisted

  unique (volunteer_id, event_id)   -- one application per volunteer per event
);

create index applications_volunteer_idx on event_applications (volunteer_id);
create index applications_event_idx on event_applications (event_id);
create index applications_qr_token_idx on event_applications (qr_token);

alter table event_applications enable row level security;

create policy "volunteer reads own applications" on event_applications
  for select using (
    volunteer_id = (
      select id from volunteers where auth_user_id = auth.uid()
    )
  );

create policy "volunteer inserts own application" on event_applications
  for insert with check (
    volunteer_id = (
      select id from volunteers where auth_user_id = auth.uid()
    )
    -- Only approved volunteers can apply
    and exists (
      select 1 from volunteer_compliance
      where volunteer_id = (
        select id from volunteers where auth_user_id = auth.uid()
      )
      and overall_status = 'approved'
    )
  );

create policy "volunteer cancels own application" on event_applications
  for update using (
    volunteer_id = (
      select id from volunteers where auth_user_id = auth.uid()
    )
    and status not in ('confirmed', 'no_show')
  );

create policy "service role full access" on event_applications
  using (auth.role() = 'service_role');
