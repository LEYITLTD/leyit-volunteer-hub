"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ── Types ──────────────────────────────────────────────── */

type Volunteer = {
  id:         string;
  first_name: string;
  last_name:  string;
  email:      string;
  volunteer_compliance: { lseg_status: string | null } | null;
};

type UpcomingEvent = {
  id:          string;
  name:        string;
  city:        string | null;
  event_start: string;
  event_end:   string;
  role_name:   string;
};

type Tier = { name: string; min_points: number };
type MeResponse = {
  volunteer:      Volunteer;
  totalPoints:    number;
  tier:           Tier | null;
  nextTier:       Tier | null;
  confirmedCount: number;
  upcomingEvents: UpcomingEvent[];
};

type EventItem = {
  id:           string;
  name:         string;
  city:         string | null;
  event_start:  string;
  status:       string;
  myApplication: { status: string } | null;
};

/* ── Helpers ─────────────────────────────────────────────── */

const TIER_STYLE: Record<string, { emoji: string; color: string }> = {
  Bronze:   { emoji: "🥉", color: "#CD7F32" },
  Silver:   { emoji: "🥈", color: "#C0C0C0" },
  Gold:     { emoji: "🥇", color: "#E7C766" },
  Platinum: { emoji: "💎", color: "#8FD0E8" },
};

