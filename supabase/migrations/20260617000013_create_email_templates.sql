create table email_templates (
  key         text primary key,
  name        text not null,
  subject     text not null,
  body_html   text not null,
  updated_by  uuid references admins(id),
  updated_at  timestamptz not null default now()
);

alter table email_templates enable row level security;

create policy "service role full access" on email_templates
  using (auth.role() = 'service_role');

create trigger email_templates_updated_at
  before update on email_templates
  for each row execute function set_updated_at();

-- DBS document storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dbs-documents',
  'dbs-documents',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp']
);

create policy "service role manages dbs docs" on storage.objects
  for all to service_role
  using (bucket_id = 'dbs-documents')
  with check (bucket_id = 'dbs-documents');

insert into email_templates (key, name, subject, body_html) values
(
  'registration_dbs_uploaded',
  'Registration — DBS Uploaded',
  'We''ve received your application — DBS under review',
  $tpl$<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto;"><div style="background:#1A1714;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;"><span style="color:#A8854A;font-size:18px;font-weight:600;letter-spacing:0.08em;">VOLUNTEERHUB</span></div><div style="background:#F7F4EE;padding:36px 32px;border-radius:0 0 16px 16px;"><h2 style="margin:0 0 8px;font-size:22px;color:#1A1714;">Application received</h2><p style="margin:0 0 16px;color:#6B6259;font-size:15px;line-height:1.6;">Hi {{first_name}},</p><p style="margin:0 0 16px;color:#6B6259;font-size:15px;line-height:1.6;">Thank you for registering with VolunteerHub and uploading your DBS certificate. Our team is now reviewing your application — this typically takes <strong>2–5 working days</strong>.</p><p style="margin:0 0 28px;color:#6B6259;font-size:15px;line-height:1.6;">We'll be in touch as soon as your checks are complete. If you have any questions please reply to this email.</p><p style="color:#9E9690;font-size:13px;margin:0;line-height:1.5;">Light Upon Light Global · VolunteerHub</p></div></div>$tpl$
),
(
  'registration_dbs_required',
  'Registration — DBS Required',
  'Welcome to VolunteerHub — your DBS certificate is required',
  $tpl$<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto;"><div style="background:#1A1714;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;"><span style="color:#A8854A;font-size:18px;font-weight:600;letter-spacing:0.08em;">VOLUNTEERHUB</span></div><div style="background:#F7F4EE;padding:36px 32px;border-radius:0 0 16px 16px;"><h2 style="margin:0 0 8px;font-size:22px;color:#1A1714;">Action required</h2><p style="margin:0 0 16px;color:#6B6259;font-size:15px;line-height:1.6;">Hi {{first_name}},</p><p style="margin:0 0 16px;color:#6B6259;font-size:15px;line-height:1.6;">Thank you for registering with VolunteerHub! To complete your application we require a valid <strong>DBS certificate</strong>.</p><div style="background:#fff;border:2px solid #E5DDD3;border-radius:12px;padding:20px 24px;margin-bottom:24px;"><p style="margin:0;color:#1A1714;font-size:14px;line-height:1.6;">Please log in to your account and upload your DBS certificate from your profile page. You won't be able to sign up for events until we've received and verified it.</p></div><p style="color:#9E9690;font-size:13px;margin:0;line-height:1.5;">Light Upon Light Global · VolunteerHub</p></div></div>$tpl$
);
