import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { toMobileE164 } from "@/lib/phone";

export async function PATCH(request: Request) {
  // 1. Authenticate via SSR client
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse + validate body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { first_name, last_name, phone, nationality, address } = body;

  if (!first_name || typeof first_name !== "string" || !first_name.trim()) {
    return NextResponse.json({ error: "first_name is required" }, { status: 400 });
  }
  if (!last_name || typeof last_name !== "string" || !last_name.trim()) {
    return NextResponse.json({ error: "last_name is required" }, { status: 400 });
  }
  if (phone       !== null && phone       !== undefined && typeof phone       !== "string") {
    return NextResponse.json({ error: "phone must be a string"       }, { status: 400 });
  }
  if (nationality !== null && nationality !== undefined && typeof nationality !== "string") {
    return NextResponse.json({ error: "nationality must be a string" }, { status: 400 });
  }
  if (address     !== null && address     !== undefined && typeof address     !== "string") {
    return NextResponse.json({ error: "address must be a string"     }, { status: 400 });
  }

  // Normalise phone to a valid UK mobile (E.164). Empty clears it.
  const phoneRaw = typeof phone === "string" ? phone.trim() : "";
  let phoneE164: string | null = null;
  if (phoneRaw) {
    phoneE164 = toMobileE164(phoneRaw, "GB");
    if (!phoneE164) {
      return NextResponse.json({ error: "Please enter a valid UK mobile number (e.g. 07700 900123)." }, { status: 400 });
    }
  }

  // 3. Find volunteer record
  const service = createServiceClient();

  const { data: volunteer, error: findErr } = await service
    .from("volunteers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (findErr || !volunteer) {
    return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });
  }

  // 4. Update
  const { error: updateErr } = await service
    .from("volunteers")
    .update({
      first_name:  (first_name as string).trim(),
      last_name:   (last_name  as string).trim(),
      phone:       phoneE164,
      nationality: nationality ? (nationality as string).trim() : null,
      address:     address     ? (address     as string).trim() : null,
    })
    .eq("id", volunteer.id);

  if (updateErr) {
    console.error("[PATCH /api/volunteer/profile]", updateErr);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
