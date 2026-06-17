import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const service = createServiceClient();

  const { data, error: dbErr } = await service
    .from("event_roles")
    .select("*")
    .eq("event_id", id)
    .order("created_at");

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request, { params }: Params) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const { role_name, capacity, station_type, gender_restriction, station_window_start, station_window_end } = await request.json();

  if (!role_name || !capacity) {
    return NextResponse.json({ error: "role_name and capacity are required" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("event_roles")
    .insert({ event_id: id, role_name, capacity, station_type: station_type ?? "general", gender_restriction: gender_restriction ?? "any", station_window_start, station_window_end })
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
