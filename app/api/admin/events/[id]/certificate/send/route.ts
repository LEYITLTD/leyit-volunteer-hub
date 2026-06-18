import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";
import { generateCertificate } from "@/lib/certificates/generate";

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

          // Send with inline base64 content — no external URL dependency
          const { data: sendData, error: sendErr } = await resend.emails.send({
            from:    process.env.RESEND_FROM_EMAIL!,
            to:      v.email,
            subject: `Your certificate — ${eventName}`,
            html: `
              <div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E8E3DC;">
                <div style="background:#1A1714;padding:16px 24px;">
                  <span style="font-size:13px;font-weight:700;color:#A8854A;letter-spacing:0.08em;text-transform:uppercase;">LUL Global Volunteers</span>
                </div>
                <div style="padding:28px 24px;color:#1A1714;">
                  <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Congratulations, ${v.first_name}!</h2>
                  <p style="font-size:14px;line-height:1.7;color:#2C2825;margin:0 0 20px;">
                    Thank you for volunteering at <strong>${eventName}</strong>. Your certificate of participation is attached — well deserved.
                  </p>
                  <hr style="border:none;border-top:1px solid #E8E3DC;margin:0 0 20px;" />
                  <p style="font-size:12px;color:#9E9690;margin:0;">
                    LUL Global Volunteers &mdash;
                    <a href="mailto:volunteers@leyit.dev" style="color:#B8861B;">volunteers@leyit.dev</a>
                  </p>
                </div>
              </div>
            `,
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

  return NextResponse.json({ sent, failed, total: unique.length });
}
