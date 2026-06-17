-- ADR-002: All primary keys are UUIDs. RLS enabled on all tables.

create type admin_role as enum ('super_admin', 'admin', 'coordinator');

create table admins (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  email       text not null unique,
  role        admin_role not null default 'admin',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  last_login  timestamptz
);

alter table admins enable row level security;

-- Only service-role can manage admins
create policy "service role only" on admins
  using (auth.role() = 'service_role');
