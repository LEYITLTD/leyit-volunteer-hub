"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

type Recipient = {
  id: string;
  volunteer_id: string | null;
  email: string;
  first_name: string;
  last_name: string | null;
  status: string;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
};

type BroadcastLog = {
  id: string;
  subject: string;
  recipient_count: number;
  scope: string;
  gender: string;
  event_id: string | null;
  sent_at: string;
  events: { name: string } | null;
};

type PageData = {
  log: BroadcastLog;
  recipients: Recipient[];
};

const UK = "Europe/London";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: UK,
  });
}

function initials(first: string, last?: string | null) {
  return `${first[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

const STATUS_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
  sent:      { label: "Sent",      bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" },
  delivered: { label: "Delivered", bg: "#EFF6FF", color: "#3B82F6", border: "#BFDBFE" },
  opened:    { label: "Opened",    bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },
  clicked:   { label: "Clicked",   bg: "#FFF7ED", color: "#EA580C", border: "#FED7AA" },
  bounced:   { label: "Bounced",   bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
};

const STATUS_ORDER = ["sent","delivered","opened","clicked","bounced"];

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.sent;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20,
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap",
    }}>{m.label}</span>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: 70 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
    </div>
  );
}

type Filter = "all" | "opened" | "clicked" | "delivered" | "bounced" | "sent";

export default function BroadcastDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data,    setData]    = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<Filter>("all");
  const [search,  setSearch]  = useState("");

  const [refreshing, setRefreshing] = useState(false);

  function fetchData() {
    return fetch(`/api/admin/broadcast/${id}`)
      .then(r => r.json())
      .then(d => setData(d));
  }

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [id]);

  function handleRefresh() {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid #A8854A", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data?.log) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <p style={{ color: "#EF4444", fontSize: 14 }}>Broadcast not found.</p>
      </div>
    );
  }

  const { log, recipients } = data;

  const total     = recipients.length;
  const delivered = recipients.filter(r => ["delivered","opened","clicked"].includes(r.status)).length;
  const opened    = recipients.filter(r => ["opened","clicked"].includes(r.status)).length;
  const clicked   = recipients.filter(r => r.status === "clicked").length;
  const bounced   = recipients.filter(r => r.status === "bounced").length;
  const openRate  = total > 0 ? Math.round((opened / total) * 100) : 0;

  const filtered = recipients.filter(r => {
    const matchesFilter = filter === "all" || r.status === filter
      || (filter === "opened"  && r.status === "clicked")
      || (filter === "delivered" && ["delivered","opened","clicked"].includes(r.status));
    const q = search.toLowerCase();
    const matchesSearch = !q
      || r.first_name.toLowerCase().includes(q)
      || (r.last_name ?? "").toLowerCase().includes(q)
      || r.email.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const scopeLabel = log.scope === "event" && log.events?.name
    ? log.events.name
    : log.scope === "global"
    ? "All volunteers"
    : log.scope;

  const genderLabel = log.gender === "all" ? "" : log.gender === "male" ? " · Brothers" : " · Sisters";

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: "all",       label: "All",       count: total },
    { key: "opened",    label: "Opened",    count: opened },
    { key: "delivered", label: "Delivered", count: delivered },
    { key: "clicked",   label: "Clicked",   count: clicked },
    { key: "bounced",   label: "Bounced",   count: bounced },
  ];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">

      {/* Back */}
      <Link href="/admin/broadcast" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#78716C", textDecoration: "none", marginBottom: 20 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        Broadcasts
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
            {log.subject}
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {fmtDate(log.sent_at)} · {scopeLabel}{genderLabel}
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: refreshing ? "default" : "pointer",
          border: "1px solid var(--color-card-border)", borderRadius: 8,
          background: "var(--color-card)", color: "var(--color-text-secondary)",
          opacity: refreshing ? 0.6 : 1, flexShrink: 0,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }}>
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Stats row */}
      <div style={{ background: "var(--color-card)", border: "1px solid var(--color-card-border)", borderRadius: 12, padding: "20px 28px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.03em", lineHeight: 1 }}>{openRate}%</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>Open rate</div>
        </div>
        <div style={{ width: 1, height: 40, background: "var(--color-card-border)", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}><StatPill label="Sent"      value={total}    color="var(--color-text-primary)" /></div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}><StatPill label="Delivered" value={delivered} color="#3B82F6" /></div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}><StatPill label="Opened"    value={opened}   color="#16A34A" /></div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}><StatPill label="Clicked"   value={clicked}  color="#EA580C" /></div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}><StatPill label="Bounced"   value={bounced}  color="#DC2626" /></div>
      </div>

      {/* Filters + search */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, background: "var(--color-bg)", padding: 4, borderRadius: 8, border: "1px solid var(--color-card-border)" }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
              background: filter === f.key ? "var(--color-card)" : "transparent",
              color: filter === f.key ? "var(--color-text-primary)" : "var(--color-text-muted)",
              boxShadow: filter === f.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}>
              {f.label} <span style={{ opacity: 0.6 }}>{f.count}</span>
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or email…"
          style={{
            flex: 1, minWidth: 200, padding: "7px 12px", fontSize: 13,
            border: "1px solid var(--color-input-border)", borderRadius: 8,
            background: "var(--color-input-bg)", color: "var(--color-text-primary)", outline: "none",
          }}
        />
      </div>

      {/* Recipient table */}
      <div style={{ background: "var(--color-card)", border: "1px solid var(--color-card-border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-bg)", borderBottom: "1px solid var(--color-card-border)" }}>
              {["Volunteer", "Email", "Status", "Delivered", "Opened", "Clicked"].map((h, i) => (
                <th key={h} style={{
                  padding: "9px 14px", textAlign: "left",
                  fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  whiteSpace: "nowrap",
                  display: i >= 3 ? undefined : undefined,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "32px 14px", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
                  No recipients match.
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--color-card-border)", background: i % 2 === 0 ? "transparent" : "var(--color-bg)" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", background: "#F3EFE6", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, color: "#A8854A",
                      }}>{initials(r.first_name, r.last_name)}</div>
                      <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
                        {r.first_name} {r.last_name ?? ""}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)" }}>{r.email}</td>
                  <td style={{ padding: "10px 14px" }}><StatusBadge status={r.status} /></td>
                  <td style={{ padding: "10px 14px", color: r.delivered_at ? "var(--color-text-secondary)" : "var(--color-text-muted)", fontSize: 12 }}>
                    {r.delivered_at ? fmtDate(r.delivered_at) : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", color: r.opened_at ? "#16A34A" : "var(--color-text-muted)", fontSize: 12, fontWeight: r.opened_at ? 600 : 400 }}>
                    {r.opened_at ? fmtDate(r.opened_at) : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", color: r.clicked_at ? "#EA580C" : "var(--color-text-muted)", fontSize: 12, fontWeight: r.clicked_at ? 600 : 400 }}>
                    {r.clicked_at ? fmtDate(r.clicked_at) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 10 }}>
          Showing {filtered.length} of {total} recipient{total !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
