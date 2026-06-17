import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
    .select("id, gender")
    .eq("auth_user_id", user.id)
    .single();

  if (!volunteer) return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });

  // Check event is published/active
  const { data: event } = await service
    .from("events")
    .select("id, status")
    .eq("id", eventId)
    .in("status", ["published", "active"])
    .single();

  if (!event) return NextResponse.json({ error: "Event not found or not open" }, { status: 404 });

  // Check role exists, belongs to this event, and volunteer is eligible
  const { data: role } = await service
    .from("event_roles")
    .select("id, capacity, gender_restriction")
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

  const isFull     = (activeCount ?? 0) >= role.capacity;
  const status     = isFull ? "waitlisted" : "applied";
  const waitlistPos = isFull ? (activeCount ?? 0) - role.capacity + 1 : null;

  const { data: application, error: insErr } = await service
    .from("event_applications")
    .insert({
      volunteer_id:      volunteer.id,
      event_id:          eventId,
      role_id:           roleId,
      status,
      applied_at:        new Date().toISOString(),
      waitlist_position: waitlistPos,
    })
    .select()
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ application, waitlisted: isFull }, { status: 201 });
}
