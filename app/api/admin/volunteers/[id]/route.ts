import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

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
      date_of_birth, nationality, emergency_contact_name,
      emergency_contact_phone, dietary_requirements, medical_info,
      age_verified, created_at,
      volunteer_compliance (
        dbs_status, dbs_document_url, dbs_uploaded_at, dbs_expiry_date,
        dbs_reviewed_at, dbs_rejection_reason,
        refinitiv_status, overall_status,
        approved_at
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

  return NextResponse.json({ volunteer, dbsSignedUrl, templates });
}
