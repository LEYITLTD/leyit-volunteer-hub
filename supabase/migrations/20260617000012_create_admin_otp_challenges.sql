-- Temporary OTP challenges for admin 2-factor login.
-- Step 1 verifies password; step 2 verifies this OTP.
-- Service-role only — no volunteer or admin can query via client.

CREATE TABLE admin_otp_challenges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email   TEXT NOT NULL,
  auth_user_id  UUID NOT NULL,
  otp_hash      TEXT NOT NULL,      -- SHA-256 hex of the 6-digit code
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- One challenge per email; UPSERT replaces the old one
CREATE UNIQUE INDEX admin_otp_email_idx ON admin_otp_challenges (admin_email);

ALTER TABLE admin_otp_challenges ENABLE ROW LEVEL SECURITY;
-- No policies — service role bypasses RLS; no client access intended
