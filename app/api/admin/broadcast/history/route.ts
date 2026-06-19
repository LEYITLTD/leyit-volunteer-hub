import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

export async function GET() {
  const { error } = await requireAdminUser();
  if (error) return error;

  const service = createServiceClient();

  const { data, error: dbError } = await service
    .from("broadcast_logs")
    .select(`
      id, subject, recipient_count, scope, gender, event_id, sent_at,
      events ( name ),
      broadcast_recipients ( status )
    `)
    .order("sent_at", { ascending: false })
    .limit(50);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const rows = (data ?? []).map((b) => {
    const recipients = (b.broadcast_recipients ?? []) as { status: string }[];
    const total      = recipients.length;
    const delivered  = recipients.filter(r => ["delivered","opened","clicked"].includes(r.status)).length;
    const opened     = recipients.filter(r => ["opened","clicked"].includes(r.status)).length;
    const clicked    = recipients.filter(r => r.status === "clicked").length;
    const bounced    = recipients.filter(r => r.status === "bounced").length;

    return {
      id:              b.id,
      subject:         b.subject,
      recipient_count: b.recipient_count,
      scope:           b.scope,
      gender:          b.gender,
      event_id:        b.event_id,
      event_name:      (b.events as unknown as { name: string } | null)?.name ?? null,
      sent_at:         b.sent_at,
      stats: { total, delivered, opened, clicked, bounced },
    };
  });

  return NextResponse.json(rows);
}
