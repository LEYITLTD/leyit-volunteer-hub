import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { getTiers, tierForPoints } from "@/lib/points-engine";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const service = createServiceClient();

  const { data: volunteer, error: vErr } = await service
    .from("volunteers")
    .select(`
      id, first_name, last_name, email, phone, address,
      date_of_birth, nationality, gender, emergency_contact_name,
      emergency_contact_phone, dietary_requirements, medical_info,
      age_verified, created_at,
      volunteer_compliance (
        dbs_status, dbs_document_url, dbs_uploaded_at, dbs_expiry_date,
        dbs_reviewed_at, dbs_rejection_reason,
        lseg_status, lseg_screened_at, lseg_rejection_reason,
        overall_status, approved_at
      )
    `)
    .eq("id", id)
    .single();

  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 404 });

  // Generate signed URL for DBS document
  let dbsSignedUrl: string | null = null;
  const compliance = (volunteer as any).volunteer_compliance;
  if (compliance?.dbs_document_url) {
    const { data: signed } = await service.storage
      .from("dbs-documents")
      .createSignedUrl(compliance.dbs_document_url, 3600);
    dbsSignedUrl = signed?.signedUrl ?? null;
  }

  // Fetch templates for preview
  const { data: templates } = await service
    .from("email_templates")
    .select("key, subject, body_html")
    .in("key", ["dbs_rejected", "application_approved"]);

  // Points history + tier
  const [{ data: txns }, tiers] = await Promise.all([
    service
      .from("points_transactions")
      .select("id, type, amount, description, earned_at, events ( name )")
      .eq("volunteer_id", id)
      .order("earned_at", { ascending: false }),
    getTiers(service),
  ]);

  const transactions = (txns ?? []).map(t => {
    const ev = Array.isArray(t.events) ? t.events[0] : t.events;
    return {
      id: t.id, type: t.type, amount: t.amount,
      description: t.description, earned_at: t.earned_at,
      event_name: (ev as { name: string } | null)?.name ?? null,
    };
  });
  const total = transactions.reduce((sum, t) => sum + (t.amount ?? 0), 0);
  const { current, next } = tierForPoints(total, tiers);

  const points = { total, tier: current, nextTier: next, transactions };

  return NextResponse.json({ volunteer, dbsSignedUrl, templates, points });
}
