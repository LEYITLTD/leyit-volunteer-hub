import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  const { data: volunteer, error } = await service
    .from("volunteers")
    .select(`
      id, first_name, last_name, email, phone, address,
      date_of_birth, nationality, created_at,
      volunteer_compliance (
        dbs_status, overall_status, dbs_uploaded_at,
        dbs_expiry_date, dbs_rejection_reason, refinitiv_status
      )
    `)
    .eq("auth_user_id", user.id)
    .single();

  if (error || !volunteer) {
    return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });
  }

  // Total points
  const { data: pts } = await service
    .from("points_transactions")
    .select("amount")
    .eq("volunteer_id", volunteer.id);

  const totalPoints = (pts ?? []).reduce((sum, r) => sum + r.amount, 0);

  // Application count
  const { count: applicationCount } = await service
    .from("event_applications")
    .select("id", { count: "exact", head: true })
    .eq("volunteer_id", volunteer.id);

  // Confirmed event count
  const { count: confirmedCount } = await service
    .from("event_applications")
    .select("id", { count: "exact", head: true })
    .eq("volunteer_id", volunteer.id)
    .eq("status", "confirmed");

  return NextResponse.json({
    volunteer,
    totalPoints,
    applicationCount: applicationCount ?? 0,
    confirmedCount: confirmedCount ?? 0,
  });
}
