create type checkin_station as enum ('entry', 'exit', 'setup', 'packaging', 'social_media', 'cleanup');

create table check_ins (
  id                 uuid primary key default gen_random_uuid(),
  application_id     uuid not null references event_applications(id),
  volunteer_id       uuid not null references volunteers(id),  -- denormalised for query speed
  event_id           uuid not null references events(id),       -- denormalised
  station            checkin_station not null,
  scanned_at         timestamptz not null default now(),
  within_time_window boolean not null,     -- false = scan logged but no points
  points_awarded     int not null default 0,

  -- Deduplication: one scan per station per volunteer per event
  unique (volunteer_id, event_id, station)
);

create index checkins_volunteer_event_idx on check_ins (volunteer_id, event_id);
create index checkins_event_idx on check_ins (event_id);

alter table check_ins enable row level security;

create policy "volunteer reads own checkins" on check_ins
  for select using (
    volunteer_id = (
      select id from volunteers where auth_user_id = auth.uid()
    )
  );

create policy "service role full access" on check_ins
  using (auth.role() = 'service_role');
