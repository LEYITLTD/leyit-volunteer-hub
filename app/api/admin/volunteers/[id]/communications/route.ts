import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

type Params = { params: Promise<{ id: string }> };

export type CommItem = {
  id: string;
  channel: "email" | "sms";
  category: "system" | "direct" | "broadcast";
  subject: string | null;
  status: string;
  created_at: string;
};

// Unified message history for one volunteer: direct + system (communications)
// plus broadcasts (broadcast_recipients joined to broadcast_logs).
export async function GET(_req: Request, { params }: Params) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const service = createServiceClient();

  const [{ data: comms }, { data: bcasts }] = await Promise.all([
    service
      .from("communications")
      .select("id, channel, category, subject, status, created_at")
      .eq("volunteer_id", id),
    service
      .from("broadcast_recipients")
      .select("id, channel, status, broadcast_logs ( subject, sent_at )")
      .eq("volunteer_id", id),
  ]);

  const items: CommItem[] = [];

  for (const c of comms ?? []) {
    items.push({
      id: c.id, channel: c.channel as "email" | "sms",
      category: c.category as CommItem["category"],
      subject: c.subject, status: c.status, created_at: c.created_at,
    });
  }

  for (const b of bcasts ?? []) {
    const log = Array.isArray(b.broadcast_logs) ? b.broadcast_logs[0] : b.broadcast_logs;
    items.push({
      id: b.id, channel: (b.channel ?? "email") as "email" | "sms",
      category: "broadcast",
      subject: (log as { subject?: string } | null)?.subject ?? "Broadcast",
      status: b.status,
      created_at: (log as { sent_at?: string } | null)?.sent_at ?? "",
    });
  }

  items.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return NextResponse.json(items);
}
