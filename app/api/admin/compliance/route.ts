import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const { error } = await requireAdminUser();
  if (error) return error;

  const service = createServiceClient();

  // 1. Auto-expire LSEG records older than 1 year
  await service
    .from("volunteer_compliance")
    .update({ refinitiv_status: "pending", overall_status: "pending" })
    .eq("refinitiv_status", "clear")
    .lt("refinitiv_screened_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

  // 2. Fetch all volunteers with their compliance
  const { data: volunteers, error: vErr } = await service
    .from("volunteers")
    .select(`
      id, first_name, last_name, email, gender, date_of_birth, nationality,
      volunteer_compliance (
        dbs_status, dbs_document_url, dbs_uploaded_at, dbs_rejection_reason,
        refinitiv_status, refinitiv_screened_at, refinitiv_rejection_reason,
        overall_status
      )
    `)
    .order("created_at", { ascending: true });

  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });

  const rows = (volunteers ?? []).map(v => ({
    ...v,
    compliance: Array.isArray(v.volunteer_compliance) ? v.volunteer_compliance[0] : v.volunteer_compliance,
  }));

  // Stats
  const lsegApproved   = rows.filter(v => v.compliance?.refinitiv_status === "clear").length;
  const dbsPending     = rows.filter(v => v.compliance?.dbs_status === "pending").length;
  const dbsNotUploaded = rows.filter(v => !v.compliance?.dbs_status || v.compliance.dbs_status === "not_uploaded").length;
  const lsegFlags      = rows.filter(v => v.compliance?.refinitiv_status === "high_risk").length;

  // DBS review queue
  const dbsReview   = rows.filter(v => v.compliance?.dbs_status === "pending");
  const notUploaded = rows.filter(v => !v.compliance?.dbs_status || v.compliance.dbs_status === "not_uploaded");

  // LSEG queue: needs screening (pending/null or high_risk)
  const lsegPending = rows.filter(v => {
    const s = v.compliance?.refinitiv_status;
    return !s || s === "pending" || s === "high_risk";
  });

  return NextResponse.json({
    stats: { lsegApproved, dbsPending, dbsNotUploaded, lsegFlags },
    dbsReview,
    notUploaded,
    lsegPending,
    lsegFlags: rows.filter(v => v.compliance?.refinitiv_status === "high_risk"),
  });
}
