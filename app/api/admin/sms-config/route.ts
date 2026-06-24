import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

const SENDER_ID_RE = /^[A-Za-z0-9]{3,11}$/;

export async function GET() {
  const { error } = await requireAdminUser();
  if (error) return error;

  const service = createServiceClient();
  const { data } = await service.from("sms_config").select("sender_id").eq("id", true).maybeSingle();
  return NextResponse.json({ sender_id: data?.sender_id ?? "LULVols" });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireAdminUser();
  if (error) return error;

  const { sender_id } = await request.json() as { sender_id?: string };
  const value = sender_id?.trim() ?? "";
  if (!SENDER_ID_RE.test(value)) {
    return NextResponse.json({ error: "Sender ID must be 3–11 letters or numbers (no spaces)." }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: admin } = await service.from("admins").select("id").eq("email", user!.email!).maybeSingle();
  const { error: upErr } = await service
    .from("sms_config")
    .update({ sender_id: value, updated_by: admin?.id ?? null })
    .eq("id", true);

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json({ sender_id: value });
}
