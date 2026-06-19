import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

export async function GET() {
  const { error } = await requireAdminUser();
  if (error) return error;

  const service = createServiceClient();

  const { data, error: dbError } = await service.rpc("broadcast_history");

  if (dbError) {
    // Fallback: plain logs without stats
    const { data: logs, error: logsErr } = await service
      .from("broadcast_logs")
      .select("id, subject, recipient_count, scope, gender, event_id, sent_at")
      .order("sent_at", { ascending: false })
      .limit(50);

    if (logsErr) return NextResponse.json({ error: logsErr.message }, { status: 500 });

    return NextResponse.json(
      (logs ?? []).map(b => ({
        ...b,
        event_name: null,
        stats: { total: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 },
      }))
    );
  }

  return NextResponse.json(data ?? []);
}
