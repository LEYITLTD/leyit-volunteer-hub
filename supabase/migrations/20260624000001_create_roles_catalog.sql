-- Global catalog of volunteer roles (name + explanation), managed in Settings.
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.roles enable row level security;

create policy "service role full access" on public.roles
  using (auth.role() = 'service_role');

create trigger roles_updated_at
  before update on public.roles
  for each row execute function set_updated_at();

-- Seed with the role names previously hardcoded in the new-event form.
insert into public.roles (name, description) values
  ('Welcome Team',      'Greet volunteers and guests as they arrive and help them find their way.'),
  ('Registration Team', 'Check volunteers in at the registration desk and scan their QR codes.'),
  ('Main Hall Team',    'Support the running of the main hall during the event.')
on conflict (name) do nothing;

-- Stable reference from an event role back to the catalog entry, so editing a
-- catalog description reflects live everywhere it is shown.
alter table public.event_roles
  add column role_catalog_id uuid references public.roles(id);
