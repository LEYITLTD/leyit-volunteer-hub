import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { Resend } from "resend";
import QRCode from "qrcode";
import { toMsisdn } from "@/lib/phone";
import { sendSms, mapVoodooStatus } from "@/lib/voodoo";

export const maxDuration = 300;

type Recipient  = { id: string; email: string; first_name: string; last_name: string; phone: string | null };
type Attachment = { filename: string; content: string };

const APP_BASE = "https://volunteer-hub-nine.vercel.app";
const SENDER_ID_RE = /^[A-Za-z0-9]{3,11}$/;

async function getRecipients(
  service: ReturnType<typeof createServiceClient>,
  scope: string,
  gender: string,
  event_id: string | null,
): Promise<Recipient[]> {
  if (scope === "event" && event_id) {
    const { data, error } = await service
      .from("event_applications")
      .select("volunteers!inner(id, email, first_name, last_name, gender, phone), event_roles!inner(event_id)")
      .eq("status", "confirmed")
      .eq("event_roles.event_id", event_id);
    if (error || !data) return [];

    const all = (data as unknown as { volunteers: { id: string; email: string; first_name: string; last_name: string; gender: string; phone: string | null } }[])
      .map(r => r.volunteers)
      .filter(v => gender === "all" || v.gender === gender);

    const seen = new Set<string>();
    return all.filter(v => { if (seen.has(v.email)) return false; seen.add(v.email); return true; });
  }

  // Global audience
  let q = service.from("volunteers").select("id, email, first_name, last_name, gender, phone");
  if (gender !== "all") q = q.eq("gender", gender);
  const { data, error } = await q;
  if (error || !data) return [];
  return data as Recipient[];
}

