import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id: eventId } = await params;
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";

  const service = createServiceClient();

  // Fetch confirmed applications for this event, with volunteer and check-in info
  const { data: apps, error: dbErr } = await service
    .from("event_applications")
    .select(`
      id,
      role_id,
      volunteer_id,
      volunteers ( id, first_name, last_name, email ),
      event_roles ( role_name ),
      check_ins ( id, station, scanned_at )
    `)
    .eq("event_id", eventId)
    .eq("status", "confirmed");

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  type Row = {
    id: string;
    role_id: string;
    volunteer_id: string;
    volunteers: { id: string; first_name: string; last_name: string; email: string } | null;
    event_roles: { role_name: string } | null;
    check_ins: { id: string; station: string; scanned_at: string }[];
  };

  const rows = (apps ?? []) as unknown as Row[];

  // Filter by name query
  const lower = q.toLowerCase();
  const filtered = q
    ? rows.filter(r => {
        const v = r.volunteers;
        if (!v) return false;
        const full = `${v.first_name} ${v.last_name}`.toLowerCase();
        return full.includes(lower) || v.first_name.toLowerCase().includes(lower) || v.last_name.toLowerCase().includes(lower);
      })
    : rows;

  const result = filtered.map(r => {
    const v         = r.volunteers!;
    const checkins  = r.check_ins ?? [];
    const hasEntry  = checkins.some(c => c.station === "entry");
    const hasExit   = checkins.some(c => c.station === "exit");
    return {
      application_id: r.id,
      volunteer_id:   r.volunteer_id,
      first_name:     v.first_name,
      last_name:      v.last_name,
      email:          v.email,
      role_name:      (r.event_roles as unknown as { role_name: string } | null)?.role_name ?? "",
      checked_in:     hasEntry,
      checked_out:    hasExit,
    };
  });

  // Sort: not-yet-checked-in first, then alpha
  result.sort((a, b) => {
    if (a.checked_in !== b.checked_in) return a.checked_in ? 1 : -1;
    return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
  });

  return NextResponse.json(result);
}
