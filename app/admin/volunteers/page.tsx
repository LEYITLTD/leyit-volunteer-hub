"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TIER_STYLE } from "@/lib/points-engine";

type Compliance = {
  dbs_status:      string | null;
  overall_status:  string | null;
  dbs_uploaded_at: string | null;
};

type Volunteer = {
  id:                   string;
  first_name:           string;
  last_name:            string;
  email:                string;
  phone:                string;
  created_at:           string;
  total_points:         number;
  tier:                 string | null;
  volunteer_compliance: Compliance | null;
};

function TierChip({ tier, points }: { tier: string | null; points: number }) {
  const style = tier ? TIER_STYLE[tier] : null;
  if (!tier || !style) return <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>—</span>;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10.5px] font-semibold whitespace-nowrap"
      style={{ background: style.bg, color: style.color, padding: "2px 8px", borderRadius: 6 }}
      title={`${points.toLocaleString()} points`}
    >
      <span aria-hidden>{style.emoji}</span>{tier}
    </span>
  );
}

const DBS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  not_uploaded: { label: "No DBS",   bg: "#F3EFE6", color: "#9E9690" },
  pending:      { label: "Pending",  bg: "#FEF9C3", color: "#92400E" },
  verified:     { label: "Verified", bg: "#DCFCE7", color: "#15803D" },
  rejected:     { label: "Rejected", bg: "#FEE2E2", color: "#DC2626" },
};

const OVERALL_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  pending:  { label: "Pending",  bg: "#FEF9C3", color: "#92400E" },
  approved: { label: "Approved", bg: "#DCFCE7", color: "#15803D" },
  rejected: { label: "Rejected", bg: "#FEE2E2", color: "#DC2626" },
};

function Badge({ map, value }: { map: typeof DBS_LABELS; value: string | null }) {
  const v   = value ?? "not_uploaded";
  const cfg = map[v] ?? { label: v, bg: "#F3EFE6", color: "#9E9690" };
  return (
    <span
      className="text-[10.5px] font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, padding: "2px 8px", borderRadius: 6 }}
    >
      {cfg.label}
    </span>
  );
}

type Filter = "all" | "pending" | "approved" | "rejected";

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<Filter>("all");
  const [search, setSearch]         = useState("");

  useEffect(() => {
    fetch("/api/admin/volunteers")
      .then((r) => r.json())
      .then(setVolunteers)
      .finally(() => setLoading(false));
  }, []);

  const filtered = volunteers.filter((v) => {
    const status = v.volunteer_compliance?.overall_status ?? "pending";
    const matchFilter = filter === "all" || status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || `${v.first_name} ${v.last_name} ${v.email}`.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const counts = {
    all:      volunteers.length,
    pending:  volunteers.filter((v) => (v.volunteer_compliance?.overall_status ?? "pending") === "pending").length,
    approved: volunteers.filter((v) => v.volunteer_compliance?.overall_status === "approved").length,
    rejected: volunteers.filter((v) => v.volunteer_compliance?.overall_status === "rejected").length,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] sm:text-[26px] font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            Volunteers
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {volunteers.length} registered · search and filter the roster
          </p>
        </div>
        <input
          type="search"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-xl px-3 py-2 text-[13px] w-full sm:w-60"
          style={{
            borderColor: "var(--color-input-border)",
            background:  "var(--color-input-bg)",
            color:       "var(--color-text-primary)",
          }}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {(["all", "pending", "approved", "rejected"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="text-[12px] px-3 py-1.5 rounded-lg capitalize transition-colors whitespace-nowrap flex-shrink-0"
            style={{
              background: filter === f ? "var(--color-gold-subtle)" : "transparent",
              color:      filter === f ? "var(--color-gold)"        : "var(--color-text-muted)",
              fontWeight: filter === f ? "600" : "400",
              border:     `1px solid ${filter === f ? "var(--color-gold)" : "var(--color-card-border)"}`,
            }}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[14px] text-center py-12" style={{ color: "var(--color-text-muted)" }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl border p-10 text-center"
          style={{ borderColor: "var(--color-card-border)", background: "var(--color-card)" }}
        >
          <p className="text-[14px]" style={{ color: "var(--color-text-muted)" }}>
            {search ? "No volunteers match your search." : "No volunteers yet."}
          </p>
        </div>
      ) : (
        <>
          {/* ── Mobile card list (hidden on sm+) ── */}
          <div className="flex flex-col gap-3 sm:hidden">
            {filtered.map((v) => (
              <Link
                key={v.id}
                href={`/admin/volunteers/${v.id}`}
                className="block rounded-2xl border p-4"
                style={{ borderColor: "var(--color-card-border)", background: "var(--color-card)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                      {v.first_name} {v.last_name}
                    </p>
                    <p className="text-[12px] truncate mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                      {v.email}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      Registered {new Date(v.created_at).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-muted)", flexShrink: 0, marginTop: 2 }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Badge map={DBS_LABELS}     value={v.volunteer_compliance?.dbs_status ?? null} />
                  <Badge map={OVERALL_LABELS} value={v.volunteer_compliance?.overall_status ?? null} />
                  <TierChip tier={v.tier} points={v.total_points} />
                </div>
              </Link>
            ))}
          </div>

          {/* ── Desktop table (hidden on mobile) ── */}
          <div
            className="hidden sm:block rounded-2xl border overflow-hidden"
            style={{ borderColor: "var(--color-card-border)", background: "var(--color-card)" }}
          >
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr style={{ background: "#FAF7F1", borderBottom: "1px solid #EFEAE0" }}>
                  {["Volunteer", "Registered", "DBS", "Status", "Tier", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-[10.5px] font-bold uppercase tracking-[0.06em]"
                      style={{ color: "#8A8276" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, i) => {
                  const initials = `${v.first_name[0] ?? ""}${v.last_name[0] ?? ""}`.toUpperCase();
                  return (
                    <tr
                      key={v.id}
                      style={{ borderTop: i > 0 ? "1px solid #F4EFE6" : undefined }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div style={{
                            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                            background: "#EFEAE0", color: "#7A6A4A",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700,
                          }}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[13.5px] leading-tight" style={{ color: "#1C1917" }}>
                              {v.first_name} {v.last_name}
                            </p>
                            <p className="text-[12px] truncate" style={{ color: "#A8A29E" }}>{v.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[13px]" style={{ color: "var(--color-text-muted)" }}>
                        {new Date(v.created_at).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge map={DBS_LABELS} value={v.volunteer_compliance?.dbs_status ?? null} />
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge map={OVERALL_LABELS} value={v.volunteer_compliance?.overall_status ?? null} />
                      </td>
                      <td className="px-5 py-3.5">
                        <TierChip tier={v.tier} points={v.total_points} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/admin/volunteers/${v.id}`}
                          aria-label={`View ${v.first_name} ${v.last_name}'s profile`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-[var(--color-gold-subtle)]"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
