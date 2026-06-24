import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { getTiers, tierForPoints } from "@/lib/points-engine";

export async function GET() {
  const { error } = await requireAdminUser();
  if (error) return error;

  const service = createServiceClient();
  const [{ data, error: dbError }, { data: balances }, tiers] = await Promise.all([
    service
      .from("volunteers")
      .select(`
        id, first_name, last_name, email, phone, created_at,
        volunteer_compliance (
          dbs_status, overall_status, dbs_uploaded_at, dbs_expiry_date
        )
      `)
      .order("created_at", { ascending: false }),
    service.from("volunteer_points_balance").select("volunteer_id, total_points"),
    getTiers(service),
  ]);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const pointsByVol = new Map<string, number>(
    (balances ?? []).map(b => [b.volunteer_id as string, b.total_points as number]),
  );

  const withTier = (data ?? []).map(v => {
    const total_points = pointsByVol.get(v.id) ?? 0;
    const { current } = tierForPoints(total_points, tiers);
    return { ...v, total_points, tier: current?.name ?? null };
  });

  return NextResponse.json(withTier);
}
