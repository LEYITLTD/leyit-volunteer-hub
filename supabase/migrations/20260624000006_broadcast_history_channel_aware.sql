drop function if exists broadcast_history();

create function broadcast_history()
returns table (
  id               uuid,
  subject          text,
  recipient_count  integer,
  scope            varchar,
  gender           varchar,
  channel          text,
  event_id         uuid,
  event_name       text,
  sent_at          timestamptz,
  stats            jsonb
)
language sql
security definer
as $$
  select
    bl.id,
    bl.subject,
    bl.recipient_count,
    bl.scope,
    bl.gender,
    bl.channel,
    bl.event_id,
    e.name as event_name,
    bl.sent_at,
    jsonb_build_object(
      'total',     count(br.id),
      'delivered', count(br.id) filter (where br.status in ('delivered','opened','clicked')),
      'opened',    count(br.id) filter (where br.status in ('opened','clicked')),
      'clicked',   count(br.id) filter (where br.status = 'clicked'),
      'bounced',   count(br.id) filter (where br.status = 'bounced'),
      'failed',    count(br.id) filter (where br.status in ('failed','invalid'))
    ) as stats
  from broadcast_logs bl
  left join events e on e.id = bl.event_id
  left join broadcast_recipients br on br.broadcast_id = bl.id
  group by bl.id, bl.subject, bl.recipient_count, bl.scope, bl.gender, bl.channel, bl.event_id, e.name, bl.sent_at
  order by bl.sent_at desc
  limit 50;
$$;

grant execute on function broadcast_history() to service_role, authenticated;
