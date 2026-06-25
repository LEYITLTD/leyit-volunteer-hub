import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { Resend } from "resend";
import { wrapEmailHtml, renderTemplate } from "@/lib/email-wrapper";
import { logCommunication } from "@/lib/communications";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const service = createServiceClient();

  const { data: admin } = await service
    .from("admins")
    .select("id")
    .eq("email", user!.email!)
    .maybeSingle();

  const { data: updated, error: updErr } = await service
    .from("volunteer_compliance")
    .update({
      lseg_status:      "clear",
      lseg_screened_at: new Date().toISOString(),
      lseg_override_by: admin?.id ?? null,
      lseg_override_at: new Date().toISOString(),
    })
    .eq("volunteer_id", id)
    .select("overall_status")
    .single();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  if (updated.overall_status === "approved") {
    await service
      .from("volunteer_compliance")
      .update({ approved_by: admin?.id ?? null })
      .eq("volunteer_id", id);

    const { data: volunteer } = await service
      .from("volunteers")
      .select("email, first_name")
      .eq("id", id)
      .single();

    const { data: tpl } = await service
      .from("email_templates")
      .select("subject, body_html")
      .eq("key", "application_approved")
      .single();

    if (volunteer && tpl) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const sent = await resend.emails.send({
        from:    process.env.RESEND_FROM_EMAIL!,
        to:      volunteer.email,
        subject: tpl.subject,
        html:    wrapEmailHtml(renderTemplate(tpl.body_html, { first_name: volunteer.first_name })),
      });
      await logCommunication(service, { volunteer_id: id, channel: "email", category: "system", subject: tpl.subject, body: "Application approved", status: "sent", provider_message_id: sent.data?.id ?? null });
    }
  }

  return NextResponse.json({ success: true, overallStatus: updated.overall_status });
}
