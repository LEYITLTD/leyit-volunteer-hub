create table volunteers (
  id                       uuid primary key default gen_random_uuid(),
  auth_user_id             uuid unique references auth.users(id) on delete set null,
  first_name               text not null,
  last_name                text not null,
  email                    text not null unique,
  phone                    text not null,
  address                  text not null,
  date_of_birth            date not null,
  nationality              text not null default 'GB',
  emergency_contact_name   text not null,
  emergency_contact_phone  text not null,
  dietary_requirements     text,
  medical_info             text, -- admin-visible only; RLS prevents volunteer read
  age_verified             boolean not null default false,
  is_active                boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index volunteers_email_idx on volunteers (email);
create index volunteers_auth_user_idx on volunteers (auth_user_id);

alter table volunteers enable row level security;

-- Volunteers can read and update their own row (except medical_info)
create policy "volunteer reads own record" on volunteers
  for select using (auth_user_id = auth.uid());

create policy "volunteer updates own record" on volunteers
  for update using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Admins (service role) can read all, including medical_info
create policy "service role full access" on volunteers
  using (auth.role() = 'service_role');

-- Keep updated_at current
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger volunteers_updated_at
  before update on volunteers
  for each row execute function set_updated_at();
