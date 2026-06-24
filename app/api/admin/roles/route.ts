import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

export async function GET() {
  const { error } = await requireAdminUser();
  if (error) return error;

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("roles")
    .select("id, name, description, is_active, created_at")
    .eq("is_active", true)
    .order("name");

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { name, description } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Role name is required" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("roles")
    .insert({ name: name.trim(), description: description?.trim() || null })
    .select("id, name, description, is_active, created_at")
    .single();

  if (dbErr) {
    const status = dbErr.code === "23505" ? 409 : 500;
    const message = status === 409 ? "A role with that name already exists" : dbErr.message;
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json(data, { status: 201 });
}
