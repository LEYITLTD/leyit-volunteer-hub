import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const { reason } = await request.json();

  const service = createServiceClient();

  const { error: updErr } = await service
    .from("volunteer_compliance")
    .update({
      refinitiv_status:           "high_risk",
      refinitiv_rejection_reason: reason?.trim() || null,
      refinitiv_screened_at:      new Date().toISOString(),
      refinitiv_override_by:      null,
      refinitiv_override_at:      null,
    })
    .eq("volunteer_id", id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
