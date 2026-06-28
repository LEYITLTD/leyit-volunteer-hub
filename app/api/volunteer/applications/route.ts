import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// All of the volunteer's applications (excluding cancelled/declined), with the
// event + role they applied for, so "My Events" can split upcoming vs archived.
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
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  if (!volunteer) return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });

  const { data, error } = await service
    .from("event_applications")
    .select(`
      id, status, waitlist_position, event_id,
      event_roles ( role_name, roles ( description ) ),
      events ( id, name, city, event_start, event_end, status )
    `)
    .eq("volunteer_id", volunteer.id)
    .not("status", "in", '("cancelled","declined")');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data ?? [])
    .map((a) => {
      const role  = Array.isArray(a.event_roles) ? a.event_roles[0] : a.event_roles;
      const event = Array.isArray(a.events) ? a.events[0] : a.events;
      if (!event) return null;
      const catalog = role ? (Array.isArray(role.roles) ? role.roles[0] : role.roles) : null;
      return {
        id:               a.id,
        event_id:         (event as { id: string }).id,
        name:             (event as { name: string }).name,
        city:             (event as { city: string | null }).city ?? null,
        event_start:      (event as { event_start: string }).event_start,
        event_end:        (event as { event_end: string }).event_end,
        event_status:     (event as { status: string }).status,
        status:           a.status as string,
        waitlist_position: a.waitlist_position as number | null,
        role_name:        (role as { role_name?: string } | null)?.role_name ?? "Volunteer",
        role_description: (catalog as { description: string | null } | null)?.description ?? null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.event_start.localeCompare(b.event_start));

  return NextResponse.json(items);
}
