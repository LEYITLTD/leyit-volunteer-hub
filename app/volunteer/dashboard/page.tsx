"use client";

import { useEffect, useState } from "react";

type Compliance = {
  dbs_status:     string | null;
  overall_status: string | null;
};

type Volunteer = {
  id:         string;
  first_name: string;
  last_name:  string;
  email:      string;
  gender:     "male" | "female" | null;
  volunteer_compliance: Compliance | null;
};

type UpcomingEvent = {
  id:          string;
  name:        string;
  city:        string | null;
  event_start: string;
  event_end:   string;
  role_name:   string;
};

type MeResponse = {
  volunteer:      Volunteer;
  totalPoints:    number;
  confirmedCount: number;
  upcomingEvents: UpcomingEvent[];
};

const TIERS = [
  { label: "Certificate", min: 100,  color: "#9E9690" },
  { label: "Silver",      min: 250,  color: "#A8B5C2" },
  { label: "Gold",        min: 400,  color: "var(--color-gold)" },
];

function getTier(pts: number) {
  if (pts >= 400) return TIERS[2];
  if (pts >= 250) return TIERS[1];
  if (pts >= 100) return TIERS[0];
  return null;
}

const DBS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  not_uploaded: { label: "Not uploaded",  bg: "#2C2825", color: "#C5BFB8" },
  pending:      { label: "Pending review", bg: "#3A2E1A", color: "#F0B94A" },
  verified:     { label: "Verified",       bg: "#1A2E1A", color: "#7DE882" },
  rejected:     { label: "Rejected",       bg: "#2E1A1A", color: "#FF8E8E" },
};

const OVERALL_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  pending:  { label: "Pending approval", bg: "#3A2E1A", color: "#F0B94A" },
  approved: { label: "Approved",          bg: "#1A2E1A", color: "#7DE882" },
  rejected: { label: "Rejected",          bg: "#2E1A1A", color: "#FF8E8E" },
};

function Badge({ map, value }: { map: typeof DBS_BADGE; value: string | null }) {
  const cfg = map[value ?? "not_uploaded"] ?? { label: value ?? "—", bg: "#2C2825", color: "#C5BFB8" };
  return (
    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function fmtEventDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    timeZone: "Europe/London",
  });
}

