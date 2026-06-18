import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const service = createServiceClient();

  const { data } = await service
    .from("certificate_configs")
    .select("*")
    .eq("event_id", id)
    .maybeSingle();

  if (!data) return NextResponse.json(null);

  const { data: signed } = await service.storage
    .from("certificates")
    .createSignedUrl(data.template_storage_path, 3600);

  return NextResponse.json({ ...data, template_url: signed?.signedUrl ?? null });
}

export async function POST(req: Request, { params }: Params) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const body = await req.json() as {
    template_base64?: string;
    name_x:     number;
    name_y:     number;
    font_size:  number;
    text_color: string;
  };

  const service = createServiceClient();
  let storagePath: string;

  if (body.template_base64) {
    const buffer = Buffer.from(body.template_base64, "base64");
    storagePath = `${id}/template.png`;
    const { error: upErr } = await service.storage
      .from("certificates")
      .upload(storagePath, buffer, { contentType: "image/png", upsert: true });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  } else {
    const { data: existing } = await service
      .from("certificate_configs")
      .select("template_storage_path")
      .eq("event_id", id)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: "No template uploaded yet" }, { status: 400 });
    storagePath = existing.template_storage_path;
  }

  const { data, error: dbErr } = await service
    .from("certificate_configs")
    .upsert({
      event_id:              id,
      template_storage_path: storagePath,
      name_x:     body.name_x    ?? 0.5,
      name_y:     body.name_y    ?? 0.5,
      font_size:  body.font_size  ?? 80,
      text_color: body.text_color ?? "#2C2220",
      updated_at: new Date().toISOString(),
    }, { onConflict: "event_id" })
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data);
}
