import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { Resend } from "resend";
import QRCode from "qrcode";

type Recipient  = { id: string; email: string; first_name: string; last_name: string };
type Attachment = { filename: string; content: string };

const APP_BASE = "https://volunteer-hub-nine.vercel.app";

async function getRecipients(
  service: ReturnType<typeof createServiceClient>,
  scope: string,
  gender: string,
  event_id: string | null,
): Promise<Recipient[]> {
  if (scope === "event" && event_id) {
    const { data, error } = await service
      .from("event_applications")
      .select("volunteers!inner(id, email, first_name, last_name, gender), event_roles!inner(event_id)")
      .eq("status", "confirmed")
      .eq("event_roles.event_id", event_id);
    if (error || !data) return [];

    const all = (data as unknown as { volunteers: { id: string; email: string; first_name: string; last_name: string; gender: string } }[])
      .map(r => r.volunteers)
      .filter(v => gender === "all" || v.gender === gender);

    const seen = new Set<string>();
    return all.filter(v => { if (seen.has(v.email)) return false; seen.add(v.email); return true; });
  }

  // Global audience
  let q = service.from("volunteers").select("id, email, first_name, last_name, gender");
  if (gender !== "all") q = q.eq("gender", gender);
  const { data, error } = await q;
  if (error || !data) return [];
  return data as Recipient[];
}

export async function GET(request: Request) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const scope    = searchParams.get("scope")    ?? "global";
  const gender   = searchParams.get("gender")   ?? "all";
  const event_id = searchParams.get("event_id") ?? null;

  const service    = createServiceClient();
  const recipients = await getRecipients(service, scope, gender, event_id);

  return NextResponse.json({ count: recipients.length });
}

export async function POST(request: Request) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const body = await request.json();
  const { scope, gender, event_id, subject, message, attachments = [], include_qr = false } = body as {
    scope: string; gender: string; event_id: string | null;
    subject: string; message: string; attachments: Attachment[]; include_qr: boolean;
  };

  if (!subject?.trim()) return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const service    = createServiceClient();
  const recipients = await getRecipients(service, scope ?? "global", gender ?? "all", event_id ?? null);

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients matched" }, { status: 400 });
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
