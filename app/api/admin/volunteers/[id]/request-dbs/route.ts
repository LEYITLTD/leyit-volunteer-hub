import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { Resend } from "resend";
import { wrapEmailHtml, renderTemplate } from "@/lib/email-wrapper";
import { logCommunication } from "@/lib/communications";

// LSEG came back not clear → ask the volunteer to verify via a DBS certificate.
// Records the screening result as not-clear; the overall-status trigger then
// keeps them pending until a DBS is reviewed (verified → approved, rejected → rejected).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const service = createServiceClient();

  const { error: updErr } = await service
    .from("volunteer_compliance")
    .update({
      lseg_status:      "possible_match",
      lseg_screened_at: new Date().toISOString(),
    })
    .eq("volunteer_id", id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  const { data: volunteer } = await service
    .from("volunteers")
    .select("first_name, email")
    .eq("id", id)
    .single();

  if (volunteer) {
    try {
      const { data: tpl } = await service
        .from("email_templates")
        .select("subject, body_html")
        .eq("key", "registration_dbs_required")
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
        await logCommunication(service, { volunteer_id: id, channel: "email", category: "system", subject: renderTemplate(tpl.subject, vars), body: "DBS verification requested", status: "sent", provider_message_id: sent.data?.id ?? null });
      }
    } catch {
      // email failure must never block the action
    }
  }

  return NextResponse.json({ success: true });
}
