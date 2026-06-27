-- Require email verification before a volunteer can log in.
-- Grandfather all existing volunteers so no one is locked out; new signups default false.
alter table public.volunteers add column if not exists email_verified boolean not null default false;
update public.volunteers set email_verified = true where email_verified = false;

-- One row per volunteer ⇒ only the latest link is valid (resend overwrites).
-- Counters drive a 60s cooldown + a 5-per-24h cap on resends.
create table public.email_verifications (
  volunteer_id uuid primary key references public.volunteers(id) on delete cascade,
  token_hash   text not null,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  sent_count   int not null default 1,
  window_start timestamptz not null default now()
);
create unique index email_verifications_token_idx on public.email_verifications(token_hash);

alter table public.email_verifications enable row level security;
-- No policies: service role only.

-- Editable verification email template (appears in the Email Templates admin page).
insert into public.email_templates (key, name, subject, body_html) values (
  'email_verification',
  'Registration — Verify email',
  'Verify your email to finish signing up',
  '<h2>Verify your email</h2><p>Assalamu alaikum {{first_name}},</p><p>Thanks for registering with Eman Channel Volunteers. Please confirm your email address to finish creating your account — this link is valid for <strong>1 hour</strong>.</p><p><a href="{{verify_url}}" style="display:inline-block;background:#A8854A;color:#1A1714;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;">Verify my email</a></p><p style="font-size:13px;color:#78716C;">If the button doesn''t work, copy and paste this link into your browser:<br>{{verify_url}}</p><p style="font-size:13px;color:#78716C;">If you didn''t create an account, you can safely ignore this email.</p>'
)
on conflict (key) do nothing;
