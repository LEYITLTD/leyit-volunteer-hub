"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LeaderboardEntry = {
  volunteer_id: string;
  first_name:   string;
  last_name:    string;
  email:        string;
  total_points: number;
};

const UK = "Europe/London";

function initials(f: string, l: string) {
  return `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase();
}

const MEDALS = [
  { bg: "linear-gradient(135deg,#F5D060,#C9A227)", text: "#7A5A10", border: "#E8C440", emoji: "🥇" },
  { bg: "linear-gradient(135deg,#E2E8F0,#94A3B8)", text: "#475569", border: "#CBD5E1", emoji: "🥈" },
  { bg: "linear-gradient(135deg,#FDBA74,#EA580C)", text: "#7C2D12", border: "#FB923C", emoji: "🥉" },
];

export default function AdminPointsPage() {
  const [entries,  setEntries]  = useState<LeaderboardEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/points/leaderboard")
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setEntries(d) : setError(d?.error ?? "Failed to load"))
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const maxPts = entries[0]?.total_points ?? 1;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
      <div className="mb-6">
        <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          Points Leaderboard
        </h1>
        <p className="text-[14px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          All-time points across all events.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
        </div>
      ) : error ? (
        <p className="text-[13px] rounded-lg px-4 py-3" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>{error}</p>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border px-5 py-16 text-center" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <svg className="mx-auto mb-3" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-muted)" }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <p className="text-[14px] font-medium" style={{ color: "var(--color-text-secondary)" }}>No points awarded yet</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--color-text-muted)" }}>Points appear here once awarded via event check-ins or manually.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          {entries.map((e, i) => {
            const rank   = i + 1;
            const medal  = rank <= 3 ? MEDALS[rank - 1] : null;
            const barPct = maxPts > 0 ? Math.round((e.total_points / maxPts) * 100) : 0;
            const isLast = i === entries.length - 1;

            return (
              <Link
                key={e.volunteer_id}
                href={`/admin/volunteers/${e.volunteer_id}`}
                style={{ textDecoration: "none", display: "block", borderBottom: isLast ? "none" : "1px solid var(--color-card-border)" }}
              >
                <div
                  className="flex items-center gap-4 px-5 py-4 transition-colors"
                  style={{ background: medal ? "var(--color-gold-subtle)" : "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--color-bg)")}
                  onMouseLeave={ev => (ev.currentTarget.style.background = medal ? "var(--color-gold-subtle)" : "transparent")}
                >
                  {/* Rank badge */}
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: medal ? medal.bg : "var(--color-bg)",
                    border: medal ? `1px solid ${medal.border}` : "1px solid var(--color-card-border)",
                    fontSize: medal ? 16 : 13, fontWeight: 800,
                    color: medal ? medal.text : "var(--color-text-muted)",
                  }}>
                    {medal ? medal.emoji : rank}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "#F3EFE6", fontSize: 12, fontWeight: 700, color: "#A8854A",
                  }}>
                    {initials(e.first_name, e.last_name)}
                  </div>

                  {/* Name + bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        {e.first_name} {e.last_name}
                      </span>
                      <span className="text-[15px] font-bold tabular-nums flex-shrink-0" style={{ color: "var(--color-gold)" }}>
                        {e.total_points.toLocaleString()} pts
                      </span>
                    </div>
                    <div style={{ height: 5, background: "var(--color-bg)", borderRadius: 3, overflow: "hidden", border: "1px solid var(--color-card-border)" }}>
                      <div style={{
                        width: `${barPct}%`, height: "100%", borderRadius: 3,
                        background: medal ? medal.bg : "linear-gradient(90deg,#C9A227,#A8854A)",
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
