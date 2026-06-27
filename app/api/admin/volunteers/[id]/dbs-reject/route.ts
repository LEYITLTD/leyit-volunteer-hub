import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { Resend } from "resend";
import { wrapEmailHtml, renderTemplate } from "@/lib/email-wrapper";
import { logCommunication } from "@/lib/communications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const { reason } = await request.json();

  if (!reason?.trim()) {
    return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: admin } = await service
    .from("admins")
    .select("id")
    .eq("email", user!.email!)
    .maybeSingle();

  const { error: updErr } = await service
    .from("volunteer_compliance")
    .update({
      dbs_status:           "rejected",
      dbs_rejection_reason: reason.trim(),
      dbs_reviewed_by:      admin?.id ?? null,
      dbs_reviewed_at:      new Date().toISOString(),
    })
    .eq("volunteer_id", id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  const { data: volunteer } = await service
    .from("volunteers")
    .select("auth_user_id, email, first_name")
    .eq("id", id)
    .single();

  if (volunteer) {
    // This is the final decision — no volunteer status. Disable their account.
    if (volunteer.auth_user_id) {
      await service.auth.admin.updateUserById(volunteer.auth_user_id, { ban_duration: "876000h" }).catch(() => {});
    }

    const { data: tpl } = await service
      .from("email_templates")
      .select("subject, body_html")
      .eq("key", "volunteer_rejected")
      .single();

    if (tpl) {
      try {
        const vars = { first_name: volunteer.first_name };
        const resend = new Resend(process.env.RESEND_API_KEY);
        const sent = await resend.emails.send({
          from:    process.env.RESEND_FROM_EMAIL!,
          to:      volunteer.email,
          subject: renderTemplate(tpl.subject, vars),
          html:    wrapEmailHtml(renderTemplate(tpl.body_html, vars)),
        });
        await logCommunication(service, { volunteer_id: id, channel: "email", category: "system", subject: renderTemplate(tpl.subject, vars), body: "Application rejected after DBS review", status: "sent", provider_message_id: sent.data?.id ?? null });
      } catch {
        // email failure must never block the rejection
      }
    }
  }

  return NextResponse.json({ success: true });
}
