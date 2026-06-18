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

  // Activity feed — 10 streams in parallel
  const [
    newVolunteers,
    applications,
    confirmations,
    createdEvents,
    publishedEvents,
    approvals,
    cancellations,
    checkIns,
    checkOuts,
    broadcasts,
  ] = await Promise.all([
    // New volunteer registrations
    service.from("volunteers")
      .select("id, first_name, last_name, created_at")
      .order("created_at", { ascending: false })
      .limit(15),

    // Event applications (first sign-up, before admin confirms)
    service.from("event_applications")
      .select("id, applied_at, volunteers(first_name, last_name), event_roles(events(name))")
      .in("status", ["applied", "waitlisted"])
      .not("applied_at", "is", null)
      .order("applied_at", { ascending: false })
      .limit(15),

    // Admin confirmations
    service.from("event_applications")
      .select("id, confirmed_at, volunteers(first_name, last_name), event_roles(events(name))")
      .eq("status", "confirmed")
      .not("confirmed_at", "is", null)
      .order("confirmed_at", { ascending: false })
      .limit(15),

    // Events created
    service.from("events")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(10),

    // Events published
    service.from("events")
      .select("id, name, published_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(10),

    // Compliance approvals
    service.from("volunteer_compliance")
      .select("id, approved_at, volunteers(first_name, last_name)")
      .not("approved_at", "is", null)
      .order("approved_at", { ascending: false })
      .limit(15),

    // Cancellations (volunteer or admin)
    service.from("event_applications")
      .select("id, cancelled_at, cancelled_by, volunteers(first_name, last_name), event_roles(events(name))")
      .eq("status", "cancelled")
      .not("cancelled_at", "is", null)
      .order("cancelled_at", { ascending: false })
      .limit(15),

    // Event check-ins
    service.from("check_ins")
      .select("id, scanned_at, volunteers(first_name, last_name), events(name)")
      .eq("station", "entry")
      .order("scanned_at", { ascending: false })
      .limit(20),

    // Event check-outs
    service.from("check_ins")
      .select("id, scanned_at, volunteers(first_name, last_name), events(name)")
      .eq("station", "exit")
      .order("scanned_at", { ascending: false })
      .limit(20),

    // Broadcast mailshots
    service.from("broadcast_logs")
      .select("id, subject, recipient_count, scope, sent_at")
      .order("sent_at", { ascending: false })
      .limit(10),
  ]);

  type ActivityItem = { id: string; type: string; name: string; action: string; timestamp: string };
  const activity: ActivityItem[] = [];

  for (const v of newVolunteers.data ?? []) {
    activity.push({
      id:        `signup-${v.id}`,
      type:      "signup",
      name:      `${v.first_name} ${v.last_name}`,
      action:    "Registered as a volunteer",
      timestamp: v.created_at,
    });
  }

  for (const a of applications.data ?? []) {
    const vol   = a.volunteers as unknown as { first_name: string; last_name: string } | null;
    const event = (a.event_roles as unknown as { events: { name: string } } | null)?.events;
    const ts    = (a as unknown as Record<string, unknown>).applied_at as string | null;
    if (!vol || !event || !ts) continue;
    activity.push({
      id:        `apply-${a.id}`,
      type:      "applied",
      name:      `${vol.first_name} ${vol.last_name}`,
      action:    `Applied for ${event.name}`,
      timestamp: ts,
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

  for (const e of createdEvents.data ?? []) {
    activity.push({
      id:        `created-${e.id}`,
      type:      "event_created",
      name:      e.name,
      action:    "Event created",
      timestamp: e.created_at,
    });
  }

  for (const e of publishedEvents.data ?? []) {
    if (!e.published_at) continue;
    activity.push({
      id:        `published-${e.id}`,
      type:      "event_published",
      name:      e.name,
      action:    "Event published",
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

  for (const ci of checkIns.data ?? []) {
    const vol   = ci.volunteers as unknown as { first_name: string; last_name: string } | null;
    const event = ci.events    as unknown as { name: string } | null;
    if (!vol || !event) continue;
    activity.push({
      id:        `checkin-${ci.id}`,
      type:      "checkin",
      name:      `${vol.first_name} ${vol.last_name}`,
      action:    `Checked in to ${event.name}`,
      timestamp: ci.scanned_at,
    });
  }

  for (const co of checkOuts.data ?? []) {
    const vol   = co.volunteers as unknown as { first_name: string; last_name: string } | null;
    const event = co.events    as unknown as { name: string } | null;
    if (!vol || !event) continue;
    activity.push({
      id:        `checkout-${co.id}`,
      type:      "checkout",
      name:      `${vol.first_name} ${vol.last_name}`,
      action:    `Checked out of ${event.name}`,
      timestamp: co.scanned_at,
    });
  }

  for (const b of broadcasts.data ?? []) {
    const scope = (b as unknown as Record<string, unknown>).scope as string | null;
    const count = (b as unknown as Record<string, unknown>).recipient_count as number;
    const label = scope === "event" ? "event volunteers" : "all volunteers";
    activity.push({
      id:        `broadcast-${b.id}`,
      type:      "broadcast",
      name:      `"${b.subject}"`,
      action:    `Mailshot sent to ${count} ${label}`,
      timestamp: b.sent_at,
    });
  }

  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    totalEvents:     events.count         ?? 0,
    approvedMale:    approvedMale.count   ?? 0,
    approvedFemale:  approvedFemale.count ?? 0,
    pendingChecks:   pendingChecks.count  ?? 0,
    totalVolunteers: totalVolunteers.count ?? 0,
    activity:        activity.slice(0, 30),
  });
}
