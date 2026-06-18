import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { Resend } from "resend";
import { wrapEmailHtml, renderTemplate } from "@/lib/email-wrapper";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;

  const service = createServiceClient();

  // Mark compliance as high_risk (no reason given for LSEG — it's a pass/fail check)
  const { error: updErr } = await service
    .from("volunteer_compliance")
    .update({
      refinitiv_status:           "high_risk",
      refinitiv_rejection_reason: null,
      refinitiv_screened_at:      new Date().toISOString(),
      refinitiv_override_by:      null,
      refinitiv_override_at:      null,
    })
    .eq("volunteer_id", id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Fetch volunteer for account ban + email
  const { data: volunteer } = await service
    .from("volunteers")
    .select("auth_user_id, first_name, email")
    .eq("id", id)
    .single();

  if (volunteer) {
    // Disable their auth account (effectively permanent ban)
    if (volunteer.auth_user_id) {
      await service.auth.admin.updateUserById(volunteer.auth_user_id, {
        ban_duration: "876000h", // 100 years
      });
    }

    // Send rejection email (fire-and-forget)
    try {
      const { data: tpl } = await service
        .from("email_templates")
        .select("subject, body_html")
        .eq("key", "volunteer_rejected")
        .single();

      if (tpl) {
        const vars = {
          first_name:   volunteer.first_name,
          reason_block: "", // LSEG is a pass/fail — no reason shared
        };
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from:    process.env.RESEND_FROM_EMAIL!,
          to:      volunteer.email,
          subject: renderTemplate(tpl.subject, vars),
          html:    wrapEmailHtml(renderTemplate(tpl.body_html, vars)),
        });
      }
    } catch {
      // Email failure must never block the rejection
    }
  }

  return NextResponse.json({ success: true });
}
