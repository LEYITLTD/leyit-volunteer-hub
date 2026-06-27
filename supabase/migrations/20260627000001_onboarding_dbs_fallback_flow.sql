-- Rework volunteer onboarding: DBS becomes the fallback when LSEG isn't clear.
-- 1) Rewrite the overall-status trigger to use the CURRENT columns
--    (lseg_status / dbs_status) — fixes the stale refinitiv_* references and
--    implements the DBS-as-fallback flow:
--      lseg clear                        -> approved
--      lseg not clear + dbs verified     -> approved
--      lseg not clear + dbs rejected     -> rejected
--      lseg not clear + dbs pending/none -> pending (awaiting / in DBS review)
--      lseg pending                      -> pending
create or replace function public.compute_overall_compliance_status()
returns trigger language plpgsql as $$
begin
  if new.lseg_status = 'clear' then
    new.overall_status := 'approved';
  elsif new.lseg_status in ('possible_match','high_risk') then
    if new.dbs_status = 'verified' then
      new.overall_status := 'approved';
    elsif new.dbs_status = 'rejected' then
      new.overall_status := 'rejected';
    else
      new.overall_status := 'pending';
    end if;
  else
    new.overall_status := 'pending';
  end if;

  if new.overall_status = 'approved' and new.approved_at is null then
    new.approved_at := now();
  end if;
  return new;
end;
$$;

-- 2) Refresh onboarding email copy (bodies are fragments; wrapEmailHtml adds the
--    branded shell). 24–48h timeframe; no "second chance" wording.

update public.email_templates set
  name = 'Registration — Confirmation',
  subject = 'We''ve received your volunteer application',
  body_html = '<h2>Application received</h2><p>Assalamu alaikum {{first_name}},</p><p>Thank you for registering with Eman Channel Volunteers. Our team is now reviewing your application — this usually takes <strong>24–48 hours</strong>.</p><p>We''ll email you as soon as your review is complete. You can log in in the meantime, but some features stay locked until you''re approved.</p><p>Jazakum Allahu khayran.</p>'
where key = 'registration_dbs_uploaded';

update public.email_templates set
  name = 'DBS — Required after checks',
  subject = 'Please verify your DBS to complete your application',
  body_html = '<h2>One more step to complete your application</h2><p>Assalamu alaikum {{first_name}},</p><p>Thank you for your patience while we review your application. To complete your volunteer registration, we now need to verify a <strong>DBS certificate</strong>.</p><p>Please log in to your account — you''ll be guided to upload your DBS certificate right from your home screen. Once we''ve reviewed it, we''ll confirm your status.</p><p>If you have any questions, reply to this email or contact us at admin@emanchannel.tv.</p><p>Jazakum Allahu khayran.</p>'
where key = 'registration_dbs_required';

update public.email_templates set
  subject = 'An update on your volunteer application',
  body_html = '<h2>An update on your application</h2><p>Assalamu alaikum {{first_name}},</p><p>Thank you for your interest in volunteering with Eman Channel and for taking the time to complete our checks.</p><p>Unfortunately, after careful review we are unable to offer you a volunteer position at this time.</p><p>We truly appreciate your willingness to give your time, and we''re sorry we couldn''t proceed on this occasion. If you believe this decision was made in error, please contact us at admin@emanchannel.tv.</p><p>Jazakum Allahu khayran.</p>'
where key = 'volunteer_rejected';

update public.email_templates set
  subject = 'You''re approved — welcome to the team!',
  body_html = '<h2>You''re approved 🎉</h2><p>Assalamu alaikum {{first_name}},</p><p>Great news — your volunteer application has been approved. You now have full access to your dashboard.</p><p>Log in to browse upcoming events, sign up for the ones you''d like to attend, and view your check-in QR code.</p><p>We''re delighted to have you on the team. Jazakum Allahu khayran for giving your time to serve the community.</p>'
where key = 'application_approved';
