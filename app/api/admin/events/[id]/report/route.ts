import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

type VolRow = {
  first_name: string; last_name: string; email: string; gender: string | null;
};
type AppRow = {
  id: string; role_id: string; volunteer_id: string;
  volunteers: VolRow | null;
};
type RoleRow = {
  id: string; role_name: string; capacity: number;
  gender_restriction: string; station_type: string | null;
  station_window_start: string | null; station_window_end: string | null;
};
type CIRaw = { volunteer_id: string; station: string; scanned_at: string; within_time_window: boolean };
type PtRaw = { volunteer_id: string; amount: number };

export async function GET(_req: Request, { params }: Params) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id: eventId } = await params;
  const service = createServiceClient();

  const [
    { data: event },
    { data: roles_raw },
    { data: apps_raw },
    { data: ci_raw },
    { data: pts_raw },
  ] = await Promise.all([
    service
      .from("events")
      .select("id, name, description, venue_name, venue_address, city, event_start, event_end, doors_open")
      .eq("id", eventId)
      .single(),
    service
      .from("event_roles")
      .select("id, role_name, capacity, gender_restriction, station_type, station_window_start, station_window_end")
      .eq("event_id", eventId)
      .order("role_name"),
    service
      .from("event_applications")
      .select("id, role_id, volunteer_id, volunteers(id, first_name, last_name, email, gender)")
      .eq("event_id", eventId)
      .eq("status", "confirmed"),
    service
      .from("check_ins")
      .select("volunteer_id, station, scanned_at, within_time_window")
      .eq("event_id", eventId),
    service
      .from("points_transactions")
      .select("volunteer_id, amount")
      .eq("event_id", eventId),
  ]);

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const roles = (roles_raw ?? []) as RoleRow[];
  const apps  = (apps_raw  ?? []) as unknown as AppRow[];
  const cis   = (ci_raw    ?? []) as unknown as CIRaw[];
  const pts   = (pts_raw   ?? []) as PtRaw[];

  /* ── Index check-ins per volunteer ──────────────────────────────────────── */
  const ciByVol = new Map<string, { entry: CIRaw | null; exit: CIRaw | null }>();
  for (const ci of cis) {
    if (!ciByVol.has(ci.volunteer_id)) ciByVol.set(ci.volunteer_id, { entry: null, exit: null });
    const rec = ciByVol.get(ci.volunteer_id)!;
    if (ci.station === "entry") rec.entry = ci;
    if (ci.station === "exit")  rec.exit  = ci;
  }

  /* ── Index points per volunteer ──────────────────────────────────────────── */
  const ptsByVol = new Map<string, number>();
  for (const pt of pts) ptsByVol.set(pt.volunteer_id, (ptsByVol.get(pt.volunteer_id) ?? 0) + pt.amount);

  function durMins(entry: string, exit: string) {
    return Math.round((new Date(exit).getTime() - new Date(entry).getTime()) / 60000);
  }

  /* ── Per-role data ───────────────────────────────────────────────────────── */
  const roleData = roles.map(role => {
    const roleApps = apps.filter(a => a.role_id === role.id);

    const allAttendees = roleApps.map(app => {
      const vol  = app.volunteers!;
      const ci   = ciByVol.get(app.volunteer_id);
      const entry = ci?.entry?.scanned_at ?? null;
      const exit  = ci?.exit?.scanned_at  ?? null;
      return {
        volunteer_id: app.volunteer_id,
        first_name:   vol.first_name,
        last_name:    vol.last_name,
        entry_time:   entry,
        exit_time:    exit,
        duration_mins: entry && exit ? durMins(entry, exit) : null,
        points:       ptsByVol.get(app.volunteer_id) ?? 0,
        on_time:      ci?.entry?.within_time_window ?? null,
      };
    });

    const attendees = allAttendees.filter(a => a.entry_time !== null);
    const no_shows  = allAttendees.filter(a => a.entry_time === null).map(a => ({
      volunteer_id: a.volunteer_id, first_name: a.first_name, last_name: a.last_name,
    }));

    attendees.sort((a, b) =>
      (a.entry_time ?? "").localeCompare(b.entry_time ?? "")
    );

    return { role, confirmed_count: roleApps.length, checked_in_count: attendees.length, attendees, no_shows };
  });

  /* ── Gender summary ──────────────────────────────────────────────────────── */
  const maleApps   = apps.filter(a => a.volunteers?.gender === "male");
  const femaleApps = apps.filter(a => a.volunteers?.gender === "female");
  const maleIn     = maleApps.filter(a => ciByVol.get(a.volunteer_id)?.entry).length;
  const femaleIn   = femaleApps.filter(a => ciByVol.get(a.volunteer_id)?.entry).length;

  /* ── Total hours ─────────────────────────────────────────────────────────── */
  let totalHoursMins = 0;
  for (const [, ci] of ciByVol) {
    if (ci.entry && ci.exit) totalHoursMins += durMins(ci.entry.scanned_at, ci.exit.scanned_at);
  }

  /* ── Counts ──────────────────────────────────────────────────────────────── */
  const totalConfirmed = apps.length;
  const totalCheckedIn = [...ciByVol.values()].filter(ci => ci.entry).length;
  const onTimeCount    = [...ciByVol.values()].filter(ci => ci.entry?.within_time_window === true).length;
  const noShowCount    = totalConfirmed - totalCheckedIn;
  const totalPoints    = pts.reduce((s, p) => s + p.amount, 0);

  /* ── Leaderboard ─────────────────────────────────────────────────────────── */
  const lbMap = new Map<string, { first_name: string; last_name: string; points: number; duration_mins: number | null }>();
  for (const app of apps) {
    const vol = app.volunteers!;
    const ci  = ciByVol.get(app.volunteer_id);
    const dm  = ci?.entry && ci?.exit ? durMins(ci.entry.scanned_at, ci.exit.scanned_at) : null;
    lbMap.set(app.volunteer_id, {
      first_name:   vol.first_name,
      last_name:    vol.last_name,
      points:       ptsByVol.get(app.volunteer_id) ?? 0,
      duration_mins: dm,
    });
  }
  const leaderboard = [...lbMap.entries()]
    .map(([vid, d]) => ({ volunteer_id: vid, ...d }))
    .sort((a, b) => b.points - a.points || (b.duration_mins ?? 0) - (a.duration_mins ?? 0))
    .map((v, i) => ({ ...v, rank: i + 1 }));

  /* ── Global no-shows ─────────────────────────────────────────────────────── */
  const allNoShows = roleData.flatMap(r =>
    r.no_shows.map(ns => ({ ...ns, role_name: r.role.role_name }))
  );

  return NextResponse.json({
    event,
    summary: {
      total_confirmed: totalConfirmed,
      total_checked_in: totalCheckedIn,
      attendance_rate: totalConfirmed > 0 ? Math.round((totalCheckedIn / totalConfirmed) * 100) : 0,
      total_hours_mins: totalHoursMins,
      total_points: totalPoints,
      male_confirmed: maleApps.length,
      male_checked_in: maleIn,
      female_confirmed: femaleApps.length,
      female_checked_in: femaleIn,
      on_time_count: onTimeCount,
      no_show_count: noShowCount,
    },
    roles: roleData,
    leaderboard,
    no_shows: allNoShows,
  });
}
