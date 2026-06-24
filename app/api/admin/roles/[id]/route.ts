import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const { name, description } = await request.json();

  const updates: { name?: string; description?: string | null } = {};
  if (typeof name === "string") {
    if (!name.trim()) return NextResponse.json({ error: "Role name cannot be empty" }, { status: 400 });
    updates.name = name.trim();
  }
  if (description !== undefined) updates.description = description?.trim() || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("roles")
    .update(updates)
    .eq("id", id)
    .select("id, name, description, is_active, created_at")
    .single();

  if (dbErr) {
    const status = dbErr.code === "23505" ? 409 : 500;
    const message = status === 409 ? "A role with that name already exists" : dbErr.message;
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const service = createServiceClient();

  // Soft-delete so existing event_roles.role_catalog_id references stay valid.
  const { error: dbErr } = await service
    .from("roles")
    .update({ is_active: false })
    .eq("id", id);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
