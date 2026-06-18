import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Resend } from "resend";
import { wrapEmailHtml, renderTemplate } from "@/lib/email-wrapper";
import { notifyWaitlist } from "@/lib/notify-waitlist";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  const service = createServiceClient();

  // Find volunteer record
  const { data: volunteer } = await service
    .from("volunteers")
    .select("id, first_name, email")
    .eq("auth_user_id", user.id)
    .single();

  if (!volunteer) return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });

  // Find their active application for this event
  const { data: application } = await service
    .from("event_applications")
    .select("id, status, role_id, event_roles(role_name, events(name))")
    .eq("volunteer_id", volunteer.id)
    .eq("event_id", eventId)
    .not("status", "in", '("cancelled","declined")')
    .maybeSingle();

  if (!application) {
    return NextResponse.json({ error: "No active application found for this event" }, { status: 404 });
  }

  const wasConfirmed = application.status === "confirmed";

  // Cancel the application
  const { error: updateErr } = await service
    .from("event_applications")
    .update({ status: "cancelled" })
    .eq("id", application.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // If a confirmed spot was freed, notify waitlisted volunteers
  if (wasConfirmed) {
    notifyWaitlist(application.role_id).catch(() => {});
  }

  // Send cancellation confirmation to the volunteer (fire-and-forget)
  try {
    const { data: tpl } = await service
      .from("email_templates")
      .select("subject, body_html")
      .eq("key", "volunteer_cancelled")
      .single();

    if (tpl) {
      const roleRow = application.event_roles as { role_name: string; events: { name: string } | null } | null;
      const vars = {
        first_name: volunteer.first_name,
        role_name:  roleRow?.role_name ?? "Volunteer",
        event_name: roleRow?.events?.name ?? "the event",
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
    // Email failure should never block the cancellation
  }

  return NextResponse.json({ success: true });
}
