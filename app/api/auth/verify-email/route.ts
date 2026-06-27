import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";
import { wrapEmailHtml, renderTemplate } from "@/lib/email-wrapper";
import { logCommunication } from "@/lib/communications";
import { hashToken } from "@/lib/verification";

// Confirm a volunteer's email from the link token. The token IS the credential,
// so no session is required. Single-use: the row is deleted on success.
export async function POST(request: Request) {
  const { token } = await request.json() as { token?: string };
  if (!token) return NextResponse.json({ status: "invalid" });

  const service = createServiceClient();

  const { data: row } = await service
    .from("email_verifications")
    .select("volunteer_id, expires_at, volunteers ( email, first_name, email_verified )")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!row) return NextResponse.json({ status: "invalid" });

  const volunteer = Array.isArray(row.volunteers) ? row.volunteers[0] : row.volunteers as
    { email: string; first_name: string; email_verified: boolean } | null;

  // Expired → tell the page (with the email) so it can offer a resend.
  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ status: "expired", email: volunteer?.email ?? null });
  }

  // Already verified (e.g. link clicked twice) — treat as success, clean up.
  if (volunteer?.email_verified) {
    await service.from("email_verifications").delete().eq("volunteer_id", row.volunteer_id);
    return NextResponse.json({ status: "verified" });
  }

  await service.from("volunteers").update({ email_verified: true }).eq("id", row.volunteer_id);
  await service.from("email_verifications").delete().eq("volunteer_id", row.volunteer_id);

  // Now that the address is confirmed, send the "application received" email.
  if (volunteer) {
    try {
      const { data: tpl } = await service
        .from("email_templates")
        .select("subject, body_html")
        .eq("key", "registration_dbs_uploaded")
        .single();
      if (tpl) {
        const vars = { first_name: volunteer.first_name };
        const resend = new Resend(process.env.RESEND_API_KEY);
        const sent = await resend.emails.send({
          from:    process.env.RESEND_FROM_EMAIL!,
          to:      volunteer.email,
          subject: renderTemplate(tpl.subject, vars),
          html:    wrapEmailHtml(renderTemplate(tpl.body_html, vars)),
        });
        await logCommunication(service, { volunteer_id: row.volunteer_id, channel: "email", category: "system", subject: renderTemplate(tpl.subject, vars), body: "Email verified — application received", status: "sent", provider_message_id: sent.data?.id ?? null });
      }
    } catch {
      // confirmation email is non-critical
    }
  }

  return NextResponse.json({ status: "verified" });
}
