CREATE TABLE broadcast_recipients (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id       uuid NOT NULL REFERENCES broadcast_logs(id) ON DELETE CASCADE,
  volunteer_id       uuid REFERENCES volunteers(id) ON DELETE SET NULL,
  email              text NOT NULL,
  first_name         text NOT NULL,
  last_name          text,
  resend_message_id  text UNIQUE,
  status             text NOT NULL DEFAULT 'sent',
  delivered_at       timestamptz,
  opened_at          timestamptz,
  clicked_at         timestamptz,
  bounced_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX broadcast_recipients_broadcast_id_idx ON broadcast_recipients(broadcast_id);
CREATE INDEX broadcast_recipients_resend_message_id_idx ON broadcast_recipients(resend_message_id);

ALTER TABLE broadcast_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;
