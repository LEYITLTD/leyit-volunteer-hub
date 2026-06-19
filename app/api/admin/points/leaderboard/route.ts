import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAdminUser();
  if (error) return error;

  const service = createServiceClient();

  const { data, error: dbErr } = await service
    .from("volunteer_points_balance")
    .select("volunteer_id, total_points, volunteers(first_name, last_name, email)")
    .order("total_points", { ascending: false });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  type Row = { volunteer_id: string; total_points: number; volunteers: { first_name: string; last_name: string; email: string } | { first_name: string; last_name: string; email: string }[] | null };
  const rows = (data as unknown as Row[] ?? []).map(r => {
    const vol = Array.isArray(r.volunteers) ? r.volunteers[0] : r.volunteers;
    return {
      volunteer_id: r.volunteer_id,
      total_points: r.total_points,
      first_name:   vol?.first_name ?? "",
      last_name:    vol?.last_name  ?? "",
      email:        vol?.email      ?? "",
    };
  });

  return NextResponse.json(rows);
}
