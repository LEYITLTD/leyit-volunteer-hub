-- ADR-008: Append-only audit trail. No UPDATE or DELETE policies.

create type actor_type as enum ('admin', 'volunteer', 'system');

create table activity_log (
  id           uuid primary key default gen_random_uuid(),
  actor_type   actor_type not null,
  actor_id     uuid,                          -- ID of admin/volunteer/system
  event_id     uuid references events(id),    -- nullable
  volunteer_id uuid references volunteers(id), -- nullable
  action_type  text not null,                 -- e.g. 'dbs_approved', 'event_published'
  description  text not null,
  metadata     jsonb default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index activity_log_actor_idx on activity_log (actor_id);
create index activity_log_volunteer_idx on activity_log (volunteer_id);
create index activity_log_event_idx on activity_log (event_id);
create index activity_log_created_at_idx on activity_log (created_at desc);

alter table activity_log enable row level security;

-- Append only — no update/delete for anyone
create policy "service role insert and select" on activity_log
  using (auth.role() = 'service_role');
