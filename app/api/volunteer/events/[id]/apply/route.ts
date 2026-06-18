import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Resend } from "resend";

function renderTemplate(html: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (out, [k, v]) => out.replaceAll(`{{${k}}}`, v),
    html,
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London",
  });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
}

export async function POST(
  request: Request,
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
  const { roleId } = await request.json();

  if (!roleId) return NextResponse.json({ error: "roleId is required" }, { status: 400 });

  const service = createServiceClient();

  // Get volunteer
  const { data: volunteer } = await service
    .from("volunteers")
    .select("id, gender, first_name, email")
    .eq("auth_user_id", user.id)
    .single();

  if (!volunteer) return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });

  const { data: compliance } = await service
    .from("volunteer_compliance")
    .select("refinitiv_status")
    .eq("volunteer_id", volunteer.id)
    .single();

  if (compliance?.refinitiv_status !== "clear") {
    return NextResponse.json({ error: "Account not verified" }, { status: 403 });
  }

  // Check event is published/active (fetch details for the email)
  const { data: event } = await service
    .from("events")
    .select("id, name, city, event_start, event_end, status")
    .eq("id", eventId)
    .in("status", ["published", "active"])
    .single();

  if (!event) return NextResponse.json({ error: "Event not found or not open" }, { status: 404 });

  // Check role exists, belongs to this event, and volunteer is eligible
  const { data: role } = await service
    .from("event_roles")
    .select("id, role_name, capacity, gender_restriction")
    .eq("id", roleId)
    .eq("event_id", eventId)
    .single();

  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  // Gender eligibility check
  if (role.gender_restriction !== "any") {
    if (!volunteer.gender || role.gender_restriction !== volunteer.gender) {
      return NextResponse.json({ error: "You are not eligible for this role" }, { status: 403 });
    }
  }

  // Check not already applied to this event
  const { data: existing } = await service
    .from("event_applications")
    .select("id, status")
    .eq("volunteer_id", volunteer.id)
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You have already applied to this event" }, { status: 409 });
  }

  // Count active applications for this role to check capacity
  const { count: activeCount } = await service
    .from("event_applications")
    .select("id", { count: "exact", head: true })
    .eq("role_id", roleId)
    .not("status", "in", '("cancelled","declined")');

  const isFull      = (activeCount ?? 0) >= role.capacity;
  const status      = isFull ? "waitlisted" : "confirmed";
  const waitlistPos = isFull ? (activeCount ?? 0) - role.capacity + 1 : null;
  const now         = new Date().toISOString();

  const { data: application, error: insErr } = await service
    .from("event_applications")
    .insert({
      volunteer_id:      volunteer.id,
      event_id:          eventId,
      role_id:           roleId,
      status,
      applied_at:        now,
      confirmed_at:      isFull ? null : now,
      waitlist_position: waitlistPos,
    })
    .select()
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  // Send confirmation email (fire-and-forget — don't fail the request if email errors)
  try {
    const { data: tpl } = await service
      .from("email_templates")
      .select("subject, body_html")
      .eq("key", "event_application_received")
      .single();

    if (tpl) {
      const statusNote = isFull
        ? `You've been added to the waitlist at position ${waitlistPos}. We'll let you know as soon as a spot opens up.`
        : "Your spot is confirmed — we look forward to seeing you there!";

      const vars = {
        first_name:  volunteer.first_name,
        event_name:  event.name,
        event_date:  fmtDate(event.event_start),
        event_time:  `${fmtTime(event.event_start)} – ${fmtTime(event.event_end)}`,
        city:        event.city ?? "TBC",
        role_name:   role.role_name,
        status_note: statusNote,
      };

      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from:    process.env.RESEND_FROM_EMAIL!,
        to:      volunteer.email,
        subject: renderTemplate(tpl.subject, vars),
        html:    renderTemplate(tpl.body_html, vars),
      });
    }
  } catch {
    // Email failure should never block the application
  }

  return NextResponse.json({ application, waitlisted: isFull }, { status: 201 });
}
