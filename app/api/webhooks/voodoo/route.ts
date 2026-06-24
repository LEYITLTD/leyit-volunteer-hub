import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { mapVoodooStatus } from "@/lib/voodoo";

/* Voodoo SMS delivery webhook.
   Security: Voodoo sends `X-Voodoo-Token: base64(secret)`. We compare against
   base64(VOODOO_WEBHOOK_SECRET). Payload:
   { message_id, sender_id, to, sent_at, delivered_at, status, external_reference, credits_used } */

const RANK: Record<string, number> = { sent: 0, delivered: 1, failed: 1 };

export async function POST(request: Request) {
  const secret = process.env.VOODOO_WEBHOOK_SECRET;
  if (secret) {
    const token = request.headers.get("x-voodoo-token") ?? "";
    const expected = Buffer.from(secret).toString("base64");
    if (token !== expected) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
  }

  const body = await request.json().catch(() => null) as
    | { message_id?: string; status?: string; external_reference?: string; delivered_at?: string }
    | null;
  if (!body?.message_id && !body?.external_reference) {
    return NextResponse.json({ received: true });
  }

  const service = createServiceClient();
  const status  = mapVoodooStatus(body.status);

  // Match by provider message id, falling back to our recipient row id.
  let query = service.from("broadcast_recipients").select("id, status");
  query = body.message_id
    ? query.eq("sms_message_id", body.message_id)
    : query.eq("id", body.external_reference!);
  const { data: recipient } = await query.maybeSingle();

  if (!recipient) return NextResponse.json({ received: true });

  // Only advance status forward (sent → delivered/failed); ignore stale events.
  if ((RANK[status] ?? 0) < (RANK[recipient.status] ?? 0)) {
    return NextResponse.json({ received: true });
  }

  const update: Record<string, unknown> = { status };
  if (status === "delivered") update.delivered_at = body.delivered_at ?? new Date().toISOString();
  if (status === "failed")    { update.failed_at = new Date().toISOString(); update.error_message = body.status ?? "Failed"; }

  await service.from("broadcast_recipients").update(update).eq("id", recipient.id);

  return NextResponse.json({ received: true });
}
