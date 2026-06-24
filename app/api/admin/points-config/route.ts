import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

const CONFIG_FIELDS = [
  "check_in_points", "check_in_late_points",
  "check_out_points", "check_out_early_points", "grace_minutes",
] as const;

export async function GET() {
  const { error } = await requireAdminUser();
  if (error) return error;

  const service = createServiceClient();
  const [{ data: config }, { data: tiers }] = await Promise.all([
    service.from("points_config")
      .select("check_in_points, check_in_late_points, check_out_points, check_out_early_points, grace_minutes")
      .eq("id", true).maybeSingle(),
    service.from("points_tiers")
      .select("id, name, min_points").order("min_points", { ascending: true }),
  ]);

  return NextResponse.json({ config: config ?? null, tiers: tiers ?? [] });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireAdminUser();
  if (error) return error;

  const { config, tiers } = await request.json() as {
    config?: Record<string, number>;
    tiers?: { id: string; min_points: number }[];
  };

  const service = createServiceClient();

  if (config && typeof config === "object") {
    const updates: Record<string, number> = {};
    for (const f of CONFIG_FIELDS) {
      const v = config[f];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) updates[f] = Math.round(v);
    }
    if (Object.keys(updates).length) {
      const { data: admin } = await service.from("admins").select("id").eq("email", user!.email!).maybeSingle();
      const { error: upErr } = await service
        .from("points_config")
        .update({ ...updates, updated_by: admin?.id ?? null })
        .eq("id", true);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
  }

  if (Array.isArray(tiers)) {
    for (const t of tiers) {
      if (!t?.id || typeof t.min_points !== "number" || t.min_points < 0) continue;
      const { error: tErr } = await service
        .from("points_tiers")
        .update({ min_points: Math.round(t.min_points) })
        .eq("id", t.id);
      if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
    }
  }

  // Return the fresh state
  const [{ data: freshConfig }, { data: freshTiers }] = await Promise.all([
    service.from("points_config")
      .select("check_in_points, check_in_late_points, check_out_points, check_out_early_points, grace_minutes")
      .eq("id", true).maybeSingle(),
    service.from("points_tiers")
      .select("id, name, min_points").order("min_points", { ascending: true }),
  ]);
  return NextResponse.json({ config: freshConfig ?? null, tiers: freshTiers ?? [] });
}
