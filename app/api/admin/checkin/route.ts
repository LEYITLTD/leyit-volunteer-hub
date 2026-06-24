import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { createServiceClient } from "@/lib/supabase/service";
import { awardScanPoints } from "@/lib/points-engine";

type CheckinBody = { volunteer_id: string; event_id: string };

export async function POST(req: Request) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { volunteer_id, event_id } = await req.json() as CheckinBody;
  if (!volunteer_id || !event_id) {
    return NextResponse.json({ error: "volunteer_id and event_id are required" }, { status: 400 });
  }

  const service = createServiceClient();

  const [{ data: volunteer }, { data: event }] = await Promise.all([
    service.from("volunteers").select("id, first_name, last_name, email").eq("id", volunteer_id).maybeSingle(),
    service.from("events").select("id, name, event_start, event_end").eq("id", event_id).maybeSingle(),
  ]);

  if (!volunteer) return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });
  if (!event)     return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // Find confirmed application
  const { data: application } = await service
    .from("event_applications")
    .select("id, event_roles(station_window_start, station_window_end)")
    .eq("volunteer_id", volunteer_id)
    .eq("event_id", event_id)
    .eq("status", "confirmed")
    .maybeSingle();

  if (!application) {
    return NextResponse.json({
      error: `${volunteer.first_name} ${volunteer.last_name} does not have a confirmed spot at this event.`,
      volunteer,
    }, { status: 400 });
  }

  // Check existing check-ins for this application
  const { data: existing } = await service
    .from("check_ins")
    .select("id, station, scanned_at")
    .eq("application_id", application.id)
    .order("scanned_at", { ascending: true });

  const hasEntry = existing?.some(s => s.station === "entry");
  const hasExit  = existing?.some(s => s.station === "exit");

  if (hasEntry && hasExit) {
    return NextResponse.json({
      already_complete: true,
      volunteer,
      message: `${volunteer.first_name} has already checked in and out.`,
    });
  }

  const station: "entry" | "exit" = hasEntry ? "exit" : "entry";
  const scanType = station === "entry" ? "check_in" : "check_out";
  const now = new Date();

  // within_time_window: check against role's station window if set
  const role = Array.isArray(application.event_roles) ? application.event_roles[0] : application.event_roles;
  const within_time_window = role?.station_window_start && role?.station_window_end
    ? now >= new Date(role.station_window_start) && now <= new Date(role.station_window_end)
    : true;

  // Insert check_in row — points_awarded stays at default 0; points engine will update it later
  const { data: checkIn, error: ciErr } = await service
    .from("check_ins")
    .insert({
      application_id:    application.id,
      volunteer_id,
      event_id,
      station,
      scanned_at:        now.toISOString(),
      within_time_window,
    })
    .select()
    .single();

  if (ciErr || !checkIn) {
    return NextResponse.json({ error: ciErr?.message ?? "Failed to record scan" }, { status: 500 });
  }

  // Award attendance points automatically (config-driven). Never block the scan
  // if the points engine errors — the check-in is already recorded.
  let points_awarded = 0;
  try {
    points_awarded = await awardScanPoints(service, {
      checkInId:   checkIn.id,
      volunteerId: volunteer_id,
      eventId:     event_id,
      station,
      scannedAt:   now,
      eventStart:  event.event_start,
      eventEnd:    event.event_end,
    });
  } catch {
    // points failure is non-fatal
  }

  return NextResponse.json({
    success:   true,
    scan_type: scanType,
    volunteer,
    event:     { id: event.id, name: event.name },
    check_in:  checkIn,
    points_awarded,
  });
}
