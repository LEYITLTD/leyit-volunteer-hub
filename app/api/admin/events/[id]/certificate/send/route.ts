import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";
import { generateCertificate } from "@/lib/certificates/generate";
import { wrapEmailHtml, renderTemplate } from "@/lib/email-wrapper";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const service = createServiceClient();

  // Load certificate config
  const { data: config, error: cfgErr } = await service
    .from("certificate_configs")
    .select("*")
    .eq("event_id", id)
    .maybeSingle();

  if (cfgErr) return NextResponse.json({ error: `Config load failed: ${cfgErr.message}` }, { status: 500 });
  if (!config) return NextResponse.json({ error: "No certificate configured for this event" }, { status: 400 });

  // Download template
  const { data: blob, error: storageErr } = await service.storage
    .from("certificates")
    .download(config.template_storage_path);

  if (storageErr || !blob) {
    return NextResponse.json({ error: `Template download failed: ${storageErr?.message ?? "empty blob"}` }, { status: 500 });
  }

  let templateBuffer: Buffer;
  try {
    templateBuffer = Buffer.from(await blob.arrayBuffer());
  } catch (e) {
    return NextResponse.json({ error: `Template buffer failed: ${String(e)}` }, { status: 500 });
  }

  // Get event name
  const { data: event } = await service.from("events").select("name").eq("id", id).maybeSingle();

  // Get confirmed volunteers for this event
  const { data: apps, error: appsErr } = await service
    .from("event_applications")
    .select("volunteers!inner(id, first_name, last_name, email), event_roles!inner(event_id)")
    .eq("status", "confirmed")
    .eq("event_roles.event_id", id);

  if (appsErr) return NextResponse.json({ error: `Volunteers query failed: ${appsErr.message}` }, { status: 500 });
  if (!apps || apps.length === 0) return NextResponse.json({ error: "No confirmed volunteers for this event" }, { status: 400 });

  type AppRow = { volunteers: { id: string; first_name: string; last_name: string; email: string } };
  const volunteers = (apps as unknown as AppRow[]).map(a => a.volunteers);

  // Deduplicate by email
  const seen = new Set<string>();
  const unique = volunteers.filter(v => {
    if (seen.has(v.email)) return false;
    seen.add(v.email);
    return true;
  });

  const resend    = new Resend(process.env.RESEND_API_KEY);
  const eventName = event?.name ?? "the event";
  const results: { email: string; ok: boolean; error?: string }[] = [];

  // Load certificate email template once
  const { data: certTpl } = await service
    .from("email_templates")
    .select("subject, body_html")
    .eq("key", "certificate_sent")
    .single();

  const CONCURRENCY = 3;

  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const batch = unique.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (v) => {
        try {
          const fullName = `${v.first_name} ${v.last_name}`;

          // Generate PNG in memory
          const png = await generateCertificate(
            templateBuffer,
            fullName,
            config.name_x,
            config.name_y,
            config.font_size,
            config.text_color,
          );

          console.log(`Certificate PNG size for ${v.email}: ${png.length} bytes`);

          const vars = { first_name: v.first_name, event_name: eventName };
          const emailSubject = certTpl ? renderTemplate(certTpl.subject, vars) : `Your certificate — ${eventName}`;
          const emailHtml    = certTpl
            ? wrapEmailHtml(renderTemplate(certTpl.body_html, vars))
            : wrapEmailHtml(`<p>Hi ${v.first_name},</p><p>Thank you for volunteering at <strong>${eventName}</strong>. Your certificate is attached.</p>`);

          // Send with inline base64 content — no external URL dependency
          const { data: sendData, error: sendErr } = await resend.emails.send({
            from:    process.env.RESEND_FROM_EMAIL!,
            to:      v.email,
            subject: emailSubject,
            html:    emailHtml,
            attachments: [{
              filename:    `certificate-${v.first_name.toLowerCase()}-${v.last_name.toLowerCase()}.png`,
              content:     png.toString("base64"),
              contentType: "image/png",
            }],
          });

          if (sendErr) {
            results.push({ email: v.email, ok: false, error: `Resend error: ${sendErr.message}` });
            console.error(`Send failed for ${v.email}:`, sendErr.message);
          } else {
            results.push({ email: v.email, ok: true });
            console.log(`Certificate sent to ${v.email} — id: ${sendData?.id}`);
          }
        } catch (e) {
          results.push({ email: v.email, ok: false, error: String(e) });
          console.error(`Certificate failed for ${v.email}:`, e);
        }
      })
    );
  }

  const sent   = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);

  if (sent > 0) {
    void service.from("certificate_send_logs").insert({
      event_id:        id,
      event_name:      eventName,
      recipient_count: sent,
    });
  }

  return NextResponse.json({ sent, failed, total: unique.length });
}
