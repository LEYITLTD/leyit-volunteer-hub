CREATE OR REPLACE FUNCTION broadcast_history()
RETURNS TABLE (
  id               uuid,
  subject          text,
  recipient_count  integer,
  scope            varchar,
  gender           varchar,
  event_id         uuid,
  event_name       text,
  sent_at          timestamptz,
  stats            jsonb
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    bl.id,
    bl.subject,
    bl.recipient_count,
    bl.scope,
    bl.gender,
    bl.event_id,
    e.name AS event_name,
    bl.sent_at,
    jsonb_build_object(
      'total',     COUNT(br.id),
      'delivered', COUNT(br.id) FILTER (WHERE br.status IN ('delivered','opened','clicked')),
      'opened',    COUNT(br.id) FILTER (WHERE br.status IN ('opened','clicked')),
      'clicked',   COUNT(br.id) FILTER (WHERE br.status = 'clicked'),
      'bounced',   COUNT(br.id) FILTER (WHERE br.status = 'bounced')
    ) AS stats
  FROM broadcast_logs bl
  LEFT JOIN events e ON e.id = bl.event_id
  LEFT JOIN broadcast_recipients br ON br.broadcast_id = bl.id
  GROUP BY bl.id, bl.subject, bl.recipient_count, bl.scope, bl.gender, bl.event_id, e.name, bl.sent_at
  ORDER BY bl.sent_at DESC
  LIMIT 50;
$$;
