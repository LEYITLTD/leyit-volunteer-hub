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

  // Activity feed — merge 5 streams
  const [newVolunteers, confirmations, publishedEvents, approvals, cancellations] = await Promise.all([
    service.from("volunteers")
      .select("id, first_name, last_name, created_at")
      .order("created_at", { ascending: false })
      .limit(15),

    service.from("event_applications")
      .select("id, confirmed_at, volunteers(first_name, last_name), event_roles(events(name))")
      .eq("status", "confirmed")
      .not("confirmed_at", "is", null)
      .order("confirmed_at", { ascending: false })
      .limit(15),

    service.from("events")
      .select("id, name, published_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(10),

    service.from("volunteer_compliance")
      .select("id, approved_at, volunteers(first_name, last_name)")
      .not("approved_at", "is", null)
      .order("approved_at", { ascending: false })
      .limit(15),

    service.from("event_applications")
      .select("id, cancelled_at, cancelled_by, volunteers(first_name, last_name), event_roles(events(name))")
      .eq("status", "cancelled")
      .not("cancelled_at", "is", null)
      .order("cancelled_at", { ascending: false })
      .limit(15),
  ]);

  type ActivityItem = { id: string; type: string; name: string; action: string; timestamp: string };
  const activity: ActivityItem[] = [];

  for (const v of newVolunteers.data ?? []) {
    activity.push({
      id:        `signup-${v.id}`,
      type:      "signup",
      name:      `${v.first_name} ${v.last_name}`,
      action:    "New volunteer sign-up",
      timestamp: v.created_at,
    });
  }

  for (const a of confirmations.data ?? []) {
    const vol   = a.volunteers as unknown as { first_name: string; last_name: string } | null;
    const event = (a.event_roles as unknown as { events: { name: string } } | null)?.events;
    if (!vol || !event || !a.confirmed_at) continue;
    activity.push({
      id:        `confirm-${a.id}`,
      type:      "confirmed",
      name:      `${vol.first_name} ${vol.last_name}`,
      action:    `Confirmed for ${event.name}`,
      timestamp: a.confirmed_at,
    });
  }

  for (const e of publishedEvents.data ?? []) {
    if (!e.published_at) continue;
    activity.push({
      id:        `event-${e.id}`,
      type:      "event",
      name:      e.name,
      action:    "Published",
      timestamp: e.published_at,
    });
  }

  for (const c of approvals.data ?? []) {
    if (!c.approved_at) continue;
    const vol = c.volunteers as unknown as { first_name: string; last_name: string } | null;
    if (!vol) continue;
    activity.push({
      id:        `approval-${c.id}`,
      type:      "approval",
      name:      `${vol.first_name} ${vol.last_name}`,
      action:    "Compliance approved",
      timestamp: c.approved_at,
    });
  }

  for (const c of cancellations.data ?? []) {
    if (!c.cancelled_at) continue;
    const vol   = c.volunteers as unknown as { first_name: string; last_name: string } | null;
    const event = (c.event_roles as unknown as { events: { name: string } } | null)?.events;
    if (!vol || !event) continue;
    const byAdmin = (c as unknown as Record<string, unknown>).cancelled_by === "admin";
    activity.push({
      id:        `cancel-${c.id}`,
      type:      "cancelled",
      name:      `${vol.first_name} ${vol.last_name}`,
      action:    byAdmin
        ? `Removed from ${event.name} by admin`
        : `Cancelled their place at ${event.name}`,
      timestamp: c.cancelled_at,
    });
  }

  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    totalEvents:     events.count      ?? 0,
    approvedMale:    approvedMale.count  ?? 0,
    approvedFemale:  approvedFemale.count ?? 0,
    pendingChecks:   pendingChecks.count  ?? 0,
    totalVolunteers: totalVolunteers.count ?? 0,
    activity:        activity.slice(0, 20),
  });
}
