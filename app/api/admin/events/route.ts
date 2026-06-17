import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

export async function GET() {
  const { error } = await requireAdminUser();
  if (error) return error;

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("events")
    .select(`
      id, name, city, event_start, event_end, status, published_at, created_at,
      event_roles ( id, role_name, capacity, gender_restriction ),
      event_applications ( id, role_id, status )
    `)
    .order("event_start", { ascending: false });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { error, user } = await requireAdminUser();
  if (error) return error;

  const body = await request.json();
  const { name, city, event_start, event_end, roles } = body;

  if (!name || !event_start || !event_end) {
    return NextResponse.json({ error: "name, event_start and event_end are required" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: admin } = await service
    .from("admins").select("id").eq("email", user!.email!).maybeSingle();

  const { data: event, error: evErr } = await service
    .from("events")
    .insert({
      name,
      city: city ?? null,
      event_start,
      event_end,
      early_bird_cutoff_days: 14,
      created_by: admin?.id ?? null,
      status: "draft",
    })
    .select()
    .single();

  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 });

  if (Array.isArray(roles) && roles.length > 0) {
    await service.from("event_roles").insert(
      roles.map((r: { role_name: string; capacity: number; gender_restriction?: string }) => ({
        event_id:           event.id,
        role_name:          r.role_name,
        capacity:           r.capacity ?? 1,
        station_type:       "general",
        gender_restriction: r.gender_restriction ?? "any",
      })),
    );
  }

  return NextResponse.json(event, { status: 201 });
}
