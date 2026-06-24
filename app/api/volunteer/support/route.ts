import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Resend } from "resend";
import { wrapEmailHtml } from "@/lib/email-wrapper";

const SUPPORT_INBOX = "admin@emanchannel.tv";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subject, message } = await request.json() as { subject?: string; message?: string };
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Please add a subject and a message." }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: volunteer } = await service
    .from("volunteers")
    .select("first_name, last_name, email, phone")
    .eq("auth_user_id", user.id)
    .single();

  const name  = volunteer ? `${volunteer.first_name} ${volunteer.last_name}` : "A volunteer";
  const email = volunteer?.email ?? user.email ?? "unknown";
  const phone = volunteer?.phone ?? "—";

  const body = wrapEmailHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1A1714;">Volunteer support request</h2>
    <p style="margin:0 0 4px;color:#6B6259;font-size:14px;"><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
    <p style="margin:0 0 4px;color:#6B6259;font-size:14px;"><strong>Phone:</strong> ${escapeHtml(phone)}</p>
    <p style="margin:0 0 16px;color:#6B6259;font-size:14px;"><strong>Subject:</strong> ${escapeHtml(subject.trim())}</p>
    <div style="white-space:pre-wrap;color:#1C1917;font-size:15px;line-height:1.6;border-top:1px solid #EAE6DD;padding-top:16px;">${escapeHtml(message.trim())}</div>
  `);

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from:     process.env.RESEND_FROM_EMAIL!,
      to:       SUPPORT_INBOX,
      replyTo:  email,
      subject:  `[Volunteer Support] ${subject.trim()}`,
      html:     body,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to send message" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
