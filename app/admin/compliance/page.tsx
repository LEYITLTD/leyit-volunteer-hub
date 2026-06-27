"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────────────────────── */

type VolunteerCompliance = {
  dbs_status:                string | null;
  dbs_document_url:          string | null;
  dbs_uploaded_at:           string | null;
  dbs_rejection_reason:      string | null;
  lseg_status:          string | null;
  lseg_screened_at:     string | null;
  lseg_rejection_reason: string | null;
  overall_status:            string | null;
};

type VolunteerRow = {
  id:            string;
  first_name:    string;
  last_name:     string;
  email:         string;
  gender:        string | null;
  date_of_birth: string | null;
  nationality:   string | null;
  compliance:    VolunteerCompliance | null;
};

type ComplianceData = {
  stats: {
    lsegApproved:   number;
    dbsPending:     number;
    dbsNotUploaded: number;
    lsegFlags:      number;
  };
  dbsReview:   VolunteerRow[];
  notUploaded: VolunteerRow[];
  lsegPending: VolunteerRow[];
  lsegFlags:   VolunteerRow[];
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London",
  });
}

function initials(v: VolunteerRow) {
  return `${v.first_name[0] ?? ""}${v.last_name[0] ?? ""}`.toUpperCase();
}

function fullName(v: VolunteerRow) {
  return `${v.first_name} ${v.last_name}`;
}

