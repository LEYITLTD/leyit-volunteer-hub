import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

type RawRow = {
  id: string;
  station: string;
  scanned_at: string;
  within_time_window: boolean;
  volunteers: { id: string; first_name: string; last_name: string; email: string };
  event_applications: { event_roles: { role_name: string } | { role_name: string }[] };
};

export type CheckInRow = {
  volunteer_id:   string;
  first_name:     string;
  last_name:      string;
  email:          string;
  role_name:      string;
  check_in:       { id: string; scanned_at: string; within_time_window: boolean } | null;
  check_out:      { id: string; scanned_at: string; within_time_window: boolean } | null;
  duration_mins:  number | null;
};

export async function GET(_req: Request, { params }: Params) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const service = createServiceClient();

  const { data, error: dbErr } = await service
    .from("check_ins")
    .select(`
      id, station, scanned_at, within_time_window,
      volunteers!inner(id, first_name, last_name, email),
      event_applications!inner(event_roles!inner(role_name))
    `)
    .eq("event_id", id)
    .order("scanned_at", { ascending: true });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // Group scans by volunteer, pairing entry + exit
  const map = new Map<string, CheckInRow>();

  for (const raw of (data ?? []) as unknown as RawRow[]) {
    const v    = raw.volunteers;
    const role = Array.isArray(raw.event_applications.event_roles)
      ? raw.event_applications.event_roles[0]
      : raw.event_applications.event_roles;

    if (!map.has(v.id)) {
      map.set(v.id, {
        volunteer_id:  v.id,
        first_name:    v.first_name,
        last_name:     v.last_name,
        email:         v.email,
        role_name:     role?.role_name ?? "—",
        check_in:      null,
        check_out:     null,
        duration_mins: null,
      });
    }

    const entry = map.get(v.id)!;
    const scan  = { id: raw.id, scanned_at: raw.scanned_at, within_time_window: raw.within_time_window };

    if (raw.station === "entry") entry.check_in  = scan;
    if (raw.station === "exit")  entry.check_out = scan;
  }

  // Calculate duration where both scans exist
  const rows: CheckInRow[] = Array.from(map.values()).map(row => {
    if (row.check_in && row.check_out) {
      const mins = Math.round(
        (new Date(row.check_out.scanned_at).getTime() - new Date(row.check_in.scanned_at).getTime()) / 60000
      );
      return { ...row, duration_mins: mins };
    }
    return row;
  });

  // Sort: checked-in most recently first
  rows.sort((a, b) => {
    const aTime = a.check_in?.scanned_at ?? "";
    const bTime = b.check_in?.scanned_at ?? "";
    return bTime.localeCompare(aTime);
  });

  return NextResponse.json(rows);
}
