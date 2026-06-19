import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

const FIVE_MINUTES = 5 * 60 * 1000;

async function verifySignature(request: Request): Promise<{ ok: boolean; body: string }> {
  const secret = process.env.RESEND_WEBHOOK_SECRET ?? "";
  const msgId        = request.headers.get("svix-id") ?? "";
  const msgTimestamp = request.headers.get("svix-timestamp") ?? "";
  const msgSignature = request.headers.get("svix-signature") ?? "";

  if (!secret || !msgId || !msgTimestamp || !msgSignature) {
    return { ok: false, body: "" };
  }

  // Reject stale webhooks
  const ts = parseInt(msgTimestamp, 10) * 1000;
  if (Math.abs(Date.now() - ts) > FIVE_MINUTES) {
    return { ok: false, body: "" };
  }

  const body = await request.text();

  // Decode whsec_ secret (base64 after prefix)
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const toSign = `${msgId}.${msgTimestamp}.${body}`;
  const computed = createHmac("sha256", secretBytes).update(toSign).digest("base64");
  const expected = Buffer.from(`v1,${computed}`);

  const valid = msgSignature.split(" ").some(sig => {
    try {
      const sigBuf = Buffer.from(sig);
      return sigBuf.length === expected.length && timingSafeEqual(sigBuf, expected);
    } catch {
      return false;
    }
  });

  return { ok: valid, body };
}

type ResendEvent = {
  type: string;
  data: { email_id: string; created_at: string };
};

const STATUS_MAP: Record<string, { status: string; field: string }> = {
  "email.delivered":  { status: "delivered", field: "delivered_at" },
  "email.opened":     { status: "opened",    field: "opened_at" },
  "email.clicked":    { status: "clicked",   field: "clicked_at" },
  "email.bounced":    { status: "bounced",   field: "bounced_at" },
  "email.complained": { status: "bounced",   field: "bounced_at" },
};

export async function POST(request: Request) {
  const { ok, body } = await verifySignature(request);
  if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const event: ResendEvent = JSON.parse(body);
  const mapping = STATUS_MAP[event.type];
  if (!mapping) return NextResponse.json({ received: true });

  const service = createServiceClient();
  const { email_id, created_at } = event.data;

  // Only advance status (delivered → opened → clicked), never go backwards
  const statusOrder = ["sent", "delivered", "opened", "clicked", "bounced"];
  const { data: row } = await service
    .from("broadcast_recipients")
    .select("id, status")
    .eq("resend_message_id", email_id)
    .single();

  if (!row) return NextResponse.json({ received: true });

  const currentRank = statusOrder.indexOf(row.status);
  const newRank     = statusOrder.indexOf(mapping.status);

  const update: Record<string, string> = { [mapping.field]: created_at };
  if (newRank > currentRank) update.status = mapping.status;

  await service.from("broadcast_recipients").update(update).eq("id", row.id);

  return NextResponse.json({ received: true });
}