function fmtEventTime(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/London",
  });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function VolunteerDashboard() {
  const [data, setData]     = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Points hardcoded at 1000 as per spec until real transactions exist
  const POINTS = 1000;

  useEffect(() => {
    fetch("/api/volunteer/me")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>Unable to load your profile.</p>
      </div>
    );
  }

  const { volunteer, confirmedCount, upcomingEvents } = data;
  const compliance = volunteer.volunteer_compliance;
  const tier = getTier(POINTS);
  const nextEvent = upcomingEvents[0] ?? null;
  const daysToNext = nextEvent ? daysUntil(nextEvent.event_start) : null;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="font-display text-[26px] sm:text-[30px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Welcome back, {volunteer.first_name}!
        </h1>
        <p className="text-[14px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Here&apos;s an overview of your volunteer activity.
        </p>
      </div>

      {/* Stats row */}
      <div className={`grid gap-3 sm:gap-4 mb-5 ${nextEvent ? "grid-cols-3" : "grid-cols-2"}`}>
        <div className="rounded-xl border p-4 sm:p-5 text-center" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <p className="font-ui text-[24px] sm:text-[28px] font-bold tabular-nums" style={{ color: "var(--color-gold)" }}>
            {POINTS.toLocaleString()}
          </p>
          <p className="text-[11px] uppercase tracking-[0.06em] mt-1" style={{ color: "var(--color-text-muted)" }}>Points</p>
        </div>

        <div className="rounded-xl border p-4 sm:p-5 text-center" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <p className="font-ui text-[24px] sm:text-[28px] font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
            {confirmedCount}
          </p>
          <p className="text-[11px] uppercase tracking-[0.06em] mt-1" style={{ color: "var(--color-text-muted)" }}>Events confirmed</p>
        </div>

        {/* Conditional: days to next event */}
        {nextEvent && daysToNext !== null && (
          <div className="rounded-xl border p-4 sm:p-5 text-center" style={{ background: "var(--color-gold-subtle)", borderColor: "var(--color-gold)" }}>
            <p className="font-ui text-[24px] sm:text-[28px] font-bold tabular-nums" style={{ color: "var(--color-gold)" }}>
              {daysToNext === 0 ? "Today" : daysToNext === 1 ? "1" : daysToNext.toString()}
            </p>
            <p className="text-[11px] uppercase tracking-[0.06em] mt-1" style={{ color: "var(--color-gold)" }}>
              {daysToNext === 0 ? "Event day!" : daysToNext === 1 ? "Day to go" : "Days to go"}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Points card */}
        <div className="rounded-xl border p-5 sm:p-6" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-1" style={{ color: "var(--color-text-muted)" }}>Volunteer points</p>
              <p className="font-ui text-[42px] sm:text-[48px] font-bold leading-none tabular-nums" style={{ color: "var(--color-gold)" }}>
                {POINTS.toLocaleString()}
              </p>
            </div>
            {tier && (
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex-shrink-0"
                style={{ background: "var(--color-gold-subtle)", color: "var(--color-gold)", border: "1px solid var(--color-gold)" }}
              >
                {tier.label} Tier
              </span>
            )}
          </div>

          {/* Tier progress */}
          <div className="space-y-2.5 mt-4">
            {TIERS.map(({ label, min, color }) => {
              const reached = POINTS >= min;
              return (
                <div key={label} className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: reached ? color : "#3A3530" }}
                  />
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#2C2825" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width:      reached ? "100%" : `${Math.min((POINTS / min) * 100, 100)}%`,
                        background: reached ? color : "#4A4440",
                      }}
                    />
                  </div>
                  <span className="text-[11px] w-[80px] text-right flex-shrink-0" style={{ color: reached ? color : "#4A4440" }}>
                    {reached ? `✓ ${label}` : `${min.toLocaleString()} pts`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compliance card */}
        <div className="rounded-xl border p-5 sm:p-6" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-4" style={{ color: "var(--color-text-muted)" }}>Compliance status</p>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>DBS certificate</span>
              <Badge map={DBS_BADGE} value={compliance?.dbs_status ?? null} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>Account status</span>
              <Badge map={OVERALL_BADGE} value={compliance?.overall_status ?? null} />
            </div>
          </div>

          {(!compliance?.dbs_status || compliance.dbs_status === "not_uploaded") && (
            <div
              className="mt-5 rounded-lg p-3.5 text-[12px] leading-relaxed"
              style={{ background: "var(--color-warning-bg)", color: "var(--color-warning)" }}
            >
              <strong>Action needed:</strong> Upload your DBS certificate so we can verify your account and assign you to events.
            </div>
          )}

          {compliance?.overall_status === "approved" && (
            <div
              className="mt-5 rounded-lg p-3.5 text-[12px] leading-relaxed"
              style={{ background: "#1A2E1A", color: "#7DE882" }}
            >
              Your account is fully verified. You can now apply for events.
            </div>
          )}
        </div>

        {/* Upcoming events */}
        <div className="lg:col-span-2 rounded-xl border p-5 sm:p-6" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-4" style={{ color: "var(--color-text-muted)" }}>Upcoming events</p>

          {upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#4A4440" }}>
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>No upcoming events</p>
              <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>Confirmed events will appear here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border p-4"
                  style={{ borderColor: "var(--color-card-border)", background: "var(--color-bg)" }}
                >
                  {/* Date block */}
                  <div
                    className="flex-shrink-0 w-[52px] h-[52px] rounded-xl flex flex-col items-center justify-center"
                    style={{ background: "var(--color-gold-subtle)", border: "1px solid var(--color-gold)" }}
                  >
                    <span className="text-[18px] font-bold leading-none tabular-nums" style={{ color: "var(--color-gold)" }}>
                      {new Date(ev.event_start).toLocaleDateString("en-GB", { day: "numeric", timeZone: "Europe/London" })}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-gold)" }}>
                      {new Date(ev.event_start).toLocaleDateString("en-GB", { month: "short", timeZone: "Europe/London" })}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold leading-snug truncate" style={{ color: "var(--color-text-primary)" }}>
                      {ev.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      {ev.city && (
                        <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          {ev.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {fmtEventTime(ev.event_start)} – {fmtEventTime(ev.event_end)}
                      </span>
                      <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                        {fmtEventDate(ev.event_start)}
                      </span>
                    </div>
                  </div>

                  {/* Role badge */}
                  <div className="flex-shrink-0">
                    <span
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
                      style={{ background: "#1A2E1A", color: "#7DE882" }}
                    >
                      {ev.role_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
