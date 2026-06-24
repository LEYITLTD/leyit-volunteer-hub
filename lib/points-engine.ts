import type { SupabaseClient } from "@supabase/supabase-js";

/* ──────────────────────────────────────────────────────────────────────────
   Points engine — single source of truth for how attendance points are earned
   and how tiers are derived. All values are DB-driven (points_config /
   points_tiers) so they can be changed from the admin UI without code edits.
   ────────────────────────────────────────────────────────────────────────── */

export type PointsConfig = {
  check_in_points: number;
  check_in_late_points: number;
  check_out_points: number;
  check_out_early_points: number;
  grace_minutes: number;
};

export const DEFAULT_POINTS_CONFIG: PointsConfig = {
  check_in_points: 50,
  check_in_late_points: 25,
  check_out_points: 50,
  check_out_early_points: 25,
  grace_minutes: 10,
};

export type Tier = { name: string; min_points: number };

export const DEFAULT_TIERS: Tier[] = [
  { name: "Bronze", min_points: 0 },
  { name: "Silver", min_points: 300 },
  { name: "Gold", min_points: 800 },
  { name: "Platinum", min_points: 1500 },
];

/* ── Config / tier loaders ─────────────────────────────────────────────── */

export async function getPointsConfig(service: SupabaseClient): Promise<PointsConfig> {
  const { data } = await service
    .from("points_config")
    .select("check_in_points, check_in_late_points, check_out_points, check_out_early_points, grace_minutes")
    .eq("id", true)
    .maybeSingle();
  return { ...DEFAULT_POINTS_CONFIG, ...(data ?? {}) };
}

export async function getTiers(service: SupabaseClient): Promise<Tier[]> {
  const { data } = await service
    .from("points_tiers")
    .select("name, min_points")
    .order("min_points", { ascending: true });
  return data && data.length ? (data as Tier[]) : DEFAULT_TIERS;
}

/* ── Tier resolution ───────────────────────────────────────────────────── */

export function tierForPoints(points: number, tiers: Tier[]): { current: Tier | null; next: Tier | null } {
  const sorted = [...tiers].sort((a, b) => a.min_points - b.min_points);
  let current: Tier | null = null;
  let next: Tier | null = null;
  for (const t of sorted) {
    if (points >= t.min_points) current = t;
    else { next = t; break; }
  }
  return { current, next };
}

/* ── Scan award ────────────────────────────────────────────────────────── */

export type ScanAward = { amount: number; type: "check_in" | "check_out"; description: string; onTime: boolean };

/** Pure calculation: how many points a single entry/exit scan earns. */
export function calcScanPoints(
  station: "entry" | "exit",
  scannedAt: Date,
  eventStart: string | null,
  eventEnd: string | null,
  config: PointsConfig,
): ScanAward {
  const graceMs = config.grace_minutes * 60_000;
  if (station === "entry") {
    // On time if checked in before (or within the grace window after) the event start.
    const onTime = !eventStart || scannedAt.getTime() <= new Date(eventStart).getTime() + graceMs;
    return {
      amount: onTime ? config.check_in_points : config.check_in_late_points,
      type: "check_in",
      description: onTime ? "Checked in on time" : "Checked in after event start",
      onTime,
    };
  }
  // Exit: full credit if leaving at/after the event end (or within the grace window before it).
  const onTime = !eventEnd || scannedAt.getTime() >= new Date(eventEnd).getTime() - graceMs;
  return {
    amount: onTime ? config.check_out_points : config.check_out_early_points,
    type: "check_out",
    description: onTime ? "Checked out at end" : "Left before event end",
    onTime,
  };
}

/**
 * Award points for a single check-in/out scan. Idempotent per check_in row —
 * if this scan already has a transaction, returns the existing amount.
 * Writes a points_transactions row and stamps check_ins.points_awarded.
 */
export async function awardScanPoints(
  service: SupabaseClient,
  params: {
    checkInId: string;
    volunteerId: string;
    eventId: string;
    station: "entry" | "exit";
    scannedAt: Date;
    eventStart: string | null;
    eventEnd: string | null;
    config?: PointsConfig;
  },
): Promise<number> {
  const { checkInId, volunteerId, eventId, station, scannedAt, eventStart, eventEnd } = params;

  // Idempotency: never double-award for the same scan.
  const { data: existing } = await service
    .from("points_transactions")
    .select("amount")
    .eq("check_in_id", checkInId)
    .maybeSingle();
  if (existing) return existing.amount;

  const config = params.config ?? (await getPointsConfig(service));
  const award = calcScanPoints(station, scannedAt, eventStart, eventEnd, config);

  await service.from("points_transactions").insert({
    volunteer_id: volunteerId,
    event_id: eventId,
    check_in_id: checkInId,
    type: award.type,
    amount: award.amount,
    description: award.description,
    awarded_by: null, // auto-awarded
  });

  await service.from("check_ins").update({ points_awarded: award.amount }).eq("id", checkInId);

  return award.amount;
}
