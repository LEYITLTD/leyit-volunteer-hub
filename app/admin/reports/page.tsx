"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type EventRow = {
  id:          string;
  name:        string;
  city:        string | null;
  event_start: string;
  event_end:   string;
  status:      string;
  event_applications: { status: string }[];
  event_roles:        { capacity: number }[];
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London",
  });
}

const STATUS_CHIP: Record<string, { label: string; bg: string; color: string }> = {
  active:    { label: "Active",    bg: "#DCFCE7", color: "#15803D" },
  published: { label: "Published", bg: "#DBEAFE", color: "#1D4ED8" },
  draft:     { label: "Draft",     bg: "#F3F4F6", color: "#4B5563" },
  closed:    { label: "Closed",    bg: "#FEE2E2", color: "#DC2626" },
  archived:  { label: "Archived",  bg: "#F3F4F6", color: "#6B7280" },
};

/* ─── Event row card ─────────────────────────────────────────────────────── */

function EventCard({ event }: { event: EventRow }) {
  const chip = STATUS_CHIP[event.status] ?? STATUS_CHIP.archived;
  const confirmed = event.event_applications.filter(a => a.status === "confirmed").length;
  const capacity  = event.event_roles.reduce((s, r) => s + r.capacity, 0);
  const pct       = capacity > 0 ? Math.min(Math.round((confirmed / capacity) * 100), 100) : 0;
  const isPast    = new Date(event.event_end) < new Date();

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16,
      padding: "16px 20px",
      borderBottom: "1px solid var(--color-card-border)",
    }}>
      {/* Date block */}
      <div style={{
        flexShrink: 0, width: 48, textAlign: "center",
        background: isPast ? "#F8F5F0" : "var(--color-gold-subtle)",
        borderRadius: 10, padding: "8px 6px",
        border: `1px solid ${isPast ? "var(--color-card-border)" : "#E8D9B5"}`,
      }}>
        <div style={{
          fontSize: 20, fontWeight: 700, lineHeight: 1,
          fontFamily: "var(--font-cormorant,'Cormorant Garamond',serif)",
          color: isPast ? "var(--color-text-muted)" : "var(--color-gold)",
        }}>
          {new Date(event.event_start).toLocaleDateString("en-GB", { day: "numeric", timeZone: "Europe/London" })}
        </div>
        <div style={{
          fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
          color: isPast ? "var(--color-text-muted)" : "#A8854A",
          marginTop: 2,
        }}>
          {new Date(event.event_start).toLocaleDateString("en-GB", { month: "short", timeZone: "Europe/London" })}
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {event.name}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
            textTransform: "uppercase", letterSpacing: "0.04em",
            background: chip.bg, color: chip.color, flexShrink: 0,
          }}>
            {chip.label}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {fmtDate(event.event_start)}
          </span>
          {event.city && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--color-text-muted)" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {event.city}
            </span>
          )}
          {capacity > 0 && (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {confirmed} / {capacity} confirmed
            </span>
          )}
        </div>
        {/* Mini capacity bar */}
        {capacity > 0 && (
          <div style={{ marginTop: 7, height: 4, borderRadius: 2, background: "#EDE8DF", overflow: "hidden", maxWidth: 200 }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: isPast ? "#A8A29E" : "linear-gradient(90deg,#C9A227,#A8854A)",
              borderRadius: 2,
            }} />
          </div>
        )}
      </div>

      {/* Action */}
      <Link
        href={`/admin/events/${event.id}/report`}
        target="_blank"
        style={{
          flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
          padding: "8px 14px", borderRadius: 9,
          fontSize: 13, fontWeight: 600,
          background: "var(--color-card)",
          border: "1px solid var(--color-card-border)",
          color: "var(--color-text-secondary)",
          textDecoration: "none",
          transition: "background 0.15s",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        Report
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ opacity: 0.5 }}>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </Link>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function ReportsPage() {
  const [events,  setEvents]  = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    fetch("/api/admin/events")
      .then(r => r.json())
      .then(d => setEvents(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter(e =>
    !search.trim() ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.city ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const past     = filtered.filter(e => new Date(e.event_end) < new Date());
  const upcoming = filtered.filter(e => new Date(e.event_end) >= new Date());

  return (
    <div style={{ padding: "28px 28px 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: "var(--font-cormorant,'Cormorant Garamond',serif)",
          fontSize: 30, fontWeight: 600, color: "var(--color-text-primary)",
          margin: "0 0 4px",
        }}>
          Reports
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
          Select an event to open its full PDF report in a new tab.
        </p>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20, maxWidth: 420 }}>
        <svg
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="search" placeholder="Search by event name or city…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", paddingLeft: 36, paddingRight: 12,
            height: 40, borderRadius: 10, fontSize: 13,
            border: "1px solid var(--color-card-border)",
            background: "var(--color-card)", color: "var(--color-text-primary)",
            outline: "none",
          }}
        />
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%",
            border: "2px solid #A8854A", borderTopColor: "transparent",
            animation: "spin 0.7s linear infinite",
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: "var(--color-card)", border: "1px solid var(--color-card-border)",
          borderRadius: 14, padding: "40px 24px", textAlign: "center",
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>No events found</p>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            {search ? "Try a different search term." : "No events have been created yet."}
          </p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", margin: "0 0 10px" }}>
                Upcoming &amp; active
              </h2>
              <div style={{ background: "var(--color-card)", border: "1px solid var(--color-card-border)", borderRadius: 14, overflow: "hidden" }}>
                {upcoming.map((ev, i) => (
                  <div key={ev.id} style={i === 0 ? undefined : undefined}>
                    <EventCard event={ev} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", margin: "0 0 10px" }}>
                Past events
              </h2>
              <div style={{ background: "var(--color-card)", border: "1px solid var(--color-card-border)", borderRadius: 14, overflow: "hidden" }}>
                {past.map(ev => (
                  <EventCard key={ev.id} event={ev} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
