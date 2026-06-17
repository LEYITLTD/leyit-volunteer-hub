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
    .from("events")
    .select(`
      *,
      event_roles ( * ),
      event_applications (
        id, status, applied_at, confirmed_at, waitlist_position,
        volunteers ( id, first_name, last_name, email )
      )
    `)
    .eq("id", id)
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const updates = await request.json();

  // Prevent changing status via this route — use dedicated publish/cancel routes later
  delete updates.id;
  delete updates.created_by;
  delete updates.created_at;

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("events")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const service = createServiceClient();

  // Only allow deleting drafts
  const { data: event } = await service.from("events").select("status").eq("id", id).single();
  if (event?.status !== "draft") {
    return NextResponse.json({ error: "Only draft events can be deleted" }, { status: 400 });
  }

  const { error: dbErr } = await service.from("events").delete().eq("id", id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