function daysUntil(dateStr: string): number {
  const now    = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const DATE_TINTS = [
  { bg: "#F5ECD6", color: "#8A6D2F" },
  { bg: "#E7EEF6", color: "#1D4ED8" },
  { bg: "#EAF3EC", color: "#15803D" },
];

/* ── Dashboard ───────────────────────────────────────────── */

export default function VolunteerDashboard() {
  const [meData,     setMeData]     = useState<MeResponse | null>(null);
  const [openEvents, setOpenEvents] = useState<EventItem[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/volunteer/me").then(r => r.json()),
      fetch("/api/volunteer/events").then(r => r.ok ? r.json() : []),
    ]).then(([me, evts]) => {
      setMeData(me);
      const list: EventItem[] = Array.isArray(evts) ? evts : [];
      setOpenEvents(list.filter(e => e.myApplication === null));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "#A8854A", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!meData) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p style={{ fontSize: 14, color: "#78716C" }}>Unable to load your profile.</p>
      </div>
    );
  }

  const { volunteer, confirmedCount, upcomingEvents, totalPoints, tier, nextTier } = meData;
  const nextEvent   = upcomingEvents[0] ?? null;
  const daysToNext  = nextEvent ? daysUntil(nextEvent.event_start) : null;
  const tierStyle   = tier ? TIER_STYLE[tier.name] ?? null : null;
  const toNext      = nextTier ? Math.max(0, nextTier.min_points - totalPoints) : 0;
  const initials    = `${volunteer.first_name[0] ?? ""}${volunteer.last_name[0] ?? ""}`.toUpperCase();
  const fullName    = `${volunteer.first_name} ${volunteer.last_name}`;

  return (
    <div style={{ flex: 1 }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 22px 14px" }}>
        <div>
          <div style={{ fontSize: 13, color: "#78716C" }}>Assalamu alaikum,</div>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 26, fontWeight: 700, color: "#1C1917", lineHeight: 1.25,
          }}>
            {fullName}
          </div>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: "50%", background: "#A8854A",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700, flexShrink: 0,
        }}>
          {initials}
        </div>
      </div>

      {/* ── T&C / FAQ banner ───────────────────────────────── */}
      <div style={{ padding: "0 22px 12px", display: "flex", gap: 10 }}>
        <Link
          href="/terms"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 12, fontWeight: 600, color: "#78716C",
            background: "#fff", border: "1px solid #EAE6DD",
            borderRadius: 20, padding: "6px 14px", textDecoration: "none",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Terms &amp; Conditions
        </Link>
        <Link
          href="/faq"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 12, fontWeight: 600, color: "#78716C",
            background: "#fff", border: "1px solid #EAE6DD",
            borderRadius: 20, padding: "6px 14px", textDecoration: "none",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          FAQ
        </Link>
      </div>

      <div style={{ padding: "0 22px" }}>

        {/* ── Points card ────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg,#1F1B17,#2C2620)",
          borderRadius: 18, padding: 20, position: "relative", overflow: "hidden",
          marginBottom: 13,
        }}>
          {/* Gold glow */}
          <div style={{
            position: "absolute", right: -30, top: -30, width: 130, height: 130,
            borderRadius: "50%",
            background: "radial-gradient(circle,rgba(201,162,39,0.32),transparent 70%)",
          }} />

          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(243,233,210,0.7)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Total Points
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 42, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              {totalPoints.toLocaleString()}
            </div>
            {tier && (
              <span style={{
                background: "rgba(201,162,39,0.2)", color: tierStyle?.color ?? "#E7C766",
                fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
              }}>
                {tierStyle?.emoji ?? "🏅"} {tier.name} tier
              </span>
            )}
          </div>

          {nextTier ? (
            <>
              <div style={{ height: 6, background: "rgba(255,255,255,0.12)", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                <div style={{
                  width: `${Math.min(100, Math.round((totalPoints / nextTier.min_points) * 100))}%`,
                  height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#C9A227,#E7C766)",
                }} />
              </div>
              <div style={{ fontSize: 12, color: "rgba(243,233,210,0.7)" }}>
                {toNext.toLocaleString()} points to {nextTier.name}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "rgba(243,233,210,0.7)" }}>Top tier reached 🎉</div>
          )}
        </div>

        {/* ── Stats row ──────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 13, marginBottom: 20 }}>
          {/* Events confirmed */}
          <div style={{
            flex: 1, background: "#fff", border: "1px solid #EAE6DD",
            borderRadius: 15, padding: 15,
          }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "#78716C", fontWeight: 600, marginBottom: 4 }}>
              Events
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#1C1917" }}>
              {confirmedCount}
            </div>
          </div>

          {/* Days to go */}
          <div style={{
            flex: 1,
            background: nextEvent ? "#F3EFE6" : "#fff",
            border: nextEvent ? "1px solid #A8854A" : "1px solid #EAE6DD",
            borderRadius: 15, padding: 15,
          }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "#78716C", fontWeight: 600, marginBottom: 4 }}>
              Days to go
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#1C1917" }}>
              {daysToNext !== null ? daysToNext : "—"}
            </div>
          </div>
        </div>

        {/* ── Next event ─────────────────────────────────────── */}
        {nextEvent && (
          <div style={{ marginBottom: 22 }}>
            <div style={{
              fontSize: 13, textTransform: "uppercase", letterSpacing: "0.07em",
              color: "#78716C", fontWeight: 700, marginBottom: 11,
            }}>
              Your next event
            </div>
            <div style={{ background: "#fff", border: "1px solid #EAE6DD", borderRadius: 16, padding: 17 }}>
              <div style={{ fontSize: 16.5, fontWeight: 700, color: "#1C1917", marginBottom: 4 }}>
                {nextEvent.name}
              </div>
              <div style={{ fontSize: 13, color: "#78716C", marginBottom: 2 }}>
                {new Date(nextEvent.event_start).toLocaleDateString("en-GB", {
                  weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London",
                })}
                {nextEvent.city ? ` · ${nextEvent.city}` : ""}
              </div>
              <div style={{ fontSize: 13, color: "#78716C", marginBottom: 12 }}>
                {nextEvent.role_name}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{
                  background: "#DCFCE7", color: "#15803D",
                  fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 20,
                }}>
                  Confirmed
                </span>
              </div>

              <Link
                href="/volunteer/qr-code"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  width: "100%", background: "#1A1714", color: "#fff",
                  border: "none", borderRadius: 10, padding: "11px",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="3" height="3" /><rect x="18" y="18" width="3" height="3" />
                </svg>
                Show check-in QR
              </Link>
            </div>
          </div>
        )}

        {/* ── Open events ────────────────────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
            <div style={{
              fontSize: 13, textTransform: "uppercase", letterSpacing: "0.07em",
              color: "#78716C", fontWeight: 700,
            }}>
              Open events
            </div>
            <Link href="/volunteer/events" style={{ fontSize: 13, color: "#A8854A", fontWeight: 600, textDecoration: "none" }}>
              See all
            </Link>
          </div>

          {openEvents.length === 0 ? (
            <div style={{ fontSize: 13, color: "#A8A29E", textAlign: "center", padding: "20px 0" }}>
              No open events right now
            </div>
          ) : (
            openEvents.slice(0, 2).map((ev, idx) => {
              const tint    = DATE_TINTS[idx % 3];
              const d       = new Date(ev.event_start);
              const dayNum  = d.toLocaleDateString("en-GB", { day: "numeric",   timeZone: "Europe/London" });
              const monAbbr = d.toLocaleDateString("en-GB", { month: "short",   timeZone: "Europe/London" }).toUpperCase();
              return (
                <Link
                  key={ev.id}
                  href="/volunteer/events"
                  style={{
                    display: "flex", alignItems: "center", gap: 13,
                    background: "#fff", border: "1px solid #EAE6DD",
                    borderRadius: 15, padding: 14, marginBottom: 11,
                    textDecoration: "none",
                  }}
                >
                  {/* Date block */}
                  <div style={{
                    width: 46, height: 46, borderRadius: 12,
                    background: tint.bg, color: tint.color,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{dayNum}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{monAbbr}</span>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: "#1C1917", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.name}
                    </div>
                    {ev.city && (
                      <div style={{ fontSize: 12.5, color: "#78716C" }}>{ev.city}</div>
                    )}
                  </div>

                  {/* Arrow */}
                  <span style={{ color: "#C9C1B2", fontSize: 20, lineHeight: 1, flexShrink: 0 }}>›</span>
                </Link>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
