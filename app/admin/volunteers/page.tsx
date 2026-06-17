"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Compliance = {
  dbs_status:     string | null;
  overall_status: string | null;
  dbs_uploaded_at: string | null;
};

type Volunteer = {
  id:           string;
  first_name:   string;
  last_name:    string;
  email:        string;
  phone:        string;
  created_at:   string;
  volunteer_compliance: Compliance | null;
};

const DBS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  not_uploaded: { label: "Not uploaded", bg: "#2C2825", color: "#9E9690" },
  pending:      { label: "Pending",      bg: "#3A2E1A", color: "#C4973A" },
  verified:     { label: "Verified",     bg: "#1A2E1A", color: "#4CAF50" },
  rejected:     { label: "Rejected",     bg: "#2E1A1A", color: "#E57373" },
};

const OVERALL_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  pending:  { label: "Pending",  bg: "#3A2E1A", color: "#C4973A" },
  approved: { label: "Approved", bg: "#1A2E1A", color: "#4CAF50" },
  rejected: { label: "Rejected", bg: "#2E1A1A", color: "#E57373" },
};

function Badge({ map, value }: { map: typeof DBS_LABELS; value: string | null }) {
  const v = value ?? "not_uploaded";
  const cfg = map[v] ?? { label: v, bg: "#2C2825", color: "#9E9690" };
  return (
    <span
      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Volunteers
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {volunteers.length} registered volunteer{volunteers.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Search */}
        <input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-xl px-3 py-2 text-[13px] w-full sm:w-64"
          style={{
            borderColor: "var(--color-input-border)",
            background:  "var(--color-input-bg)",
            color:       "var(--color-text-primary)",
          }}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5">
        {(["all", "pending", "approved", "rejected"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="text-[12px] px-3 py-1.5 rounded-lg capitalize transition-colors"
            style={{
              background: filter === f ? "var(--color-gold-subtle)" : "transparent",
              color:      filter === f ? "var(--color-gold)"        : "var(--color-text-muted)",
              fontWeight: filter === f ? "600" : "400",
              border:     `1px solid ${filter === f ? "var(--color-gold)" : "var(--color-card-border)"}`,
            }}
          >
            {f} <span style={{ opacity: 0.7 }}>({counts[f]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[14px] text-center py-12" style={{ color: "var(--color-text-muted)" }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ borderColor: "var(--color-card-border)", background: "var(--color-card)" }}
        >
          <p className="text-[14px]" style={{ color: "var(--color-text-muted)" }}>
            {search ? "No volunteers match your search." : "No volunteers yet."}
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: "var(--color-card-border)", background: "var(--color-card)" }}
        >
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr style={{ background: "var(--color-card-header-bg)", borderBottom: "1px solid var(--color-card-border)" }}>
                {["Name", "Email", "Registered", "DBS", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em]"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => (
                <tr
                  key={v.id}
                  style={{ borderTop: i > 0 ? "1px solid var(--color-card-border)" : undefined }}
                  className="group transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {v.first_name} {v.last_name}
                    </span>
                  </td>
                  <td className="px-5 py-3.5" style={{ color: "var(--color-text-secondary)" }}>
                    {v.email}
                  </td>
                  <td className="px-5 py-3.5" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(v.created_at).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge map={DBS_LABELS} value={v.volunteer_compliance?.dbs_status ?? null} />
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge map={OVERALL_LABELS} value={v.volunteer_compliance?.overall_status ?? null} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/admin/volunteers/${v.id}`}
                      className="text-[12px] px-3 py-1.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--color-gold)",
                        color:       "var(--color-gold)",
                        background:  "var(--color-gold-subtle)",
                      }}
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
