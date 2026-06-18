import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  const { data: volunteer } = await service
    .from("volunteers")
    .select("id, gender")
    .eq("auth_user_id", user.id)
    .single();

  if (!volunteer) return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });

  const { data: compliance } = await service
    .from("volunteer_compliance")
    .select("lseg_status")
    .eq("volunteer_id", volunteer.id)
    .single();

  if (compliance?.lseg_status !== "clear") {
    return NextResponse.json({ error: "Account not verified" }, { status: 403 });
  }

  // Fetch published/active events with roles and this volunteer's applications
  const { data: events, error } = await service
    .from("events")
    .select(`
      id, name, city, venue_name, venue_address, description, event_start, event_end, doors_open, status,
      event_roles ( id, role_name, capacity, gender_restriction ),
      event_applications ( id, role_id, status, volunteer_id )
    `)
    .in("status", ["published", "active"])
    .order("event_start", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // For each event, filter roles to those the volunteer is eligible for,
  // and pull out just this volunteer's application
  const result = (events ?? []).map((event) => {
    const eligibleRoles = (event.event_roles ?? []).filter((r) => {
      if (!volunteer.gender) return r.gender_restriction === "any";
      return r.gender_restriction === "any" || r.gender_restriction === volunteer.gender;
    });

    const myApplication = (event.event_applications ?? []).find(
      (a) => a.volunteer_id === volunteer.id,
    ) ?? null;

    // Compute applied count per role (all applications, not just mine)
    const rolesWithCounts = eligibleRoles.map((role) => {
      const appliedCount = (event.event_applications ?? []).filter(
        (a) => a.role_id === role.id && a.status !== "cancelled" && a.status !== "declined",
      ).length;
      return { ...role, appliedCount };
    });

    return {
      id:            event.id,
      name:          event.name,
      city:          event.city,
      venue_name:    (event as Record<string, unknown>).venue_name    as string | null ?? null,
      venue_address: (event as Record<string, unknown>).venue_address as string | null ?? null,
      description:   (event as Record<string, unknown>).description   as string | null ?? null,
      doors_open:    (event as Record<string, unknown>).doors_open    as string | null ?? null,
      thumbnail_url: (event as Record<string, unknown>).thumbnail_url as string | null ?? null,
      event_start:   event.event_start,
      event_end:     event.event_end,
      status:        event.status,
      eligibleRoles: rolesWithCounts,
      myApplication,
    };
  });

  return NextResponse.json(result);
}
