import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_BYTES   = 5 * 1024 * 1024; // 5 MB
const ALLOWED     = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(request: Request) {
  const { error } = await requireAdminUser();
  if (error) return error;

  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Only JPG, PNG or WebP allowed" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File must be under 5 MB" }, { status: 400 });

  const ext      = EXT[file.type] ?? "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer   = Buffer.from(await file.arrayBuffer());

  const service = createServiceClient();
  const { error: upErr } = await service.storage
    .from("event-images")
    .upload(filename, buffer, { contentType: file.type, upsert: false });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data } = service.storage.from("event-images").getPublicUrl(filename);
  return NextResponse.json({ url: data.publicUrl });
}
