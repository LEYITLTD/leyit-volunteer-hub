import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

export async function GET() {
  const { error } = await requireAdminUser();
  if (error) return error;

  const service = createServiceClient();
  const { data, error: dbError } = await service
    .from("volunteers")
    .select(`
      id, first_name, last_name, email, phone, created_at,
      volunteer_compliance (
        dbs_status, overall_status, dbs_uploaded_at, dbs_expiry_date
      )
    `)
    .order("created_at", { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}
