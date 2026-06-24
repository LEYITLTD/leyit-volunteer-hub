-- Configurable points engine: a single-row config of point values + grace window,
-- and an editable tier ladder. Both are admin-editable via a future Settings UI.

create table public.points_config (
  id                      boolean primary key default true,
  check_in_points         int not null default 50,
  check_in_late_points    int not null default 25,
  check_out_points        int not null default 50,
  check_out_early_points  int not null default 25,
  grace_minutes           int not null default 10,
  updated_at              timestamptz not null default now(),
  updated_by              uuid references admins(id),
  constraint points_config_singleton check (id = true)
);

insert into public.points_config (id) values (true);

alter table public.points_config enable row level security;
create policy "service role full access" on public.points_config
  using (auth.role() = 'service_role');
create trigger points_config_updated_at
  before update on public.points_config
  for each row execute function set_updated_at();

create table public.points_tiers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  min_points  int not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

insert into public.points_tiers (name, min_points, sort_order) values
  ('Bronze',   0,    1),
  ('Silver',   300,  2),
  ('Gold',     800,  3),
  ('Platinum', 1500, 4);

alter table public.points_tiers enable row level security;
create policy "service role full access" on public.points_tiers
  using (auth.role() = 'service_role');
