-- Four-time model: volunteers arrive before / leave after the public event.
-- doors_open becomes the volunteer start (arrival) time; add a volunteer end time.
alter table public.events rename column doors_open to volunteer_start;
alter table public.events add column volunteer_end timestamptz;
