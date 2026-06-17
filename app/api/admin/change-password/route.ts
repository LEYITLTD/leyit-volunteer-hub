import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

export async function POST(request: Request) {
  const { user, error } = await requireAdminUser();
  if (error) return error;

  const body = await request.json();
  const { password } = body;

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const service = createServiceClient();

  const { error: updateErr } = await service.auth.admin.updateUserById(user!.id, {
    password,
    user_metadata: { must_change_password: false },
  });

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
