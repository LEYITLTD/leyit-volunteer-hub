import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { getReports, mapVoodooStatus } from "@/lib/voodoo";

type Params = { params: Promise<{ id: string }> };

const RANK: Record<string, number> = { sent: 0, delivered: 1, failed: 1 };

// Poll Voodoo's /report for this broadcast's messages and update statuses.
export async function POST(_req: Request, { params }: Params) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const service = createServiceClient();

  const { data: rows } = await service
    .from("broadcast_recipients")
    .select("id, status, sms_message_id")
    .eq("broadcast_id", id)
    .not("sms_message_id", "is", null);

  const withId = (rows ?? []).filter(r => r.sms_message_id);
  if (withId.length === 0) return NextResponse.json({ updated: 0 });

  const reports = await getReports(withId.map(r => r.sms_message_id as string));
  const byMsgId = new Map(reports.map(r => [r.message_id, r]));

  let updated = 0;
  await Promise.all(withId.map(async (row) => {
    const report = byMsgId.get(row.sms_message_id as string);
    if (!report) return;
    const status = mapVoodooStatus(report.status);
    if ((RANK[status] ?? 0) <= (RANK[row.status] ?? 0)) return; // no forward progress

    const update: Record<string, unknown> = { status };
    if (status === "delivered") update.delivered_at = report.delivered_at ?? new Date().toISOString();
    if (status === "failed")    { update.failed_at = new Date().toISOString(); update.error_message = report.status; }
    await service.from("broadcast_recipients").update(update).eq("id", row.id);
    updated++;
  }));

  return NextResponse.json({ updated });
}
