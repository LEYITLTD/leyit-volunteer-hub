import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { Resend } from "resend";

type Recipient  = { email: string; first_name: string; last_name: string };
type Attachment = { filename: string; content: string };

async function getRecipients(
  service: ReturnType<typeof createServiceClient>,
  scope: string,
  gender: string,
  event_id: string | null,
): Promise<Recipient[]> {
  if (scope === "event" && event_id) {
    const { data, error } = await service
      .from("event_applications")
      .select("volunteers!inner(email, first_name, last_name, gender), event_roles!inner(event_id)")
      .eq("status", "confirmed")
      .eq("event_roles.event_id", event_id);
    if (error || !data) return [];

    const all = (data as unknown as { volunteers: { email: string; first_name: string; last_name: string; gender: string } }[])
      .map(r => r.volunteers)
      .filter(v => gender === "all" || v.gender === gender);

    const seen = new Set<string>();
    return all.filter(v => { if (seen.has(v.email)) return false; seen.add(v.email); return true; });
  }

  // Global audience
  let q = service.from("volunteers").select("email, first_name, last_name, gender");
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
  const { scope, gender, event_id, subject, message, attachments = [] } = body as {
    scope: string; gender: string; event_id: string | null;
    subject: string; message: string; attachments: Attachment[];
  };

  if (!subject?.trim()) return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const service    = createServiceClient();
  const recipients = await getRecipients(service, scope ?? "global", gender ?? "all", event_id ?? null);

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients matched" }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Send in batches of 50
  const BATCH = 50;
  let sent = 0;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    await resend.batch.send(
      batch.map(r => {
        const personalSubject = subject
          .replace(/\{\{first_name\}\}/g, r.first_name)
          .replace(/\{\{last_name\}\}/g,  r.last_name ?? "");
        const personalBody = message
          .replace(/\{\{first_name\}\}/g, r.first_name)
          .replace(/\{\{last_name\}\}/g,  r.last_name ?? "");

        return {
          from:    process.env.RESEND_FROM_EMAIL!,
          to:      r.email,
          subject: personalSubject,
          html: `
            <div style="font-family:sans-serif;max-width:580px;margin:0 auto;color:#1A1714;background:#fff;padding:32px 24px;border-radius:12px;">
              <img src="https://volunteer-hub-leyitltds-projects.vercel.app/assets/logo-gold.png" alt="Eman Channel" style="height:36px;margin-bottom:28px;" />
              <div style="font-size:14px;line-height:1.7;color:#2C2825;white-space:pre-wrap;">${personalBody.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
              <hr style="border:none;border-top:1px solid #E8E3DC;margin:28px 0;" />
              <p style="font-size:12px;color:#9E9690;margin:0;">
                Eman Channel Volunteer Team &mdash;
                <a href="mailto:volunteers@leyit.dev" style="color:#B8861B;">volunteers@leyit.dev</a>
              </p>
            </div>
          `,
          ...(attachments.length > 0 && {
            attachments: attachments.map(a => ({ filename: a.filename, content: a.content })),
          }),
        };
      })
    );
    sent += batch.length;
  }

  return NextResponse.json({ sent });
}
