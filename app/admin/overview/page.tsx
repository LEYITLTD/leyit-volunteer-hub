"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Activity = { id: string; type: string; description: string; timestamp: string };
type Stats = {
  totalEvents:     number;
  approvedMale:    number;
  approvedFemale:  number;
  pendingChecks:   number;
  totalVolunteers: number;
  activity:        Activity[];
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const ACTIVITY_ICON: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  signup: {
    color: "#4CAF50",
    bg:    "#1A2E1A",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
      </svg>
    ),
  },
  confirmed: {
    color: "#5BA4CF",
    bg:    "#1A263A",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
  event: {
    color: "var(--color-gold)",
    bg:    "var(--color-gold-subtle)",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    ),
  },
};

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
          style={{ background: "#3A2E1A", color: "#C4973A" }}
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
      color:   "#5BA4CF",
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
      color:   "#CF5BA4",
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
      color:   "#C4973A",
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
          <div className="rounded-xl border overflow-hidden max-w-[560px]" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-card-border)" }}>
              <h2 className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Activity</h2>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Sign-ups, confirmations & events</p>
            </div>

            {data.activity.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>No activity yet.</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--color-card-border)" }}>
                {data.activity.map((item, i) => {
                  const cfg = ACTIVITY_ICON[item.type] ?? ACTIVITY_ICON.signup;
                  return (
                    <div key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                      <div className="flex flex-col items-center flex-shrink-0 self-stretch">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {cfg.icon}
                        </div>
                        {i < data.activity.length - 1 && (
                          <div className="flex-1 w-px mt-1" style={{ background: "var(--color-card-border)" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-[13px] leading-snug" style={{ color: "var(--color-text-primary)" }}>
                          {item.description}
                        </p>
                        <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                          {timeAgo(item.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>Failed to load dashboard.</p>
      )}
    </div>
  );
}
