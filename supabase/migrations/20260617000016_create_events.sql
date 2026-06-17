-- Already applied to remote DB via initial scaffold.
-- This file tracks the schema locally for git history.

create type event_status       as enum ('draft','published','active','completed','cancelled');
create type station_type       as enum ('entry','setup','packaging','social_media','cleanup','general');
create type application_status as enum ('applied','confirmed','waitlisted','declined','no_show','cancelled');
create type check_in_station   as enum ('entry','exit','setup','packaging','social_media','cleanup');
create type points_type        as enum ('early_bird','attendance','setup','packaging','social_media','cleanup','manual_bonus','deduction');

create table events (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  description           text,
  venue_name            text,
  venue_address         text,
  event_start           timestamptz not null,
  event_end             timestamptz not null,
  doors_open            timestamptz,
  status                event_status not null default 'draft',
  early_bird_cutoff_days int not null default 14,
  created_by            uuid references admins(id),
  published_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table event_roles (
  id                   uuid primary key default gen_random_uuid(),
  event_id             uuid not null references events(id) on delete cascade,
  role_name            text not null,
  capacity             int not null default 1,
  station_type         station_type not null default 'general',
  station_window_start timestamptz,
  station_window_end   timestamptz,
  created_at           timestamptz not null default now()
);

create table event_applications (
  id               uuid primary key default gen_random_uuid(),
  volunteer_id     uuid not null references volunteers(id) on delete cascade,
  event_id         uuid not null references events(id) on delete cascade,
  role_id          uuid not null references event_roles(id) on delete cascade,
  status           application_status not null default 'applied',
  applied_at       timestamptz not null default now(),
  confirmed_at     timestamptz,
  qr_token         uuid unique default gen_random_uuid(),
  waitlist_position int,
  unique (volunteer_id, event_id, role_id)
);

create table check_ins (
  id                 uuid primary key default gen_random_uuid(),
  application_id     uuid not null references event_applications(id) on delete cascade,
  volunteer_id       uuid not null references volunteers(id),
  event_id           uuid not null references events(id),
  station            check_in_station not null,
  scanned_at         timestamptz not null default now(),
  within_time_window boolean not null default false,
  points_awarded     int not null default 0
);

create table points_transactions (
  id           uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references volunteers(id) on delete cascade,
  event_id     uuid references events(id),
  check_in_id  uuid references check_ins(id),
  type         points_type not null,
  amount       int not null,
  earned_at    timestamptz not null default now(),
  description  text,
  awarded_by   uuid references admins(id)
);
