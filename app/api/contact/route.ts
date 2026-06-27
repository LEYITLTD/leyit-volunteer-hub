import { NextResponse } from "next/server";
import { Resend } from "resend";
import { wrapEmailHtml } from "@/lib/email-wrapper";

const SUPPORT_INBOX = "admin@emanchannel.tv";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Public contact form — works with or without an account. Generic response and
// light anti-abuse (honeypot + length caps); no auth required.
export async function POST(request: Request) {
  const generic = NextResponse.json({ success: true });

  let body: { name?: string; email?: string; subject?: string; message?: string; company?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const name    = (body.name ?? "").trim();
  const email   = (body.email ?? "").trim();
  const subject = (body.subject ?? "").trim();
  const message = (body.message ?? "").trim();

  // Honeypot: real users never fill this hidden field → silently drop bots.
  if (body.company && body.company.trim() !== "") return generic;

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "Please fill in your name, email, subject and message." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  // Length caps to bound payload / abuse.
  if (name.length > 100 || email.length > 200 || subject.length > 150 || message.length > 4000) {
    return NextResponse.json({ error: "One of your fields is too long." }, { status: 400 });
  }

  const html = wrapEmailHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1A1714;">Contact form message</h2>
    <p style="margin:0 0 4px;color:#6B6259;font-size:14px;"><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
    <p style="margin:0 0 16px;color:#6B6259;font-size:14px;"><strong>Subject:</strong> ${escapeHtml(subject)}</p>
    <div style="white-space:pre-wrap;color:#1C1917;font-size:15px;line-height:1.6;border-top:1px solid #EAE6DD;padding-top:16px;">${escapeHtml(message)}</div>
  `);

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL!,
      to:      SUPPORT_INBOX,
      replyTo: email,
      subject: `[Contact] ${subject}`,
      html,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to send message" }, { status: 500 });
  }

  return generic;
}