/** Run async tasks with a bounded concurrency limit. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

function personalise(text: string, r: Recipient): string {
  return text
    .replace(/\{\{first_name\}\}/g, r.first_name)
    .replace(/\{\{last_name\}\}/g, r.last_name ?? "");
}

export async function GET(request: Request) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const scope    = searchParams.get("scope")    ?? "global";
  const gender   = searchParams.get("gender")   ?? "all";
  const event_id = searchParams.get("event_id") ?? null;
  const channel  = searchParams.get("channel")  ?? "email";

  const service    = createServiceClient();
  const recipients = await getRecipients(service, scope, gender, event_id);

  if (channel === "sms") {
    const validCount = recipients.filter(r => toMsisdn(r.phone) !== null).length;
    return NextResponse.json({ count: recipients.length, validCount });
  }

  return NextResponse.json({ count: recipients.length });
}

export async function POST(request: Request) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const body = await request.json();
  const { channel = "email", scope, gender, event_id, subject, message, attachments = [], include_qr = false, sender_id } = body as {
    channel?: string;
    scope: string; gender: string; event_id: string | null;
    subject: string; message: string; attachments: Attachment[]; include_qr: boolean;
    sender_id?: string;
  };

  if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  if (channel === "email" && !subject?.trim()) return NextResponse.json({ error: "Subject is required" }, { status: 400 });

  const service    = createServiceClient();
  const recipients = await getRecipients(service, scope ?? "global", gender ?? "all", event_id ?? null);

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients matched" }, { status: 400 });
  }

  /* ── SMS channel ─────────────────────────────────────────────────────── */
  if (channel === "sms") {
    // Resolve + validate sender ID (override → configured default).
    let sender = sender_id?.trim() || "";
    if (!sender) {
      const { data: cfg } = await service.from("sms_config").select("sender_id").eq("id", true).maybeSingle();
      sender = cfg?.sender_id ?? "LULVols";
    }
    if (!SENDER_ID_RE.test(sender)) {
      return NextResponse.json({ error: "Sender ID must be 3–11 letters or numbers (no spaces)." }, { status: 400 });
    }

    // Split into valid (sendable) and invalid (un-normalisable) recipients.
    const valid:   { r: Recipient; msisdn: string }[] = [];
    const invalid: Recipient[] = [];
    for (const r of recipients) {
      const msisdn = toMsisdn(r.phone);
      if (msisdn) valid.push({ r, msisdn }); else invalid.push(r);
    }

    // Log + recipient rows. subject column stores the message text for display.
    const { data: logRow } = await service
      .from("broadcast_logs")
      .insert({
        subject: message.trim().slice(0, 300),
        recipient_count: valid.length,
        scope: scope ?? "global",
        gender: gender ?? "all",
        event_id: event_id ?? null,
        channel: "sms",
        sender_id: sender,
      })
      .select("id")
      .single();

    if (!logRow?.id) return NextResponse.json({ error: "Failed to create broadcast" }, { status: 500 });

    // Insert invalid rows immediately so they appear in the failed report.
    if (invalid.length > 0) {
      await service.from("broadcast_recipients").insert(invalid.map(r => ({
        broadcast_id: logRow.id, volunteer_id: r.id, email: r.email,
        first_name: r.first_name, last_name: r.last_name ?? null,
        phone: r.phone, channel: "sms", status: "invalid",
        error_message: "No valid mobile number",
      })));
    }

    // Insert valid rows as "sent" first so we have row ids for external_reference.
    const { data: validRows } = await service.from("broadcast_recipients").insert(
      valid.map(({ r, msisdn }) => ({
        broadcast_id: logRow.id, volunteer_id: r.id, email: r.email,
        first_name: r.first_name, last_name: r.last_name ?? null,
        phone: msisdn, channel: "sms", status: "sent",
      })),
    ).select("id, volunteer_id");

    const rowByVol = new Map((validRows ?? []).map(row => [row.volunteer_id as string, row.id as string]));

    let sent = 0, failed = 0;
    await mapLimit(valid, 10, async ({ r, msisdn }) => {
      const rowId = rowByVol.get(r.id);
      const res = await sendSms({ to: msisdn, from: sender, msg: personalise(message, r), externalReference: rowId });
      if (res.ok) {
        sent++;
        await service.from("broadcast_recipients").update({
          sms_message_id: res.messageId,
          status: mapVoodooStatus(res.providerStatus),
        }).eq("id", rowId!);
      } else {
        failed++;
        await service.from("broadcast_recipients").update({
          status: "failed", failed_at: new Date().toISOString(), error_message: res.error,
        }).eq("id", rowId!);
      }
    });

    return NextResponse.json({ channel: "sms", sent, failed, invalid: invalid.length });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Pre-generate QR codes if requested (event scope only, once per recipient)
  const qrMap = new Map<string, string>(); // volunteer id → data URL
  if (include_qr && scope === "event") {
    for (const r of recipients) {
      const url = `${APP_BASE}/checkin/${r.id}`;
      const dataUrl = await QRCode.toDataURL(url, { width: 220, margin: 2, color: { dark: "#1A1714", light: "#FFFFFF" } });
      qrMap.set(r.id, dataUrl);
    }
  }

  // Build email payload for a recipient
  function buildEmail(r: Recipient) {
    const personalSubject = subject
      .replace(/\{\{first_name\}\}/g, r.first_name)
      .replace(/\{\{last_name\}\}/g,  r.last_name ?? "");
    const personalBody = message
      .replace(/\{\{first_name\}\}/g, r.first_name)
      .replace(/\{\{last_name\}\}/g,  r.last_name ?? "");

    const qrSection = qrMap.has(r.id) ? `
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #E8E3DC;text-align:center;">
        <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9E9690;margin:0 0 12px;">Your Check-in QR Code</p>
        <p style="font-size:12px;color:#7A6F65;margin:0 0 14px;">Show this at the event entrance to check in.</p>
        <img src="${qrMap.get(r.id)}" alt="QR Code" width="180" height="180" style="display:block;margin:0 auto;border-radius:10px;border:4px solid #F5F2EE;" />
      </div>
    ` : "";

    return {
      from:    process.env.RESEND_FROM_EMAIL!,
      to:      r.email,
      subject: personalSubject,
      html: `
        <div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E8E3DC;">
          <div style="background:#1A1714;padding:16px 24px;">
            <span style="font-size:13px;font-weight:700;color:#A8854A;letter-spacing:0.08em;text-transform:uppercase;">LUL Global Volunteers</span>
          </div>
          <div style="padding:28px 24px;color:#1A1714;">
            <div style="font-size:14px;line-height:1.7;color:#2C2825;white-space:pre-wrap;">${personalBody.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
            ${qrSection}
            <hr style="border:none;border-top:1px solid #E8E3DC;margin:24px 0;" />
            <p style="font-size:12px;color:#9E9690;margin:0;">
              LUL Global Volunteers &mdash;
              <a href="mailto:volunteers@leyit.dev" style="color:#B8861B;">volunteers@leyit.dev</a>
            </p>
          </div>
        </div>
      `,
      ...(attachments.length > 0 && {
        attachments: attachments.map(a => ({ filename: a.filename, content: a.content })),
      }),
    };
  }

  // Send in batches of 50, capturing per-recipient Resend message IDs
  const BATCH = 50;
  const recipientResults: { recipient: Recipient; messageId: string | null }[] = [];

  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    const result = await resend.batch.send(batch.map(buildEmail));
    const batchData = result.data as { id: string }[] | null;
    batch.forEach((r, j) => {
      recipientResults.push({ recipient: r, messageId: batchData?.[j]?.id ?? null });
    });
  }

  const sent = recipientResults.length;

  // Insert broadcast log, then per-recipient rows
  const { data: logRow } = await service
    .from("broadcast_logs")
    .insert({
      subject,
      recipient_count: sent,
      scope:    scope ?? "global",
      gender:   gender ?? "all",
      event_id: event_id ?? null,
    })
    .select("id")
    .single();

  if (logRow?.id) {
    await service.from("broadcast_recipients").insert(
      recipientResults.map(({ recipient, messageId }) => ({
        broadcast_id:      logRow.id,
        volunteer_id:      recipient.id,
        email:             recipient.email,
        first_name:        recipient.first_name,
        last_name:         recipient.last_name ?? null,
        resend_message_id: messageId,
        status:            "sent",
      }))
    );
  }

  return NextResponse.json({ sent });
}
