create type reward_tier as enum ('certificate', 'silver_badge', 'gold_badge');
create type redemption_status as enum ('pending', 'issued');

create table reward_redemptions (
  id                   uuid primary key default gen_random_uuid(),
  volunteer_id         uuid not null references volunteers(id) on delete cascade,
  reward_tier          reward_tier not null,
  points_at_redemption int not null,
  issued_by            uuid not null references admins(id),
  notes                text,
  status               redemption_status not null default 'pending',
  redeemed_at          timestamptz,
  created_at           timestamptz not null default now()
);

create index redemptions_volunteer_idx on reward_redemptions (volunteer_id);

alter table reward_redemptions enable row level security;

create policy "volunteer reads own redemptions" on reward_redemptions
  for select using (
    volunteer_id = (
      select id from volunteers where auth_user_id = auth.uid()
    )
  );

create policy "service role full access" on reward_redemptions
  using (auth.role() = 'service_role');
