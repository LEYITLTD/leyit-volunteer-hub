insert into email_templates (key, name, subject, body_html) values
(
  'dbs_rejected',
  'DBS — Rejected',
  'An update on your VolunteerHub application',
  $tpl$<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto;"><div style="background:#1A1714;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;"><span style="color:#A8854A;font-size:18px;font-weight:600;letter-spacing:0.08em;">VOLUNTEERHUB</span></div><div style="background:#F7F4EE;padding:36px 32px;border-radius:0 0 16px 16px;"><h2 style="margin:0 0 8px;font-size:22px;color:#1A1714;">DBS certificate update</h2><p style="margin:0 0 16px;color:#6B6259;font-size:15px;line-height:1.6;">Hi {{first_name}},</p><p style="margin:0 0 16px;color:#6B6259;font-size:15px;line-height:1.6;">Unfortunately we were unable to accept your DBS certificate for the following reason:</p><div style="background:#fff;border:2px solid #E5DDD3;border-radius:12px;padding:20px 24px;margin-bottom:24px;"><p style="margin:0;color:#1A1714;font-size:14px;line-height:1.6;">{{reason}}</p></div><p style="margin:0 0 28px;color:#6B6259;font-size:15px;line-height:1.6;">If you have a valid DBS certificate you'd like to resubmit, please log in and upload the correct document. Reply to this email if you need help.</p><p style="color:#9E9690;font-size:13px;margin:0;line-height:1.5;">Light Upon Light Global · VolunteerHub</p></div></div>$tpl$
),
(
  'application_approved',
  'Application — Approved',
  'You''re approved — welcome to the VolunteerHub team!',
  $tpl$<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto;"><div style="background:#1A1714;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;"><span style="color:#A8854A;font-size:18px;font-weight:600;letter-spacing:0.08em;">VOLUNTEERHUB</span></div><div style="background:#F7F4EE;padding:36px 32px;border-radius:0 0 16px 16px;"><h2 style="margin:0 0 8px;font-size:22px;color:#1A1714;">You're approved!</h2><p style="margin:0 0 16px;color:#6B6259;font-size:15px;line-height:1.6;">Hi {{first_name}},</p><p style="margin:0 0 16px;color:#6B6259;font-size:15px;line-height:1.6;">Great news — your DBS check and background checks have both cleared. Your application is fully approved and you can now sign up for events.</p><p style="margin:0 0 28px;color:#6B6259;font-size:15px;line-height:1.6;">Log in to your account to browse upcoming events. We're thrilled to have you on board.</p><p style="color:#9E9690;font-size:13px;margin:0;line-height:1.5;">Light Upon Light Global · VolunteerHub</p></div></div>$tpl$
);
