create type station_type as enum ('entry', 'setup', 'packaging', 'social_media', 'cleanup', 'general');

create table event_roles (
  id                    uuid primary key default gen_random_uuid(),
  event_id              uuid not null references events(id) on delete cascade,
  role_name             text not null,
  capacity              int not null check (capacity > 0),
  station_type          station_type not null default 'general',
  station_window_start  timestamptz,  -- bonus QR valid from
  station_window_end    timestamptz,  -- bonus QR valid until
  created_at            timestamptz not null default now()
);

create index event_roles_event_idx on event_roles (event_id);

alter table event_roles enable row level security;

create policy "approved volunteers read roles for published events" on event_roles
  for select using (
    exists (
      select 1 from events e where e.id = event_id
      and e.status in ('published', 'active', 'completed')
    )
    and exists (
      select 1 from volunteer_compliance vc
      join volunteers v on v.id = vc.volunteer_id
      where v.auth_user_id = auth.uid()
      and vc.overall_status = 'approved'
    )
  );

create policy "service role full access" on event_roles
  using (auth.role() = 'service_role');
