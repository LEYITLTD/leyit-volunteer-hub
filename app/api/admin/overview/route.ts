import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

export async function GET() {
  const { error } = await requireAdminUser();
  if (error) return error;

  const service = createServiceClient();

  const [events, approvedMale, approvedFemale, pendingChecks, totalVolunteers] = await Promise.all([
    service.from("events").select("*", { count: "exact", head: true }),
    service.from("volunteers").select("volunteer_compliance!inner(refinitiv_status)", { count: "exact", head: true })
      .eq("gender", "male")
      .eq("volunteer_compliance.refinitiv_status", "clear"),
    service.from("volunteers").select("volunteer_compliance!inner(refinitiv_status)", { count: "exact", head: true })
      .eq("gender", "female")
      .eq("volunteer_compliance.refinitiv_status", "clear"),
    service.from("volunteer_compliance").select("*", { count: "exact", head: true })
      .in("refinitiv_status", ["pending", "possible_match", "high_risk"]),
    service.from("volunteers").select("*", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    totalEvents:      events.count      ?? 0,
    approvedMale:     approvedMale.count ?? 0,
    approvedFemale:   approvedFemale.count ?? 0,
    pendingChecks:    pendingChecks.count ?? 0,
    totalVolunteers:  totalVolunteers.count ?? 0,
  });
}
