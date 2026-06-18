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

  const { data: volunteer, error } = await service
    .from("volunteers")
    .select(`
      id, first_name, last_name, email, phone, address,
      date_of_birth, nationality, created_at,
      volunteer_compliance (
        dbs_status, overall_status, dbs_uploaded_at,
        dbs_expiry_date, dbs_rejection_reason, lseg_status
      )
    `)
    .eq("auth_user_id", user.id)
    .single();

  if (error || !volunteer) {
    return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });
  }

  // Total points
  const { data: pts } = await service
    .from("points_transactions")
    .select("amount")
    .eq("volunteer_id", volunteer.id);

  const totalPoints = (pts ?? []).reduce((sum, r) => sum + r.amount, 0);

  // Confirmed event count
  const { count: confirmedCount } = await service
    .from("event_applications")
    .select("id", { count: "exact", head: true })
    .eq("volunteer_id", volunteer.id)
    .eq("status", "confirmed");

  // Upcoming confirmed events
  const { data: upcomingApps } = await service
    .from("event_applications")
    .select(`
      id, status,
      event_roles (
        id, role_name,
        events (id, name, city, event_start, event_end)
      )
    `)
    .eq("volunteer_id", volunteer.id)
    .eq("status", "confirmed")
    .limit(10);

  const now = new Date().toISOString();
  type UpcomingEvent = {
    id: string; name: string; city: string | null;
    event_start: string; event_end: string; role_name: string;
  };
  const upcomingEvents: UpcomingEvent[] = (upcomingApps ?? [])
    .map((app) => {
      const role = Array.isArray(app.event_roles) ? app.event_roles[0] : app.event_roles;
      const event = role ? (Array.isArray(role.events) ? role.events[0] : role.events) : null;
      if (!event || event.event_start <= now) return null;
      return {
        id: event.id as string,
        name: event.name as string,
        city: (event.city ?? null) as string | null,
        event_start: event.event_start as string,
        event_end: event.event_end as string,
        role_name: role.role_name as string,
      };
    })
    .filter((e): e is UpcomingEvent => e !== null)
    .sort((a, b) => a.event_start.localeCompare(b.event_start))
    .slice(0, 5);

  return NextResponse.json({
    volunteer,
    totalPoints,
    confirmedCount: confirmedCount ?? 0,
    upcomingEvents,
  });
}
