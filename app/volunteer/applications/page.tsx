"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type UpcomingEvent = {
  id:          string;
  name:        string;
  city:        string | null;
  event_start: string;
  event_end:   string;
  role_name:   string;
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Europe/London",
  });
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/London",
  });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function MyEventsPage() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/volunteer/me")
      .then(r => r.json())
      .then(d => setEvents(Array.isArray(d.upcomingEvents) ? d.upcomingEvents : []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
      <div className="mb-6">
        <h1 className="font-display text-[24px] sm:text-[28px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
          My Events
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          {events.length > 0
            ? `${events.length} upcoming confirmed event${events.length !== 1 ? "s" : ""}`
            : "No confirmed events yet"}
        </p>
      </div>

      {events.length === 0 ? (
        <div
          className="rounded-2xl border p-12 flex flex-col items-center gap-4 text-center"
          style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--color-gold-subtle)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-[16px] mb-1" style={{ color: "var(--color-text-primary)" }}>
              No confirmed events yet
            </h2>
            <p className="text-[13px] mb-4" style={{ color: "var(--color-text-secondary)" }}>
              When an admin confirms you for an event, it&apos;ll appear here.
            </p>
            <Link
              href="/volunteer/events"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold"
              style={{ background: "var(--color-gold)", color: "#1A1411" }}
            >
              Browse events
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {events.map((ev) => {
            const days = daysUntil(ev.event_start);
            return (
              <div
                key={ev.id}
                className="rounded-2xl border overflow-hidden"
                style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Date block */}
                  <div
                    className="flex-shrink-0 w-[60px] h-[60px] rounded-xl flex flex-col items-center justify-center"
                    style={{ background: "var(--color-gold-subtle)", border: "1px solid var(--color-gold)" }}
                  >
                    <span className="text-[22px] font-bold leading-none tabular-nums" style={{ color: "var(--color-gold)" }}>
                      {new Date(ev.event_start).toLocaleDateString("en-GB", { day: "numeric", timeZone: "Europe/London" })}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-gold)" }}>
                      {new Date(ev.event_start).toLocaleDateString("en-GB", { month: "short", timeZone: "Europe/London" })}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-[16px] font-semibold leading-snug" style={{ color: "var(--color-text-primary)" }}>
                        {ev.name}
                      </h2>
                      <span
                        className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: "#1A2E1A", color: "#7DE882" }}
                      >
                        Confirmed
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      {ev.city && (
                        <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          {ev.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {fmtTime(ev.event_start)} – {fmtTime(ev.event_end)}
                      </span>
                      <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                        {fmtDate(ev.event_start)}
                      </span>
                    </div>
                    <p className="text-[12px] mt-1.5 font-medium" style={{ color: "var(--color-text-secondary)" }}>
                      Role: {ev.role_name}
                    </p>
                  </div>

                  {/* Days pill */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    <span
                      className="text-[12px] font-semibold px-3 py-1.5 rounded-full"
                      style={{
                        background: days <= 3 ? "var(--color-gold-subtle)" : "#2C2825",
                        color:      days <= 3 ? "var(--color-gold)" : "var(--color-text-muted)",
                        border:     days <= 3 ? "1px solid var(--color-gold)" : "none",
                      }}
                    >
                      {days === 0 ? "Today!" : days === 1 ? "Tomorrow" : `${days} days`}
                    </span>
                    <Link
                      href="/volunteer/qr-code"
                      className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full"
                      style={{ background: "#2C2825", color: "var(--color-text-secondary)" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/>
                        <path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2h-2M20 14v2"/>
                      </svg>
                      My QR
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
