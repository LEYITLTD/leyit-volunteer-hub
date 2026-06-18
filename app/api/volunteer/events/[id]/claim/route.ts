import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!volunteer) return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });

  // Find their waitlisted application for this event
  const { data: application } = await service
    .from("event_applications")
    .select("id, status, role_id, event_roles(capacity)")
    .eq("volunteer_id", volunteer.id)
    .eq("event_id", eventId)
    .eq("status", "waitlisted")
    .maybeSingle();

  if (!application) {
    return NextResponse.json({ error: "No waitlisted application found" }, { status: 404 });
  }

  // Check current confirmed count for this role
  const { count: confirmedCount } = await service
    .from("event_applications")
    .select("id", { count: "exact", head: true })
    .eq("role_id", application.role_id)
    .eq("status", "confirmed");

  const roleRow = application.event_roles as { capacity: number } | null;
  const capacity = roleRow?.capacity ?? 0;

  if ((confirmedCount ?? 0) >= capacity) {
    return NextResponse.json(
      { error: "Sorry, no spots are available right now. Keep an eye on your email for the next opening." },
      { status: 409 },
    );
  }

  // Claim the spot
  const { error: updateErr } = await service
    .from("event_applications")
    .update({
      status:       "confirmed",
      confirmed_at: new Date().toISOString(),
      waitlist_position: null,
    })
    .eq("id", application.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
