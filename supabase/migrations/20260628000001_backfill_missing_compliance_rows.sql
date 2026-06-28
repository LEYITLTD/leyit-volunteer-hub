-- Some volunteers (older/test rows) were missing their volunteer_compliance row,
-- which made the LSEG/DBS approve routes' `.update(...).single()` fail with
-- "Cannot coerce the result to a single JSON object" (0 rows). Backfill them.
-- (The approve routes were also hardened to upsert so this can't recur.)
insert into public.volunteer_compliance (volunteer_id)
select v.id from public.volunteers v
where not exists (
  select 1 from public.volunteer_compliance c where c.volunteer_id = v.id
);
