import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { Resend } from "resend";
import { wrapEmailHtml, renderTemplate } from "@/lib/email-wrapper";
import { notifyWaitlist } from "@/lib/notify-waitlist";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id: appId } = await params;
  const service = createServiceClient();

  // Fetch the application with volunteer and role details
  const { data: application } = await service
    .from("event_applications")
    .select("id, status, role_id, volunteer_id, volunteers(first_name, email), event_roles(role_name, events(name))")
    .eq("id", appId)
    .maybeSingle();

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (application.status === "cancelled" || application.status === "declined") {
    return NextResponse.json({ error: "Application is already cancelled" }, { status: 400 });
  }

  const wasConfirmed = application.status === "confirmed";

  const { error: updateErr } = await service
    .from("event_applications")
    .update({ status: "cancelled" })
    .eq("id", appId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // If a confirmed spot was freed, notify waitlisted volunteers
  if (wasConfirmed) {
    notifyWaitlist(application.role_id).catch(() => {});
  }

  // Send cancellation email to volunteer (fire-and-forget)
  try {
    const { data: tpl } = await service
      .from("email_templates")
      .select("subject, body_html")
      .eq("key", "volunteer_cancelled")
      .single();

    if (tpl) {
      const vol     = application.volunteers as unknown as { first_name: string; email: string } | null;
      const roleRow = application.event_roles as unknown as { role_name: string; events: { name: string } | null } | null;
      if (vol?.email) {
        const vars = {
          first_name: vol.first_name,
          role_name:  roleRow?.role_name ?? "Volunteer",
          event_name: roleRow?.events?.name ?? "the event",
        };
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from:    process.env.RESEND_FROM_EMAIL!,
          to:      vol.email,
          subject: renderTemplate(tpl.subject, vars),
          html:    wrapEmailHtml(renderTemplate(tpl.body_html, vars)),
        });
      }
    }
  } catch {
    // Email failure must not block the admin action
  }

  return NextResponse.json({ success: true });
}
