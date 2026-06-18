"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Activity = { id: string; type: string; name: string; action: string; timestamp: string };
type Stats = {
  totalEvents:     number;
  approvedMale:    number;
  approvedFemale:  number;
  pendingChecks:   number;
  totalVolunteers: number;
  activity:        Activity[];
};

const UK_TZ = "Europe/London";

function fmtActivityTime(ts: string) {
  const d   = new Date(ts);
  const now = new Date();
  // Compare dates in UK time
  const dStr   = d.toLocaleDateString("en-GB",   { timeZone: UK_TZ });
  const nowStr = now.toLocaleDateString("en-GB", { timeZone: UK_TZ });
  if (dStr === nowStr) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: UK_TZ });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: UK_TZ });
}

function StatCard({
  label, value, icon, href, color, bgColor, warn,
}: {
  label: string; value: number; icon: React.ReactNode;
  href: string; color: string; bgColor: string; warn?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border p-5 flex flex-col transition-all hover:opacity-90"
      style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)", minHeight: 130 }}
    >
      {/* Label row with icon chip */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: bgColor, color }}
        >
          {icon}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] leading-tight" style={{ color: "var(--color-text-muted)" }}>
          {label}
        </span>
      </div>

      {/* Number — dominant */}
      <p
        className="font-ui text-[42px] sm:text-[48px] font-bold leading-none tabular-nums mt-auto"
        style={{ color }}
      >
        {value.toLocaleString()}
      </p>

      {/* Badge */}
      {warn && value > 0 && (
        <span
          className="mt-2.5 self-start text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
          style={{ background: "#3A2E1A", color: "#F0B94A" }}
        >
          Needs attention
        </span>
      )}
    </Link>
  );
}

export default function AdminOverviewPage() {
  const [data,    setData]    = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const STAT_CARDS = data ? [
    {
      label:   "Total Events",
      value:   data.totalEvents,
      href:    "/admin/events",
      color:   "var(--color-gold)",
      bgColor: "var(--color-gold-subtle)",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
    },
    {
      label:   "Approved Brothers",
      value:   data.approvedMale,
      href:    "/admin/volunteers",
      color:   "#88CCFF",
      bgColor: "#1A263A",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
    {
      label:   "Approved Sisters",
      value:   data.approvedFemale,
      href:    "/admin/volunteers",
      color:   "#EE7DC8",
      bgColor: "#2D1A2E",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
    {
      label:   "Pending Checks",
      value:   data.pendingChecks,
      href:    "/admin/compliance",
      color:   "#F0B94A",
      bgColor: "#3A2E1A",
      warn:    true,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
    },
  ] : [];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
      {/* Header */}
      <div className="mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: "var(--color-gold)" }}>
          Admin Portal
        </p>
        <h1 className="font-display text-[28px] sm:text-[34px] font-semibold leading-tight" style={{ color: "var(--color-text-primary)" }}>
          Dashboard
        </h1>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border h-[140px] animate-pulse" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }} />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {STAT_CARDS.map(s => <StatCard key={s.label} {...s} />)}
          </div>

          {/* Activity log */}
          <div
            className="rounded-xl border max-w-[560px]"
            style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)", padding: "20px" }}
          >
            <h2
              className="uppercase font-bold"
              style={{ fontSize: "13px", letterSpacing: ".07em", color: "var(--color-text-muted)", margin: "0 0 6px" }}
            >
              Activity log
            </h2>

            <div style={{ maxHeight: "480px", overflowY: "auto" }}>
              {data.activity.length === 0 ? (
                <p className="text-[13px] py-6 text-center" style={{ color: "var(--color-text-secondary)" }}>No activity yet.</p>
              ) : (
                data.activity.map((item, i) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      gap: "12px",
                      padding: "11px 0",
                      borderBottom: i < data.activity.length - 1 ? "1px solid var(--color-card-border)" : "none",
                    }}
                  >
                    {/* Time column */}
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--color-text-muted)",
                        fontVariantNumeric: "tabular-nums",
                        width: "42px",
                        flexShrink: 0,
                        paddingTop: "1px",
                      }}
                    >
                      {fmtActivityTime(item.timestamp)}
                    </span>

                    {/* Content */}
                    <div>
                      <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--color-text-primary)" }}>
                        {item.name}
                      </span>
                      <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginTop: "1px" }}>
                        {item.action}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>Failed to load dashboard.</p>
      )}
    </div>
  );
}
