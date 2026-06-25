import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { Resend } from "resend";
import { wrapEmailHtml } from "@/lib/email-wrapper";
import { logCommunication } from "@/lib/communications";
import { toMsisdn } from "@/lib/phone";
import { sendSms, mapVoodooStatus } from "@/lib/voodoo";

type Params = { params: Promise<{ id: string }> };

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Send a direct message (email or SMS) to a single volunteer and log it.
export async function POST(request: Request, { params }: Params) {
  const { user, error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const { channel, subject, message } = await request.json() as {
    channel?: "email" | "sms"; subject?: string; message?: string;
  };

  if (channel !== "email" && channel !== "sms") {
    return NextResponse.json({ error: "channel must be email or sms" }, { status: 400 });
  }
  if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  if (channel === "email" && !subject?.trim()) return NextResponse.json({ error: "Subject is required" }, { status: 400 });

  const service = createServiceClient();
  const { data: volunteer } = await service
    .from("volunteers")
    .select("id, first_name, last_name, email, phone")
    .eq("id", id)
    .single();
  if (!volunteer) return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });

  const { data: admin } = await service.from("admins").select("id").eq("email", user!.email!).maybeSingle();
  const personal = message.replace(/\{\{first_name\}\}/g, volunteer.first_name).replace(/\{\{last_name\}\}/g, volunteer.last_name ?? "");

  /* ── Email ── */
  if (channel === "email") {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const res = await resend.emails.send({
        from:    process.env.RESEND_FROM_EMAIL!,
        to:      volunteer.email,
        subject: subject!.trim(),
        html:    wrapEmailHtml(`<div style="white-space:pre-wrap;font-size:15px;line-height:1.7;color:#2C2825;">${escapeHtml(personal)}</div>`),
      });
      await logCommunication(service, {
        volunteer_id: id, channel: "email", category: "direct",
        subject: subject!.trim(), body: personal, status: "sent",
        provider_message_id: res.data?.id ?? null, sent_by: admin?.id ?? null,
      });
      return NextResponse.json({ success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send email";
      await logCommunication(service, { volunteer_id: id, channel: "email", category: "direct", subject: subject?.trim(), body: personal, status: "failed", error_message: msg, sent_by: admin?.id ?? null });
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  /* ── SMS ── */
  const msisdn = toMsisdn(volunteer.phone);
  if (!msisdn) {
    return NextResponse.json({ error: "This volunteer has no valid mobile number." }, { status: 400 });
  }
  const { data: cfg } = await service.from("sms_config").select("sender_id").eq("id", true).maybeSingle();
  const sender = cfg?.sender_id ?? "LULVols";

  const res = await sendSms({ to: msisdn, from: sender, msg: personal });
  await logCommunication(service, {
    volunteer_id: id, channel: "sms", category: "direct",
    body: personal, status: res.ok ? mapVoodooStatus(res.providerStatus) : "failed",
    provider_message_id: res.messageId, error_message: res.ok ? null : res.error, sent_by: admin?.id ?? null,
  });

  if (!res.ok) return NextResponse.json({ error: res.error ?? "Failed to send SMS" }, { status: 500 });
  return NextResponse.json({ success: true });
}
