/**
 * Wraps a TipTap HTML body fragment in a full email-compatible HTML document.
 * Provides inline-friendly styles so formatting survives email clients (incl. Gmail).
 */
export function wrapEmailHtml(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  /* Fallback for clients that support <style> in <head> */
  body { margin:0; padding:0; background:#f4f0e8; font-family:'Helvetica Neue',Arial,sans-serif; color:#1C1917; }
  table { border-spacing:0; }
  td { padding:0; }
  img { border:0; }
  p { margin:0 0 14px 0; }
  h1 { font-size:26px; font-weight:700; margin:0 0 16px 0; }
  h2 { font-size:20px; font-weight:700; margin:0 0 14px 0; }
  h3 { font-size:16px; font-weight:700; margin:0 0 12px 0; }
  ul, ol { margin:0 0 14px 0; padding-left:20px; }
  li { margin-bottom:6px; }
  a { color:#A8854A; text-decoration:underline; }
  blockquote { border-left:3px solid #D9D2C5; margin:0 0 14px 0; padding:8px 16px; color:#78716C; }
  hr { border:none; border-top:1px solid #EAE6DD; margin:20px 0; }
  strong { font-weight:700; }
  em { font-style:italic; }
  u { text-decoration:underline; }
  s { text-decoration:line-through; }
  code { font-family:monospace; background:#F3EFE6; padding:2px 5px; border-radius:3px; font-size:0.9em; }
  pre { background:#F3EFE6; padding:12px 16px; border-radius:6px; overflow:auto; }
</style>
</head>
<body style="margin:0;padding:0;background:#f4f0e8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:12px;border:1px solid #EAE6DD;">
          <!-- Header bar -->
          <tr>
            <td style="background:linear-gradient(135deg,#C9A227,#A8854A);border-radius:12px 12px 0 0;padding:20px 32px;">
              <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">Eman Channel</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px 32px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.7;color:#1C1917;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 28px 32px;border-top:1px solid #EAE6DD;">
              <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#A8A29E;line-height:1.5;">
                You're receiving this email because you're registered with Eman Channel VolunteerHub.<br>
                Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Replace template variables with actual values */
export function renderTemplate(html: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (out, [k, v]) => out.replaceAll(`{{${k}}}`, v),
    html,
  );
}
