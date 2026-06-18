import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  // 1. Auth
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  // 2. Get volunteer
  const { data: volunteer, error: vErr } = await service
    .from("volunteers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  if (vErr || !volunteer) {
    return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });
  }

  // 3. Parse form data
  const formData = await request.formData();
  const file = formData.get("certificate") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${volunteer.id}/${Date.now()}-${filename}`;

  // 4. Upload to Supabase storage
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadErr } = await service.storage
    .from("dbs-documents")
    .upload(path, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  // 5. Get public URL
  const { data: urlData } = service.storage
    .from("dbs-documents")
    .getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  // 6. Upsert compliance record
  const { error: upsertErr } = await service
    .from("volunteer_compliance")
    .upsert(
      {
        volunteer_id:    volunteer.id,
        dbs_status:      "pending",
        dbs_document_url: publicUrl,
        dbs_uploaded_at:  new Date().toISOString(),
      },
      { onConflict: "volunteer_id" },
    );

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
