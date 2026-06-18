"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type EventInfo = {
  id: string; name: string; description: string | null;
  venue_name: string | null; venue_address: string | null;
  city: string | null; event_start: string; event_end: string;
  doors_open: string | null;
};
type Summary = {
  total_confirmed: number; total_checked_in: number; attendance_rate: number;
  total_hours_mins: number; total_points: number;
  male_confirmed: number; male_checked_in: number;
  female_confirmed: number; female_checked_in: number;
  on_time_count: number; no_show_count: number;
};
type Attendee = {
  volunteer_id: string; first_name: string; last_name: string;
  entry_time: string | null; exit_time: string | null;
  duration_mins: number | null; points: number; on_time: boolean | null;
};
type NoShowRow = { volunteer_id: string; first_name: string; last_name: string };
type RoleData = {
  role: { id: string; role_name: string; capacity: number; gender_restriction: string; station_type: string | null };
  confirmed_count: number; checked_in_count: number;
  attendees: Attendee[]; no_shows: NoShowRow[];
};
type LbEntry = {
  rank: number; volunteer_id: string; first_name: string; last_name: string;
  points: number; duration_mins: number | null;
};
type GlobalNoShow = { volunteer_id: string; first_name: string; last_name: string; role_name: string };
type ReportData = {
  event: EventInfo; summary: Summary; roles: RoleData[];
  leaderboard: LbEntry[]; no_shows: GlobalNoShow[];
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const UK = "Europe/London";

function fmtLongDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: UK,
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: UK });
}
function fmtDur(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
function initials(f: string, l: string) { return `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase(); }
function genderBadge(g: string) {
  if (g === "male")   return { label: "Male only",   bg: "#EFF6FF", color: "#3B82F6", border: "#BFDBFE" };
  if (g === "female") return { label: "Female only", bg: "#FDF2F8", color: "#EC4899", border: "#FBCFE8" };
  return                     { label: "Mixed",       bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" };
}

/* ─── Tiny shared components ─────────────────────────────────────────────── */

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 4, height: 22, background: "linear-gradient(180deg,#C9A227,#A8854A)", borderRadius: 2, flexShrink: 0 }} />
        <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, fontWeight: 700, color: "#1C1917", margin: 0 }}>
          {children}
        </h2>
      </div>
      {sub && <p style={{ fontSize: 12, color: "#A8A29E", marginTop: 4, marginLeft: 14 }}>{sub}</p>}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "linear-gradient(90deg,#C9A22740,#A8854A60,transparent)", margin: "32px 0" }} />;
}

/* ─── Stat card ──────────────────────────────────────────────────────────── */

function StatCard({
  icon, label, value, sub, accentColor,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; accentColor?: string }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #EAE6DD", borderRadius: 14,
      padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)", flex: 1, minWidth: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: "#F3EFE6",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>{icon}</div>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: accentColor ?? "#1C1917", lineHeight: 1, letterSpacing: "-0.02em" }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: "#A8A29E", marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ─── Gender card ────────────────────────────────────────────────────────── */

function GenderCard({ gender, confirmed, checkedIn }: { gender: "male" | "female"; confirmed: number; checkedIn: number }) {
  const met     = confirmed > 0 && checkedIn >= confirmed;
  const partial = confirmed > 0 && checkedIn > 0 && checkedIn < confirmed;
  const none    = confirmed > 0 && checkedIn === 0;
  const empty   = confirmed === 0;

  const statusColor  = empty ? "#A8A29E" : met ? "#16A34A" : none ? "#DC2626" : "#D97706";
  const statusBg     = empty ? "#F9F9F9" : met ? "#F0FDF4" : none ? "#FEF2F2" : "#FFFBEB";
  const statusBorder = empty ? "#E5E7EB" : met ? "#BBF7D0" : none ? "#FECACA" : "#FDE68A";
  const statusLabel  = empty ? "N/A" : met ? "✓ Full" : none ? "✗ No-show" : `${checkedIn}/${confirmed}`;

  const gb = genderBadge(gender);

  const MaleIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={gb.color} strokeWidth="2" strokeLinecap="round">
      <circle cx="10" cy="14" r="5"/><line x1="14.35" y1="9.65" x2="21" y2="3"/>
      <polyline points="16 3 21 3 21 8"/>
    </svg>
  );
  const FemaleIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={gb.color} strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="9" r="6"/><line x1="12" y1="15" x2="12" y2="21"/>
      <line x1="9" y1="19" x2="15" y2="19"/>
    </svg>
  );

  return (
    <div style={{
      flex: 1, minWidth: 0, background: statusBg, border: `1.5px solid ${statusBorder}`,
      borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: gb.bg, border: `1px solid ${gb.border}`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {gender === "male" ? <MaleIcon /> : <FemaleIcon />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
          {gender === "male" ? "Male Volunteers" : "Female Volunteers"}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: "#1C1917", letterSpacing: "-0.02em" }}>{checkedIn}</span>
          <span style={{ fontSize: 13, color: "#78716C" }}>of {confirmed} confirmed</span>
        </div>
      </div>
      <div style={{
        flexShrink: 0, background: statusColor + "18", border: `1px solid ${statusColor}35`,
        color: statusColor, borderRadius: 20, padding: "4px 11px", fontSize: 11, fontWeight: 700,
      }}>
        {statusLabel}
      </div>
    </div>
  );
}

/* ─── Progress bar ───────────────────────────────────────────────────────── */

function GoldBar({ value, max }: { value: number; max: number }) {
  const pct  = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const full = value >= max && max > 0;
  return (
    <div style={{ height: 9, background: "#EAE6DD", borderRadius: 5, overflow: "hidden" }}>
      <div style={{
        width: `${pct}%`, height: "100%", borderRadius: 5,
        background: full ? "linear-gradient(90deg,#22C55E,#16A34A)" : "linear-gradient(90deg,#C9A227,#A8854A)",
      }} />
    </div>
  );
}

/* ─── Attendee table ─────────────────────────────────────────────────────── */

function AttendeeTable({ attendees, startN }: { attendees: Attendee[]; startN: number }) {
  if (attendees.length === 0) {
    return (
      <div style={{ padding: "16px 0", textAlign: "center", color: "#A8A29E", fontSize: 13 }}>
        No check-ins recorded.
      </div>
    );
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#F7F4EE" }}>
            {["#", "Name", "Time in", "Time out", "Duration", "Points"].map((h, i) => (
              <th key={h} style={{
                padding: "7px 12px", textAlign: i === 0 ? "center" : "left",
                fontSize: 10, fontWeight: 700, color: "#A8A29E",
                textTransform: "uppercase", letterSpacing: "0.06em",
                borderBottom: "1px solid #EAE6DD", whiteSpace: "nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {attendees.map((a, i) => (
            <tr key={a.volunteer_id} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAF9", borderBottom: "1px solid #F0EDE7" }}>
              <td style={{ padding: "9px 12px", textAlign: "center", color: "#A8A29E", fontSize: 12 }}>{startN + i}</td>
              <td style={{ padding: "9px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", background: "#F3EFE6",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, color: "#A8854A", flexShrink: 0,
                  }}>{initials(a.first_name, a.last_name)}</div>
                  <div>
                    <div style={{ fontWeight: 600, color: "#1C1917" }}>{a.first_name} {a.last_name}</div>
                    {a.on_time === false && (
                      <div style={{ fontSize: 10, color: "#D97706" }}>Late arrival</div>
                    )}
                  </div>
                </div>
              </td>
              <td style={{ padding: "9px 12px", color: a.entry_time ? "#374151" : "#D1D5DB" }}>
                {a.entry_time ? fmtTime(a.entry_time) : "—"}
              </td>
              <td style={{ padding: "9px 12px", color: a.exit_time ? "#374151" : "#D1D5DB" }}>
                {a.exit_time ? fmtTime(a.exit_time) : "—"}
              </td>
              <td style={{ padding: "9px 12px", fontWeight: a.duration_mins ? 600 : 400, color: a.duration_mins ? "#1C1917" : "#D1D5DB" }}>
                {a.duration_mins ? fmtDur(a.duration_mins) : "—"}
              </td>
              <td style={{ padding: "9px 12px" }}>
                {a.points > 0 ? (
                  <span style={{
                    display: "inline-block", background: "#F3EFE6", color: "#A8854A",
                    fontWeight: 700, fontSize: 12, padding: "2px 9px", borderRadius: 10,
                  }}>{a.points} pts</span>
                ) : <span style={{ color: "#D1D5DB" }}>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Leaderboard ────────────────────────────────────────────────────────── */

function Leaderboard({ entries }: { entries: LbEntry[] }) {
  if (entries.length === 0) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center", color: "#A8A29E", fontSize: 13 }}>
        No points recorded for this event.
      </div>
    );
  }

  const maxPts = entries[0]?.points ?? 1;

  const medals = [
    { bg: "linear-gradient(135deg,#F5D060,#C9A227)", text: "#7A5A10", border: "#E8C440" },
    { bg: "linear-gradient(135deg,#E2E8F0,#94A3B8)", text: "#475569", border: "#CBD5E1" },
    { bg: "linear-gradient(135deg,#FDBA74,#EA580C)", text: "#7C2D12", border: "#FB923C" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {entries.map(e => {
        const medal  = e.rank <= 3 ? medals[e.rank - 1] : null;
        const barPct = maxPts > 0 ? Math.round((e.points / maxPts) * 100) : 0;
        return (
          <div key={e.volunteer_id} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
            background: medal ? "#FFFBF0" : e.rank % 2 === 0 ? "#FAFAF9" : "#fff",
            border: medal ? `1px solid ${medal.border}50` : "1px solid #EAE6DD",
            borderRadius: 10,
          }}>
            {/* Rank badge */}
            <div style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: medal ? medal.bg : "#F3F4F6",
              fontSize: medal ? 13 : 11,
              fontWeight: 800,
              color: medal ? medal.text : "#9CA3AF",
            }}>
              {medal ? ["🥇","🥈","🥉"][e.rank - 1] : e.rank}
            </div>

            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: "#F3EFE6",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#A8854A", flexShrink: 0,
            }}>
              {initials(e.first_name, e.last_name)}
            </div>

            {/* Name + bar */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1C1917" }}>
                  {e.first_name} {e.last_name}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#A8854A", flexShrink: 0, marginLeft: 8 }}>
                  {e.points} pts
                </span>
              </div>
              <div style={{ height: 5, background: "#EAE6DD", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  width: `${barPct}%`, height: "100%", borderRadius: 3,
                  background: medal
                    ? medal.bg
                    : "linear-gradient(90deg,#C9A227,#A8854A)",
                }} />
              </div>
            </div>

            {/* Duration */}
            {e.duration_mins && (
              <div style={{ flexShrink: 0, fontSize: 11, color: "#A8A29E", textAlign: "right" }}>
                {fmtDur(e.duration_mins)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Print styles ───────────────────────────────────────────────────────── */

const PRINT_CSS = `
@media print {
  aside, .lg\\:hidden { display: none !important; }
  .min-h-screen { display: block !important; }
  main { overflow: visible !important; }
  .no-print { display: none !important; }
  body { background: white !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  @page { size: A4; margin: 10mm 12mm; }
}
`;

/* ─── Main page ──────────────────────────────────────────────────────────── */

export default function EventReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data,    setData]    = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/events/${id}/report`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Failed to load report"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #A8854A", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 13, color: "#78716C" }}>Building report…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <p style={{ color: "#EF4444", fontSize: 14 }}>{error ?? "Report unavailable"}</p>
      </div>
    );
  }

  const { event, summary, roles, leaderboard, no_shows } = data;
  const attendanceColor = summary.attendance_rate >= 90 ? "#16A34A" : summary.attendance_rate >= 70 ? "#D97706" : "#DC2626";

  /* Running row counter for attendance table */
  let rowCounter = 1;

  return (
    <>
      <style>{PRINT_CSS}</style>

      {/* ── Screen-only controls ──────────────────────────────────────── */}
      <div className="no-print" style={{
        position: "sticky", top: 0, zIndex: 40, background: "rgba(247,244,238,0.95)",
        backdropFilter: "blur(8px)", borderBottom: "1px solid #EAE6DD",
        display: "flex", alignItems: "center", gap: 12, padding: "10px 24px",
      }}>
        <Link href={`/admin/events/${id}`} style={{
          display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#78716C", textDecoration: "none",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </Link>
        <span style={{ color: "#D1C9C0", fontSize: 14 }}>|</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1C1917", flex: 1 }}>
          {event.name} — Event Report
        </span>
        <button
          onClick={() => window.print()}
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "8px 18px",
            background: "linear-gradient(135deg,#C9A227,#A8854A)", color: "#fff",
            border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Save as PDF
        </button>
      </div>

      {/* ── Report body ───────────────────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 60px", fontFamily: "'Hanken Grotesk', 'Inter', system-ui, sans-serif" }}>

        {/* Gold gradient accent bar */}
        <div style={{ height: 4, background: "linear-gradient(90deg,#C9A227,#A8854A,#C9A22720)", borderRadius: 2, marginBottom: 28 }} />

        {/* ── Event header ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            VolunteerHub · Event Report
          </div>
          <div style={{ fontSize: 10, color: "#A8A29E" }}>
            Generated {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 36, fontWeight: 700, color: "#1C1917",
          margin: "8px 0 10px", lineHeight: 1.1, letterSpacing: "-0.01em",
        }}>
          {event.name}
        </h1>

        {/* Event meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", marginBottom: 28 }}>
          {/* Date + time */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#374151" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8854A" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>
            </svg>
            <span style={{ fontWeight: 600 }}>{fmtLongDate(event.event_start)}</span>
          </div>

          {/* Time slot advertised */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#374151" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8854A" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>{fmtTime(event.event_start)} – {fmtTime(event.event_end)}</span>
            {event.doors_open && (
              <span style={{ fontSize: 12, color: "#A8A29E" }}>(Doors {fmtTime(event.doors_open)})</span>
            )}
          </div>

          {/* City */}
          {event.city && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#374151" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8854A" strokeWidth="2" strokeLinecap="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span>{event.city}</span>
            </div>
          )}

          {/* Venue */}
          {event.venue_name && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#374151" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8854A" strokeWidth="2" strokeLinecap="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>{event.venue_name}</span>
            </div>
          )}
        </div>

        <Divider />

        {/* ── Summary stats ─────────────────────────────────────────────── */}
        <SectionTitle sub="Key numbers from this event">At a Glance</SectionTitle>

        {/* Top 4 stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12, marginBottom: 14 }}>
          <StatCard
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8854A" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
            label="Total Hours"
            value={fmtDur(summary.total_hours_mins)}
            sub={`${summary.total_checked_in} volunteers × avg ${summary.total_checked_in > 0 ? fmtDur(Math.round(summary.total_hours_mins / summary.total_checked_in)) : "—"}`}
          />
          <StatCard
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8854A" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
            label="Points Earned"
            value={summary.total_points.toLocaleString()}
            sub={leaderboard.length > 0 ? `Top: ${leaderboard[0].first_name} ${leaderboard[0].last_name}` : undefined}
            accentColor="#A8854A"
          />
          <StatCard
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8854A" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
            label="Attendance Rate"
            value={`${summary.attendance_rate}%`}
            sub={`${summary.total_checked_in} of ${summary.total_confirmed} checked in`}
            accentColor={attendanceColor}
          />
          <StatCard
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8854A" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
            label="Volunteers"
            value={summary.total_checked_in.toString()}
            sub={summary.no_show_count > 0 ? `${summary.no_show_count} no-show${summary.no_show_count > 1 ? "s" : ""}` : "Everyone attended"}
          />
        </div>

        {/* Extra row: punctuality + no-show indicators */}
        {(summary.on_time_count > 0 || summary.no_show_count > 0) && (
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            {summary.on_time_count > 0 && summary.total_checked_in > 0 && (
              <div style={{
                flex: 1, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10,
                padding: "10px 14px", display: "flex", alignItems: "center", gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span style={{ fontSize: 13, color: "#15803D" }}>
                  <strong>{Math.round((summary.on_time_count / summary.total_checked_in) * 100)}%</strong> arrived on time
                  <span style={{ color: "#86EFAC", marginLeft: 4 }}>({summary.on_time_count} of {summary.total_checked_in})</span>
                </span>
              </div>
            )}
            {summary.no_show_count > 0 && (
              <div style={{
                flex: 1, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10,
                padding: "10px 14px", display: "flex", alignItems: "center", gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span style={{ fontSize: 13, color: "#DC2626" }}>
                  <strong>{summary.no_show_count}</strong> confirmed volunteer{summary.no_show_count > 1 ? "s" : ""} did not attend
                </span>
              </div>
            )}
          </div>
        )}

        {/* Gender cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
          <GenderCard gender="male"   confirmed={summary.male_confirmed}   checkedIn={summary.male_checked_in} />
          <GenderCard gender="female" confirmed={summary.female_confirmed} checkedIn={summary.female_checked_in} />
        </div>

        <Divider />

        {/* ── Role breakdown ────────────────────────────────────────────── */}
        <SectionTitle sub="Requested vs actual attendance per role">Role Breakdown</SectionTitle>

        {roles.length === 0 ? (
          <p style={{ color: "#A8A29E", fontSize: 14 }}>No roles configured for this event.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {roles.map(rd => {
              const gb    = genderBadge(rd.role.gender_restriction);
              const sectionStart = rowCounter;
              rowCounter += rd.attendees.length;
              return (
                <div key={rd.role.id}>
                  {/* Role header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 17, fontWeight: 700, color: "#1C1917", margin: 0 }}>
                          {rd.role.role_name}
                        </h3>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20,
                          background: gb.bg, color: gb.color, border: `1px solid ${gb.border}`,
                          textTransform: "uppercase", letterSpacing: "0.04em",
                        }}>{gb.label}</span>
                        {rd.role.station_type && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB", textTransform: "capitalize" }}>
                            {rd.role.station_type.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: rd.checked_in_count >= rd.role.capacity ? "#16A34A" : "#1C1917" }}>
                        {rd.checked_in_count}
                        <span style={{ fontSize: 13, fontWeight: 400, color: "#A8A29E" }}> / {rd.role.capacity}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#A8A29E" }}>checked in</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom: 14 }}>
                    <GoldBar value={rd.checked_in_count} max={rd.role.capacity} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                      <span style={{ fontSize: 11, color: "#A8A29E" }}>{rd.confirmed_count} confirmed</span>
                      <span style={{ fontSize: 11, color: "#A8A29E" }}>Capacity: {rd.role.capacity}</span>
                    </div>
                  </div>

                  {/* Attendee table */}
                  <div style={{ border: "1px solid #EAE6DD", borderRadius: 10, overflow: "hidden" }}>
                    <AttendeeTable attendees={rd.attendees} startN={sectionStart} />
                  </div>

                  {/* No-shows for this role */}
                  {rd.no_shows.length > 0 && (
                    <div style={{ marginTop: 8, padding: "8px 14px", background: "#FEF9F0", border: "1px solid #FDE68A", borderRadius: 8, display: "flex", flexWrap: "wrap", gap: "4px 12px", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#D97706" }}>Confirmed but absent:</span>
                      {rd.no_shows.map(ns => (
                        <span key={ns.volunteer_id} style={{ fontSize: 12, color: "#92400E" }}>
                          {ns.first_name} {ns.last_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Divider />

        {/* ── Points Leaderboard ────────────────────────────────────────── */}
        <SectionTitle sub="Points earned by volunteers during this event">Points Leaderboard</SectionTitle>
        <Leaderboard entries={leaderboard} />

        {/* ── No-shows summary ─────────────────────────────────────────── */}
        {no_shows.length > 0 && (
          <>
            <Divider />
            <SectionTitle sub="Confirmed volunteers who did not check in">No-Shows</SectionTitle>
            <div style={{ border: "1px solid #FECACA", borderRadius: 12, overflow: "hidden", background: "#FFF5F5" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#FEE2E2" }}>
                    {["Name", "Role"].map(h => (
                      <th key={h} style={{
                        padding: "8px 14px", textAlign: "left",
                        fontSize: 10, fontWeight: 700, color: "#B91C1C",
                        textTransform: "uppercase", letterSpacing: "0.06em",
                        borderBottom: "1px solid #FECACA",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {no_shows.map((ns, i) => (
                    <tr key={ns.volunteer_id} style={{ borderBottom: i < no_shows.length - 1 ? "1px solid #FECACA" : "none" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: "50%", background: "#FEE2E2",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 9, fontWeight: 700, color: "#DC2626", flexShrink: 0,
                          }}>{initials(ns.first_name, ns.last_name)}</div>
                          <span style={{ fontWeight: 600, color: "#1C1917" }}>{ns.first_name} {ns.last_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#78716C" }}>{ns.role_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 16, borderTop: "1px solid #EAE6DD", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, color: "#D1C9C0" }}>VolunteerHub · {event.name}</div>
          <div style={{ fontSize: 11, color: "#D1C9C0" }}>Confidential — Internal use only</div>
        </div>
      </div>
    </>
  );
}
