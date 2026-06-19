import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAdminUser();
  if (error) return error;

  const service = createServiceClient();

  const [{ data: logs, error: logsErr }, { data: stats, error: statsErr }] = await Promise.all([
    service
      .from("broadcast_logs")
      .select("id, subject, recipient_count, scope, gender, event_id, sent_at")
      .order("sent_at", { ascending: false })
      .limit(50),
    service
      .from("broadcast_recipients")
      .select("broadcast_id, status"),
  ]);

  if (logsErr) return NextResponse.json({ error: logsErr.message }, { status: 500 });

  const recipientMap = new Map<string, { status: string }[]>();
  for (const r of stats ?? []) {
    const list = recipientMap.get(r.broadcast_id) ?? [];
    list.push({ status: r.status });
    recipientMap.set(r.broadcast_id, list);
  }

  // Fetch event names for any event-scoped broadcasts
  const eventIds = [...new Set((logs ?? []).map(b => b.event_id).filter(Boolean) as string[])];
  const eventMap = new Map<string, string>();
  if (eventIds.length > 0) {
    const { data: events } = await service
      .from("events")
      .select("id, name")
      .in("id", eventIds);
    for (const e of events ?? []) eventMap.set(e.id, e.name);
  }

  const rows = (logs ?? []).map(b => {
    const recipients = recipientMap.get(b.id) ?? [];
    const total     = recipients.length;
    const delivered = recipients.filter(r => ["delivered","opened","clicked"].includes(r.status)).length;
    const opened    = recipients.filter(r => ["opened","clicked"].includes(r.status)).length;
    const clicked   = recipients.filter(r => r.status === "clicked").length;
    const bounced   = recipients.filter(r => r.status === "bounced").length;

    return {
      id:              b.id,
      subject:         b.subject,
      recipient_count: b.recipient_count,
      scope:           b.scope,
      gender:          b.gender,
      event_id:        b.event_id,
      event_name:      b.event_id ? (eventMap.get(b.event_id) ?? null) : null,
      sent_at:         b.sent_at,
      stats:           { total, delivered, opened, clicked, bounced },
    };
  });

  return NextResponse.json(rows);
}
