-- Gender on volunteers (required for role filtering and targeted emails)
do $$ begin
  create type volunteer_gender as enum ('male', 'female');
exception when duplicate_object then null;
end $$;

alter table volunteers add column if not exists gender volunteer_gender;

-- Gender restriction on event roles (male / female / any)
do $$ begin
  create type role_gender_restriction as enum ('male', 'female', 'any');
exception when duplicate_object then null;
end $$;

alter table event_roles add column if not exists gender_restriction role_gender_restriction not null default 'any';