/* ─── Stat Card ──────────────────────────────────────────────────────────── */

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #EAE6DD", borderRadius: 12,
      padding: 16, flex: 1, minWidth: 0,
    }}>
      <div style={{
        fontSize: 11.5, color: "#78716C", fontWeight: 600, marginBottom: 6,
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

/* ─── DBS Panel ──────────────────────────────────────────────────────────── */

function DbsPanel({
  dbsReview,
  notUploaded,
  onRefresh,
}: {
  dbsReview:   VolunteerRow[];
  notUploaded: VolunteerRow[];
  onRefresh:   () => void;
}) {
  const [rejecting, setRejecting]         = useState<string | null>(null);
  const [rejectReason, setRejectReason]   = useState("");
  const [busy, setBusy]                   = useState<string | null>(null);
  const [toast, setToast]                 = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function approveDbs(id: string) {
    setBusy(id + "-approve");
    try {
      await fetch(`/api/admin/volunteers/${id}/dbs-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiryDate: "" }),
      });
      showToast("DBS approved");
      onRefresh();
    } finally {
      setBusy(null);
    }
  }

  async function rejectDbs(id: string) {
    setBusy(id + "-reject");
    try {
      await fetch(`/api/admin/volunteers/${id}/dbs-reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      showToast("DBS rejected");
      setRejecting(null);
      setRejectReason("");
      onRefresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #EAE6DD", borderRadius: 12, padding: 20, position: "relative" }}>
      {toast && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: "#DCFCE7", color: "#15803D",
          fontSize: 12.5, fontWeight: 600, borderRadius: 8, padding: "6px 12px",
          zIndex: 10,
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1C1917", margin: 0 }}>DBS review</h3>
        <span style={{
          background: "#FEF9C3", color: "#92400E",
          fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
        }}>
          {dbsReview.length}
        </span>
      </div>

      {dbsReview.length === 0 && (
        <p style={{ fontSize: 13, color: "#A8A29E", marginBottom: 16 }}>No certificates pending review.</p>
      )}

      {dbsReview.map(v => (
        <div key={v.id} style={{ border: "1px solid #EFEAE0", borderRadius: 10, padding: 14, marginBottom: 12 }}>
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "#EFEAE0", color: "#7A6A4A",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, flexShrink: 0,
            }}>
              {initials(v)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1C1917" }}>{fullName(v)}</div>
              <div style={{ fontSize: 12, color: "#78716C" }}>
                Uploaded {fmt(v.compliance?.dbs_uploaded_at ?? null)}
              </div>
            </div>
            {v.compliance?.dbs_document_url && (
              <a
                href={v.compliance.dbs_document_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  border: "1px solid #D1CDC3", color: "#44403C",
                  borderRadius: 7, fontSize: 12, fontWeight: 500,
                  padding: "5px 10px", textDecoration: "none", whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                View certificate
              </a>
            )}
          </div>

          {/* Actions */}
          {rejecting === v.id ? (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Rejection reason…"
                rows={3}
                style={{
                  width: "100%", border: "1px solid #D1CDC3", borderRadius: 8,
                  padding: "8px 10px", fontSize: 13, resize: "vertical",
                  fontFamily: "inherit", boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { setRejecting(null); setRejectReason(""); }}
                  style={{
                    flex: 1, border: "1px solid #D1CDC3", background: "transparent",
                    color: "#44403C", borderRadius: 7, padding: "8px",
                    fontSize: 12, cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => rejectDbs(v.id)}
                  disabled={busy === v.id + "-reject"}
                  style={{
                    flex: 1, background: "#FEE2E2", border: "none",
                    color: "#DC2626", borderRadius: 7, padding: "8px",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {busy === v.id + "-reject" ? "Sending…" : "Confirm reject"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => approveDbs(v.id)}
                disabled={busy === v.id + "-approve"}
                style={{
                  flex: 1, background: "#15803D", border: "none",
                  color: "#fff", borderRadius: 7, padding: "9px",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  opacity: busy === v.id + "-approve" ? 0.7 : 1,
                }}
              >
                {busy === v.id + "-approve" ? "Approving…" : "Approve DBS"}
              </button>
              <button
                onClick={() => setRejecting(v.id)}
                style={{
                  background: "#FEE2E2", border: "none",
                  color: "#DC2626", borderRadius: 7, padding: "9px 14px",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Not yet uploaded divider */}
      <div style={{
        fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em",
        color: "#A8A29E", fontWeight: 700, marginBottom: 10, marginTop: 8,
      }}>
        Not yet uploaded
      </div>

      {notUploaded.length === 0 && (
        <p style={{ fontSize: 13, color: "#A8A29E" }}>All volunteers have uploaded a certificate.</p>
      )}

      {notUploaded.slice(0, 10).map(v => (
        <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "#F3EFE6", color: "#A8A29E",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11.5, fontWeight: 700, flexShrink: 0,
          }}>
            {initials(v)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13.5, fontWeight: 500, color: "#78716C",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {fullName(v)}
            </div>
            <div style={{ fontSize: 11.5, color: "#A8A29E" }}>DBS not uploaded</div>
          </div>
          <button
            onClick={() => showToast("Reminder sent")}
            style={{
              border: "1px solid #D1CDC3", background: "transparent",
              color: "#78716C", borderRadius: 7, padding: "4px 10px",
              fontSize: 11.5, cursor: "pointer", flexShrink: 0,
            }}
          >
            Send reminder
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── LSEG Panel ─────────────────────────────────────────────────────────── */

function LsegPanel({
  lsegFlags,
  lsegPending,
  onRefresh,
}: {
  lsegFlags:   VolunteerRow[];
  lsegPending: VolunteerRow[];
  onRefresh:   () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy]         = useState<string | null>(null);
  const [toast, setToast]       = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function markClear(id: string) {
    setBusy(id + "-clear");
    try {
      await fetch(`/api/admin/volunteers/${id}/lseg-approve`, { method: "POST" });
      showToast("LSEG marked as clear");
      setExpanded(null);
      onRefresh();
    } finally {
      setBusy(null);
    }
  }

  async function markHighRisk(id: string) {
    setBusy(id + "-risk");
    try {
      await fetch(`/api/admin/volunteers/${id}/request-dbs`, { method: "POST" });
      showToast("DBS verification requested");
      setExpanded(null);
      onRefresh();
    } finally {
      setBusy(null);
    }
  }

  // Pending list excludes high_risk (shown in flags)
  const pendingOnly = lsegPending.filter(v => v.compliance?.lseg_status !== "high_risk");

  return (
    <div style={{ background: "#fff", border: "1px solid #EAE6DD", borderRadius: 12, padding: 20, position: "relative" }}>
      {toast && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: "#DCFCE7", color: "#15803D",
          fontSize: 12.5, fontWeight: 600, borderRadius: 8, padding: "6px 12px",
          zIndex: 10,
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1C1917", margin: 0 }}>LSEG World-Check</h3>
          <span style={{
            background: "#DBEAFE", color: "#1D4ED8",
            fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 6,
          }}>
            Manual screening
          </span>
        </div>
        <a
          href="/api/admin/compliance/export"
          download
          style={{
            background: "#1A1714", color: "#fff",
            borderRadius: 7, padding: "6px 12px", fontSize: 12.5,
            fontWeight: 600, cursor: "pointer", textDecoration: "none",
            display: "inline-block",
          }}
        >
          Export CSV
        </a>
      </div>

      {/* High-risk flags */}
      {lsegFlags.length === 0 && (
        <p style={{ fontSize: 13, color: "#A8A29E", marginBottom: 12 }}>No high-risk flags.</p>
      )}
      {lsegFlags.map(v => (
        <div key={v.id} style={{
          border: "1px solid #FBD5D5", background: "#FEF6F6",
          borderRadius: 10, padding: 14, marginBottom: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "#FEE2E2", color: "#DC2626",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, flexShrink: 0,
            }}>
              {initials(v)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Link
                  href={`/admin/volunteers/${v.id}`}
                  style={{ fontSize: 14, fontWeight: 600, color: "#1C1917", textDecoration: "none" }}
                >
                  {fullName(v)}
                </Link>
                <span style={{
                  background: "#FEE2E2", color: "#DC2626",
                  fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 5,
                }}>
                  High risk
                </span>
              </div>
            </div>
            <button
              onClick={() => setExpanded(expanded === v.id ? null : v.id)}
              style={{
                border: "1px solid #D1CDC3", background: "transparent",
                color: "#44403C", borderRadius: 7, padding: "5px 10px",
                fontSize: 12, cursor: "pointer", flexShrink: 0,
              }}
            >
              {expanded === v.id ? "Close" : "Review"}
            </button>
          </div>

          {expanded === v.id && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {v.compliance?.lseg_rejection_reason && (
                <div style={{
                  fontSize: 12.5, color: "#B91C1C",
                  background: "#FEE2E2", borderRadius: 8, padding: "8px 10px",
                }}>
                  {v.compliance.lseg_rejection_reason}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => markClear(v.id)}
                  disabled={!!busy}
                  style={{
                    flex: 1, background: "#15803D", border: "none",
                    color: "#fff", borderRadius: 7, padding: "8px 14px",
                    fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  {busy === v.id + "-clear" ? "Saving…" : "Mark as clear"}
                </button>
                <button
                  onClick={() => markHighRisk(v.id)}
                  disabled={!!busy}
                  style={{
                    flex: 1, background: "#FEE2E2", border: "none",
                    color: "#DC2626", borderRadius: 7, padding: "8px 14px",
                    fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  {busy === v.id + "-risk" ? "Saving…" : "Require DBS"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Pending divider */}
      <div style={{
        fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em",
        color: "#A8A29E", fontWeight: 700, marginBottom: 10, marginTop: 8,
      }}>
        Pending screening ({pendingOnly.length})
      </div>

      {pendingOnly.length === 0 && (
        <p style={{ fontSize: 13, color: "#A8A29E", marginBottom: 12 }}>No volunteers awaiting LSEG screening.</p>
      )}
      {pendingOnly.map(v => (
        <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "#F3EFE6", color: "#A8854A",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11.5, fontWeight: 700, flexShrink: 0,
          }}>
            {initials(v)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13.5, fontWeight: 500, color: "#1C1917",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              <Link href={`/admin/volunteers/${v.id}`} style={{ color: "#1C1917", textDecoration: "none" }}>
                {fullName(v)}
              </Link>
            </div>
            <div style={{
              fontSize: 11.5, color: "#78716C",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {v.email}
            </div>
          </div>
          <span style={{
            background: "#FEF9C3", color: "#92400E",
            fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
            flexShrink: 0,
          }}>
            Pending
          </span>
        </div>
      ))}

      {/* Info strip */}
      <div style={{
        background: "#F3EFE6", borderRadius: 8, padding: "11px 13px",
        color: "#78716C", fontSize: 12.5, lineHeight: 1.5, marginTop: 16,
      }}>
        Export the CSV above and upload to LSEG World-Check portal. Then mark each result on the volunteer&apos;s profile.
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */

export default function CompliancePage() {
  const [data, setData]       = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/compliance")
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: "28px 28px 40px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Page heading */}
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1C1917", marginBottom: 4, letterSpacing: "-0.02em" }}>
        Compliance
      </h1>
      <p style={{ fontSize: 14, color: "#78716C", marginBottom: 24, marginTop: 0 }}>
        Review DBS certificates and LSEG World-Check screening.
      </p>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
          <div className="compliance-spinner" />
        </div>
      )}

      {error && (
        <div style={{
          background: "#FEE2E2", color: "#DC2626",
          borderRadius: 10, padding: "12px 16px", fontSize: 13, marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Stats row */}
          <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
            <StatCard label="LSEG approved"  value={data.stats.lsegApproved}   color="#15803D" />
            <StatCard label="DBS to review"  value={data.stats.dbsPending}     color="#92400E" />
            <StatCard label="LSEG pending"   value={data.stats.dbsNotUploaded} color="#1D4ED8" />
            <StatCard label="LSEG flags"     value={data.stats.lsegFlags}      color="#DC2626" />
          </div>

          {/* Two-column grid */}
          <div className="compliance-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <DbsPanel
              dbsReview={data.dbsReview}
              notUploaded={data.notUploaded}
              onRefresh={load}
            />
            <LsegPanel
              lsegFlags={data.lsegFlags}
              lsegPending={data.lsegPending}
              onRefresh={load}
            />
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .compliance-spinner {
          width: 24px; height: 24px; border-radius: 50%;
          border: 2px solid #A8854A; border-top-color: transparent;
          animation: spin 0.8s linear infinite;
        }
        @media (max-width: 700px) {
          .compliance-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
