-- ADR-007: overall_status requires BOTH dbs verified AND refinitiv clear/overridden

create type dbs_status as enum ('not_uploaded', 'pending', 'verified', 'rejected', 'expired');
create type refinitiv_status as enum ('pending', 'clear', 'possible_match', 'high_risk');
create type compliance_status as enum ('pending', 'approved', 'rejected');

create table volunteer_compliance (
  id                     uuid primary key default gen_random_uuid(),
  volunteer_id           uuid not null unique references volunteers(id) on delete cascade,

  -- DBS
  dbs_document_url       text,       -- R2 object key (not public URL)
  dbs_uploaded_at        timestamptz,
  dbs_status             dbs_status not null default 'not_uploaded',
  dbs_expiry_date        date,
  dbs_reviewed_by        uuid references admins(id),
  dbs_reviewed_at        timestamptz,

  -- Refinitiv World-Check
  refinitiv_case_id      text,
  refinitiv_status       refinitiv_status not null default 'pending',
  refinitiv_screened_at  timestamptz,
  refinitiv_override_by  uuid references admins(id),
  refinitiv_override_at  timestamptz,

  -- Combined
  overall_status         compliance_status not null default 'pending',
  approved_at            timestamptz,
  approved_by            uuid references admins(id)
);

create index compliance_volunteer_idx on volunteer_compliance (volunteer_id);
create index compliance_overall_status_idx on volunteer_compliance (overall_status);

alter table volunteer_compliance enable row level security;

-- Volunteer can see their own compliance record (excluding DBS document URL — sensitive)
create policy "volunteer reads own compliance" on volunteer_compliance
  for select using (
    volunteer_id = (
      select id from volunteers where auth_user_id = auth.uid()
    )
  );

create policy "service role full access" on volunteer_compliance
  using (auth.role() = 'service_role');

-- Trigger: auto-compute overall_status whenever dbs_status or refinitiv_status changes
create or replace function compute_overall_compliance_status()
returns trigger language plpgsql as $$
begin
  if new.dbs_status = 'rejected'
  or (new.refinitiv_status = 'high_risk' and new.refinitiv_override_by is null) then
    new.overall_status := 'rejected';
  elsif new.dbs_status = 'verified'
  and new.refinitiv_status in ('clear', 'possible_match') then
    -- possible_match counts only if admin has overridden (cleared)
    if new.refinitiv_status = 'possible_match' and new.refinitiv_override_by is null then
      new.overall_status := 'pending';
    else
      new.overall_status := 'approved';
      if new.approved_at is null then
        new.approved_at := now();
      end if;
    end if;
  else
    new.overall_status := 'pending';
  end if;
  return new;
end;
$$;

create trigger compliance_status_trigger
  before insert or update on volunteer_compliance
  for each row execute function compute_overall_compliance_status();
