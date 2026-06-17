-- ADR-008: Append-only. No UPDATE or DELETE policies.

create type points_type as enum (
  'early_bird', 'attendance', 'setup', 'packaging',
  'social_media', 'cleanup', 'manual_bonus', 'deduction'
);

create table points_transactions (
  id           uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references volunteers(id) on delete cascade,
  event_id     uuid references events(id),          -- null for manual awards
  check_in_id  uuid references check_ins(id),       -- null for non-scan awards
  type         points_type not null,
  amount       int not null,                        -- positive = award, negative = deduction
  earned_at    timestamptz not null default now(),
  description  text,                                -- required for manual_bonus / deduction
  awarded_by   uuid references admins(id),          -- null for auto-awarded

  constraint manual_requires_description check (
    type not in ('manual_bonus', 'deduction') or description is not null
  )
);

create index points_volunteer_idx on points_transactions (volunteer_id);
create index points_event_idx on points_transactions (event_id);

alter table points_transactions enable row level security;

-- Volunteers can see their own history
create policy "volunteer reads own points" on points_transactions
  for select using (
    volunteer_id = (
      select id from volunteers where auth_user_id = auth.uid()
    )
  );

-- No volunteer update/delete policies — append only
create policy "service role full access" on points_transactions
  using (auth.role() = 'service_role');

-- Helper view: current points balance per volunteer
create view volunteer_points_balance as
  select
    volunteer_id,
    coalesce(sum(amount), 0)::int as total_points
  from points_transactions
  group by volunteer_id;
