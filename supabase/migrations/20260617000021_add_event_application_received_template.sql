insert into email_templates (key, name, subject, body_html) values (
  'event_application_received',
  'Event application received',
  'You''ve applied for {{event_name}}!',
  '<div style="font-family:''Helvetica Neue'',Arial,sans-serif;max-width:480px;margin:0 auto;">
  <div style="background:#1A1714;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;">
    <span style="color:#A8854A;font-size:18px;font-weight:600;letter-spacing:0.08em;">VOLUNTEERHUB</span>
  </div>
  <div style="background:#F7F4EE;padding:36px 32px;border-radius:0 0 16px 16px;">
    <h2 style="margin:0 0 8px;font-size:22px;color:#1A1714;">Application received</h2>
    <p style="margin:0 0 20px;color:#6B6259;font-size:15px;line-height:1.6;">Hi {{first_name}},</p>
    <p style="margin:0 0 20px;color:#6B6259;font-size:15px;line-height:1.6;">
      Thanks for applying — we''ve got your application for <strong style="color:#1A1714;">{{event_name}}</strong>.
    </p>
    <div style="background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:24px;border:1px solid #E8E2D9;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="color:#9E9690;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;padding:6px 0;width:90px;">Role</td>
          <td style="color:#1A1714;font-size:14px;font-weight:600;padding:6px 0;">{{role_name}}</td>
        </tr>
        <tr>
          <td style="color:#9E9690;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;padding:6px 0;">Date</td>
          <td style="color:#1A1714;font-size:14px;padding:6px 0;">{{event_date}}</td>
        </tr>
        <tr>
          <td style="color:#9E9690;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;padding:6px 0;">Time</td>
          <td style="color:#1A1714;font-size:14px;padding:6px 0;">{{event_time}}</td>
        </tr>
        <tr>
          <td style="color:#9E9690;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;padding:6px 0;">Location</td>
          <td style="color:#1A1714;font-size:14px;padding:6px 0;">{{city}}</td>
        </tr>
      </table>
    </div>
    <p style="margin:0 0 28px;color:#6B6259;font-size:15px;line-height:1.6;">{{status_note}}</p>
    <p style="color:#9E9690;font-size:13px;margin:0;line-height:1.5;">Light Upon Light Global · VolunteerHub</p>
  </div>
</div>'
) on conflict (key) do nothing;
