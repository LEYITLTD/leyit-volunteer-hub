import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { Resend } from "resend";
import { wrapEmailHtml } from "@/lib/email-wrapper";

export async function POST(request: Request) {
  const { error, user } = await requireAdminUser();
  if (error) return error;

  const { subject, body_html } = await request.json();

  if (!subject || !body_html) {
    return NextResponse.json({ error: "subject and body_html are required" }, { status: 400 });
  }

  // Get the admin's name for a personalised test banner
  const service = createServiceClient();
  const { data: admin } = await service
    .from("admins")
    .select("first_name, last_name")
    .eq("email", user!.email!)
    .maybeSingle();

  const adminName = admin ? `${admin.first_name} ${admin.last_name}` : user!.email!;

  // Prepend a test banner so it's clear this is a preview send
  const testBanner = `<div style="background:#FEF9C3;border:1px solid #FDE68A;border-radius:8px;padding:10px 14px;margin-bottom:20px;font-size:13px;color:#92400E;font-family:'Helvetica Neue',Arial,sans-serif;">
  <strong>Test email</strong> — sent to ${adminName}. Template variables have been replaced with sample values.
</div>`;

  // Replace template variables with sample values so the preview looks realistic
  const sampleVars: Record<string, string> = {
    first_name:  admin?.first_name ?? "Ahmed",
    last_name:   admin?.last_name  ?? "Hassan",
    event_name:  "Eman Channel Live 2025",
    reason:      "Certificate not matching provided details.",
  };

  const renderedBody = Object.entries(sampleVars).reduce(
    (out, [k, v]) => out.replaceAll(`{{${k}}}`, v),
    body_html,
  );

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error: sendError } = await resend.emails.send({
    from:    process.env.RESEND_FROM_EMAIL!,
    to:      user!.email!,
    subject: `[TEST] ${subject}`,
    html:    wrapEmailHtml(testBanner + renderedBody),
  });

  if (sendError) {
    return NextResponse.json({ error: (sendError as { message?: string }).message ?? "Failed to send" }, { status: 500 });
  }

  return NextResponse.json({ success: true, sentTo: user!.email });
}
