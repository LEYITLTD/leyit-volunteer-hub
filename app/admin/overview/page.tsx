"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  totalEvents:     number;
  approvedMale:    number;
  approvedFemale:  number;
  pendingChecks:   number;
  totalVolunteers: number;
};

const STATS = (s: Stats) => [
  {
    label:    "Total Events",
    value:    s.totalEvents,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    href:     "/admin/events",
    color:    "var(--color-gold)",
    bgColor:  "var(--color-gold-subtle)",
  },
  {
    label:    "Approved Brothers",
    value:    s.approvedMale,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    href:     "/admin/volunteers",
    color:    "#5BA4CF",
    bgColor:  "#1A263A",
  },
  {
    label:    "Approved Sisters",
    value:    s.approvedFemale,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    href:     "/admin/volunteers",
    color:    "#CF5BA4",
    bgColor:  "#2D1A2E",
  },
  {
    label:    "Pending Checks",
    value:    s.pendingChecks,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    href:     "/admin/compliance",
    color:    "#C4973A",
    bgColor:  "#3A2E1A",
    warn:     true,
  },
];

function StatCard({ label, value, icon, href, color, bgColor, warn }: ReturnType<typeof STATS>[number]) {
  return (
    <Link
      href={href}
      className="rounded-xl border p-5 flex flex-col gap-4 transition-all hover:opacity-90 group"
      style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: bgColor, color }}
        >
          {icon}
        </div>
        {warn && value > 0 && (
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
            style={{ background: "#3A2E1A", color: "#C4973A" }}
          >
            Needs attention
          </span>
        )}
      </div>
      <div>
        <p
          className="font-ui text-[36px] sm:text-[40px] font-bold leading-none tabular-nums"
          style={{ color }}
        >
          {value.toLocaleString()}
        </p>
        <p className="text-[12px] mt-1.5 font-medium" style={{ color: "var(--color-text-secondary)" }}>
          {label}
        </p>
      </div>
    </Link>
  );
}

export default function AdminOverviewPage() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: "var(--color-gold)" }}>
          Admin Portal
        </p>
        <h1 className="font-display text-[28px] sm:text-[34px] font-semibold leading-tight" style={{ color: "var(--color-text-primary)" }}>
          Dashboard
        </h1>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border p-5 h-[140px] animate-pulse"
              style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}
            />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS(stats).map(s => <StatCard key={s.label} {...s} />)}
        </div>
      ) : (
        <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>Failed to load stats.</p>
      )}

      {/* Total volunteers summary */}
      {stats && (
        <div
          className="mt-5 rounded-xl border px-5 py-4 flex items-center justify-between gap-4"
          style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--color-gold)" }} />
            <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
              Total registered volunteers
            </span>
          </div>
          <span className="font-ui text-[18px] font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
            {stats.totalVolunteers.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
