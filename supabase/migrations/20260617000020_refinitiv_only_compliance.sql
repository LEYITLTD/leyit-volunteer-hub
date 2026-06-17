-- ADR-008: DBS is now optional. overall_status is determined solely by Refinitiv.
create or replace function compute_overall_compliance_status()
returns trigger language plpgsql as $$
begin
  if new.refinitiv_status = 'high_risk' and new.refinitiv_override_by is null then
    new.overall_status := 'rejected';
  elsif new.refinitiv_status = 'clear'
    or (new.refinitiv_status = 'possible_match' and new.refinitiv_override_by is not null) then
    new.overall_status := 'approved';
    if new.approved_at is null then
      new.approved_at := now();
    end if;
  else
    new.overall_status := 'pending';
  end if;
  return new;
end;
$$;
