import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const service = createServiceClient();

  const [{ data: log }, { data: recipients }] = await Promise.all([
    service
      .from("broadcast_logs")
      .select("id, subject, recipient_count, scope, gender, event_id, sent_at, events ( name )")
      .eq("id", id)
      .single(),
    service
      .from("broadcast_recipients")
      .select("id, volunteer_id, email, first_name, last_name, status, delivered_at, opened_at, clicked_at, bounced_at, created_at")
      .eq("broadcast_id", id)
      .order("last_name", { ascending: true }),
  ]);

  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ log, recipients: recipients ?? [] });
}
