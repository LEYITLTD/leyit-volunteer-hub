import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { error, user } = await requireAdminUser();
  if (error) return error;

  const { key } = await params;
  const { subject, body_html } = await request.json();

  if (!subject || !body_html) {
    return NextResponse.json({ error: "subject and body_html are required" }, { status: 400 });
  }

  // Get admin record id for updated_by
  const service = createServiceClient();
  const { data: admin } = await service
    .from("admins")
    .select("id")
    .eq("email", user!.email!)
    .maybeSingle();

  const { data, error: dbError } = await service
    .from("email_templates")
    .update({ subject, body_html, updated_by: admin?.id ?? null, updated_at: new Date().toISOString() })
    .eq("key", key)
    .select("key, name, subject, body_html, updated_at")
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}
