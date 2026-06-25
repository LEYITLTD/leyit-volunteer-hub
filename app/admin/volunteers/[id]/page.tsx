"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { TIER_STYLE } from "@/lib/points-engine";

type PointsTxn = {
  id: string; type: string; amount: number;
  description: string | null; earned_at: string; event_name: string | null;
};
type PointsData = {
  total: number;
  tier: { name: string; min_points: number } | null;
  nextTier: { name: string; min_points: number } | null;
  transactions: PointsTxn[];
};

type CommItem = {
  id: string;
  channel: "email" | "sms";
  category: "system" | "direct" | "broadcast";
  subject: string | null;
  status: string;
  created_at: string;
};

const COMM_CATEGORY: Record<string, { label: string; bg: string; color: string }> = {
  system:    { label: "System",    bg: "#F3EFE6", color: "#8A7A5A" },
  direct:    { label: "Direct",    bg: "#EDE9FE", color: "#5B21B6" },
  broadcast: { label: "Broadcast", bg: "#E7EEF6", color: "#1D4ED8" },
};

const PTS_TYPE_LABEL: Record<string, string> = {
  check_in: "Checked in", check_out: "Checked out",
  early_bird: "Early bird", attendance: "Attendance",
  setup: "Setup", packaging: "Packaging", social_media: "Social media",
  cleanup: "Cleanup", manual_bonus: "Bonus", deduction: "Deduction",
};

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
}

/* ─── Types ─────────────────────────────────────────────────────────────── */

type Compliance = {
  dbs_status:                string | null;
  dbs_document_url:          string | null;
  dbs_uploaded_at:           string | null;
  dbs_expiry_date:           string | null;
  dbs_reviewed_at:           string | null;
  dbs_rejection_reason:      string | null;
  lseg_status:          string | null;
  lseg_screened_at:     string | null;
  lseg_rejection_reason: string | null;
  overall_status:            string | null;
  approved_at:               string | null;
};

type Volunteer = {
  id:                      string;
  first_name:              string;
  last_name:               string;
  email:                   string;
  phone:                   string;
  address:                 string;
  date_of_birth:           string;
  nationality:             string;
  gender:                  "male" | "female" | null;
  emergency_contact_name:  string;
  emergency_contact_phone: string;
  dietary_requirements:    string | null;
  medical_info:            string | null;
  created_at:              string;
  volunteer_compliance:    Compliance | null;
};

type Template = { key: string; subject: string; body_html: string };

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString("en-GB", { timeZone: "Europe/London" }) : "—";
}

function renderTemplate(html: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, v), html);
}

const DBS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  not_uploaded: { label: "Not uploaded",  bg: "#F3EFE6", color: "#9E9690" },
  pending:      { label: "Pending review", bg: "#FEF9C3", color: "#92400E" },
  verified:     { label: "Verified",       bg: "#DCFCE7", color: "#15803D" },
  rejected:     { label: "Rejected",       bg: "#FEE2E2", color: "#DC2626" },
};

const LSEG_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  pending:        { label: "Pending",        bg: "#FEF9C3", color: "#92400E" },
  clear:          { label: "Clear",          bg: "#DCFCE7", color: "#15803D" },
  possible_match: { label: "Possible match", bg: "#FEF9C3", color: "#92400E" },
  high_risk:      { label: "High risk",      bg: "#FEE2E2", color: "#DC2626" },
};

const OVERALL_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  pending:  { label: "Pending",  bg: "#FEF9C3", color: "#92400E" },
  approved: { label: "Approved", bg: "#DCFCE7", color: "#15803D" },
  rejected: { label: "Rejected", bg: "#FEE2E2", color: "#DC2626" },
};

function Badge({ map, value }: { map: typeof DBS_BADGE; value: string | null }) {
  const v = value ?? "not_uploaded";
  const cfg = map[v] ?? { label: v, bg: "#F3EFE6", color: "#9E9690" };
  return (
    <span
      className="text-[10.5px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color, padding: "2px 9px", borderRadius: 6 }}
    >
      {cfg.label}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <p className="text-[14px]" style={{ color: "var(--color-text-primary)" }}>
        {value || "—"}
      </p>
    </div>
  );
}

/* ─── Approve Modal ──────────────────────────────────────────────────────── */

function ApproveModal({
  volunteer,
  onClose,
  onDone,
}: {
  volunteer: Volunteer;
  onClose: () => void;
  onDone: () => void;
}) {
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]               = useState<string | null>(null);

  async function submit() {
    if (!expiryDate) { setErr("Please enter the DBS expiry date"); return; }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/volunteers/${volunteer.id}/dbs-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiryDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
      setSubmitting(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl overflow-y-auto"
        style={{ background: "var(--color-card)", maxHeight: "92dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ borderColor: "var(--color-card-border)", background: "var(--color-card-header-bg)" }}
        >
          <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Approve DBS certificate
          </h2>
          <button onClick={onClose} className="text-[20px] leading-none" style={{ color: "var(--color-text-muted)" }}>×</button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
            Approving this DBS for{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>
              {volunteer.first_name} {volunteer.last_name}
            </strong>.
          </p>

          {/* Expiry date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold" style={{ color: "var(--color-text-secondary)" }}>
              DBS expiry date
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="border rounded-xl px-3 py-2.5 text-[14px]"
              style={{
                borderColor: "var(--color-input-border)",
                background:  "var(--color-input-bg)",
                color:       "var(--color-text-primary)",
              }}
            />
          </div>

          {/* What happens next */}
          <div
            className="rounded-xl p-4 text-[13px] leading-relaxed"
            style={{ background: "#FEF9C3", color: "#92400E" }}
          >
            DBS will be marked as verified for {volunteer.first_name}. Note: application approval is determined solely by the LSEG check — approving DBS alone does not change the overall compliance status.
          </div>

          {err && <p className="text-[13px]" style={{ color: "var(--color-error)" }}>{err}</p>}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="text-[13px] px-4 py-2 rounded-xl border"
              style={{ borderColor: "var(--color-card-border)", color: "var(--color-text-secondary)" }}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="text-[13px] px-5 py-2 rounded-xl font-semibold transition-opacity"
              style={{
                background: "var(--color-gold)",
                color:      "#1A1714",
                opacity:    submitting ? 0.6 : 1,
              }}
            >
              {submitting ? "Approving…" : "Approve DBS"}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

/* ─── Reject Modal ───────────────────────────────────────────────────────── */

function RejectModal({
  volunteer,
  rejectTemplate,
  onClose,
  onDone,
}: {
  volunteer: Volunteer;
  rejectTemplate: Template | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason]     = useState("");
  const [submitting, setSubmit] = useState(false);
  const [err, setErr]           = useState<string | null>(null);
  const iframeRef               = useRef<HTMLIFrameElement>(null);

  const previewHtml = rejectTemplate
    ? renderTemplate(rejectTemplate.body_html, {
        first_name: volunteer.first_name,
        reason:     reason || "Your rejection reason will appear here.",
      })
    : "";

  // Update iframe srcDoc reactively
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = previewHtml;
    }
  }, [previewHtml]);

  async function submit() {
    if (!reason.trim()) { setErr("Please enter a reason"); return; }
    setSubmit(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/volunteers/${volunteer.id}/dbs-reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
      setSubmit(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div
        className="w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ background: "var(--color-card)", maxHeight: "92dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b flex-shrink-0"
          style={{ borderColor: "var(--color-card-border)", background: "var(--color-card-header-bg)" }}
        >
          <div>
            <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Reject DBS certificate
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {volunteer.first_name} {volunteer.last_name} · {volunteer.email}
            </p>
          </div>
          <button onClick={onClose} className="text-[22px] leading-none" style={{ color: "var(--color-text-muted)" }}>×</button>
        </div>

        {/* Two-panel body */}
        <div className="flex flex-1 min-h-0 divide-x" style={{ borderColor: "var(--color-card-border)" }}>
          {/* Left — compose */}
          <div className="flex flex-col gap-5 p-6 w-full sm:w-[42%] flex-shrink-0 overflow-y-auto">
            <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
              Write a clear reason — this will be included verbatim in the email sent to{" "}
              <strong style={{ color: "var(--color-text-primary)" }}>{volunteer.first_name}</strong>.
            </p>

            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[12px] font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                Rejection reason
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. The certificate you uploaded has expired — it shows an issue date of 2021 and DBS certificates are valid for 3 years. Please upload a current certificate."
                rows={8}
                className="border rounded-xl px-3 py-2.5 text-[13px] resize-none leading-relaxed"
                style={{
                  borderColor: "var(--color-input-border)",
                  background:  "var(--color-input-bg)",
                  color:       "var(--color-text-primary)",
                }}
              />
              <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                {reason.length} characters
              </p>
            </div>

            {/* Subject preview */}
            {rejectTemplate && (
              <div
                className="rounded-xl p-3 text-[12px]"
                style={{ background: "var(--color-card-header-bg)", border: "1px solid var(--color-card-border)" }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest block mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Email subject
                </span>
                <span style={{ color: "var(--color-text-primary)" }}>{rejectTemplate.subject}</span>
              </div>
            )}

            {err && <p className="text-[13px]" style={{ color: "var(--color-error)" }}>{err}</p>}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 text-[13px] px-4 py-2.5 rounded-xl border"
                style={{ borderColor: "var(--color-card-border)", color: "var(--color-text-secondary)" }}
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting || !reason.trim()}
                className="flex-1 text-[13px] px-4 py-2.5 rounded-xl font-semibold transition-opacity"
                style={{
                  background: "#B33A3A",
                  color:      "#fff",
                  opacity:    submitting || !reason.trim() ? 0.5 : 1,
                }}
              >
                {submitting ? "Sending…" : "Send & Reject"}
              </button>
            </div>
          </div>

          {/* Right — live email preview */}
          <div className="hidden sm:flex flex-col flex-1 min-w-0">
            <div
              className="px-4 py-2.5 border-b flex-shrink-0 flex items-center gap-2"
              style={{ borderColor: "var(--color-card-border)", background: "var(--color-card-header-bg)" }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: reason.trim() ? "#7DE882" : "#F0B94A" }}
              />
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                {reason.trim() ? "Live preview" : "Preview — type a reason to see it update"}
              </span>
            </div>
            <div className="flex-1 overflow-hidden" style={{ background: "#F0EDE8" }}>
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                title="Rejection email preview"
              />
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

/* ─── LSEG Approve Modal ─────────────────────────────────────────────────── */

function LsegApproveModal({
  volunteer,
  dbsStatus,
  approvalTemplate,
  onClose,
  onDone,
}: {
  volunteer: Volunteer;
  dbsStatus: string;
  approvalTemplate: Template | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]               = useState<string | null>(null);

  const willApprove = dbsStatus === "verified";
  const previewHtml = approvalTemplate && willApprove
    ? renderTemplate(approvalTemplate.body_html, { first_name: volunteer.first_name })
    : "";

  async function submit() {
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/volunteers/${volunteer.id}/lseg-approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
      setSubmitting(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl overflow-y-auto"
        style={{ background: "var(--color-card)", maxHeight: "92dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ borderColor: "var(--color-card-border)", background: "var(--color-card-header-bg)" }}
        >
          <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Mark LSEG as clear
          </h2>
          <button onClick={onClose} className="text-[20px] leading-none" style={{ color: "var(--color-text-muted)" }}>×</button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
            Manually marking the LSEG check as{" "}
            <strong style={{ color: "#7DE882" }}>clear</strong> for{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>
              {volunteer.first_name} {volunteer.last_name}
            </strong>.
          </p>

          <div
            className="rounded-xl p-4 text-[13px] leading-relaxed"
            style={{
              background: willApprove ? "#DCFCE7" : "#FEF9C3",
              color:      willApprove ? "#15803D" : "#92400E",
            }}
          >
            {willApprove
              ? `DBS is already verified — this will fully approve ${volunteer.first_name}'s application and send the approval email immediately.`
              : `DBS is not yet verified — LSEG will be marked clear but the full approval won't trigger until DBS is also approved.`}
          </div>

          {willApprove && previewHtml && (
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-card-border)" }}>
              <p
                className="text-[10px] font-semibold uppercase tracking-widest px-4 py-2 border-b"
                style={{ color: "var(--color-text-muted)", borderColor: "var(--color-card-border)", background: "var(--color-card-header-bg)" }}
              >
                Email that will be sent
              </p>
              <iframe srcDoc={previewHtml} className="w-full border-0" style={{ height: "220px" }} title="Approval email preview" />
            </div>
          )}

          {err && <p className="text-[13px]" style={{ color: "var(--color-error)" }}>{err}</p>}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="text-[13px] px-4 py-2 rounded-xl border"
              style={{ borderColor: "var(--color-card-border)", color: "var(--color-text-secondary)" }}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="text-[13px] px-5 py-2 rounded-xl font-semibold transition-opacity"
              style={{ background: "var(--color-gold)", color: "#1A1714", opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? "Saving…" : "Mark as Clear"}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

/* ─── LSEG Reject Modal ──────────────────────────────────────────────────── */

function LsegRejectModal({
  volunteer,
  onClose,
  onDone,
}: {
  volunteer: Volunteer;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason,     setReason]   = useState("");
  const [submitting, setSubmit]   = useState(false);
  const [err, setErr]             = useState<string | null>(null);

  async function submit() {
    setSubmit(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/volunteers/${volunteer.id}/lseg-reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
      setSubmit(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl overflow-y-auto"
        style={{ background: "var(--color-card)", maxHeight: "92dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ borderColor: "var(--color-card-border)", background: "var(--color-card-header-bg)" }}
        >
          <div>
            <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Mark LSEG as high risk
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {volunteer.first_name} {volunteer.last_name} · {volunteer.email}
            </p>
          </div>
          <button onClick={onClose} className="text-[22px] leading-none" style={{ color: "var(--color-text-muted)" }}>×</button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div
            className="rounded-xl p-4 text-[13px] leading-relaxed"
            style={{ background: "#FEE2E2", color: "#DC2626", border: "1px solid #FBD5D5" }}
          >
            This will set {volunteer.first_name}&apos;s overall compliance to{" "}
            <strong>Rejected</strong>. No email is sent automatically — notify the volunteer separately if needed.
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold" style={{ color: "var(--color-text-secondary)" }}>
              Internal notes <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Name matched against sanctions list — case ref #..."
              rows={4}
              className="border rounded-xl px-3 py-2.5 text-[13px] resize-none leading-relaxed"
              style={{
                borderColor: "var(--color-input-border)",
                background:  "var(--color-input-bg)",
                color:       "var(--color-text-primary)",
              }}
            />
          </div>

          {err && <p className="text-[13px]" style={{ color: "var(--color-error)" }}>{err}</p>}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 text-[13px] px-4 py-2.5 rounded-xl border"
              style={{ borderColor: "var(--color-card-border)", color: "var(--color-text-secondary)" }}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="flex-1 text-[13px] px-4 py-2.5 rounded-xl font-semibold transition-opacity"
              style={{ background: "#B33A3A", color: "#fff", opacity: submitting ? 0.5 : 1 }}
            >
              {submitting ? "Saving…" : "Mark as High Risk"}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

/* ─── Overlay ────────────────────────────────────────────────────────────── */

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-stretch justify-end sm:items-center sm:justify-center sm:p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      {children}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */

export default function VolunteerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [volunteer, setVolunteer]   = useState<Volunteer | null>(null);
  const [dbsUrl, setDbsUrl]         = useState<string | null>(null);
  const [templates, setTemplates]   = useState<Template[]>([]);
  const [points, setPoints]         = useState<PointsData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState<"approve" | "reject" | "lseg-approve" | "lseg-reject" | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);

  // Communications
  const [comms,      setComms]      = useState<CommItem[] | null>(null);
  const [msgChannel, setMsgChannel] = useState<"email" | "sms">("email");
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody,    setMsgBody]    = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [msgError,   setMsgError]   = useState<string | null>(null);
  const [msgOk,      setMsgOk]      = useState(false);

  function loadComms() {
    fetch(`/api/admin/volunteers/${id}/communications`)
      .then(r => r.json())
      .then(d => setComms(Array.isArray(d) ? d : []))
      .catch(() => setComms([]));
  }

  async function sendMessage() {
    if (!msgBody.trim()) { setMsgError("Message is required."); return; }
    if (msgChannel === "email" && !msgSubject.trim()) { setMsgError("Subject is required."); return; }
    setMsgError(null); setMsgOk(false); setMsgSending(true);
    try {
      const res  = await fetch(`/api/admin/volunteers/${id}/message`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: msgChannel, subject: msgSubject.trim(), message: msgBody.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setMsgOk(true); setMsgSubject(""); setMsgBody("");
      loadComms();
    } catch (e) {
      setMsgError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setMsgSending(false);
    }
  }

  function load() {
    setLoading(true);
    fetch(`/api/admin/volunteers/${id}`)
      .then((r) => r.json())
      .then(({ volunteer: v, dbsSignedUrl, templates: tpls, points: pts }) => {
        setVolunteer(v);
        setDbsUrl(dbsSignedUrl);
        setTemplates(tpls ?? []);
        setPoints(pts ?? null);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); loadComms(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  function handleDone(msg: string) {
    setModal(null);
    setSuccess(msg);
    load();
    setTimeout(() => setSuccess(null), 4000);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[14px]" style={{ color: "var(--color-text-muted)" }}>Loading…</p>
      </div>
    );
  }

  if (!volunteer) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[14px]" style={{ color: "var(--color-error)" }}>Volunteer not found.</p>
      </div>
    );
  }

  const compliance = volunteer.volunteer_compliance;
  const dbsStatus  = compliance?.dbs_status ?? "not_uploaded";
  const isPending  = dbsStatus === "pending";

  const rejectTpl  = templates.find((t) => t.key === "dbs_rejected")  ?? null;
  const approveTpl = templates.find((t) => t.key === "application_approved") ?? null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
      {/* Back */}
      <Link
        href="/admin/volunteers"
        className="inline-flex items-center gap-1.5 text-[13px] mb-6 transition-colors"
        style={{ color: "var(--color-text-muted)" }}
      >
        ← Back to volunteers
      </Link>

      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[24px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {volunteer.first_name} {volunteer.last_name}
          </h1>
          <p className="text-[14px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {volunteer.email} · Registered {fmt(volunteer.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge map={DBS_BADGE}     value={dbsStatus} />
          <Badge map={OVERALL_BADGE} value={compliance?.overall_status ?? null} />
        </div>
      </div>

      {success && (
        <div
          className="mb-6 px-4 py-3 rounded-xl text-[13px] font-medium"
          style={{ background: "#DCFCE7", color: "#15803D" }}
        >
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Right column — compliance */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* LSEG — primary action, show first */}
          <section
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: "var(--color-card-border)", background: "var(--color-card)" }}
          >
            <div
              className="px-5 py-3.5 border-b flex items-center justify-between"
              style={{ borderColor: "var(--color-card-border)", background: "var(--color-card-header-bg)" }}
            >
              <div>
                <h2 className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>LSEG check</h2>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>World-Check name &amp; DOB screening</p>
              </div>
              <Badge map={LSEG_BADGE} value={compliance?.lseg_status ?? "pending"} />
            </div>
            <div className="p-5 flex flex-col gap-3">
              {/* Status callout */}
              {compliance?.lseg_status === "clear" && (
                <div className="flex items-start gap-2.5 rounded-xl p-3" style={{ background: "#DCFCE7" }}>
                  <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <p className="text-[13px]" style={{ color: "#15803D" }}>Cleared — no matches found on LSEG World-Check.</p>
                </div>
              )}
              {compliance?.lseg_status === "high_risk" && (
                <div className="rounded-xl p-3" style={{ background: "#FEE2E2", border: "1px solid #FBD5D5" }}>
                  <p className="text-[13px] font-semibold" style={{ color: "#DC2626" }}>Marked as high risk</p>
                  {compliance.lseg_rejection_reason && (
                    <p className="text-[12px] mt-1 leading-relaxed" style={{ color: "#B91C1C" }}>{compliance.lseg_rejection_reason}</p>
                  )}
                </div>
              )}
              {(!compliance?.lseg_status || compliance.lseg_status === "pending") && (
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                  Search this volunteer&apos;s name and date of birth on LSEG World-Check, then record the result here.
                </p>
              )}
              {compliance?.lseg_screened_at && (
                <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                  Last reviewed {fmt(compliance.lseg_screened_at)}
                </p>
              )}
              <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "var(--color-card-border)" }}>
                <button
                  onClick={() => setModal("lseg-approve")}
                  className="w-full px-4 py-2.5 rounded-xl text-[13px] font-semibold inline-flex items-center justify-center gap-2"
                  style={{ background: "var(--color-gold)", color: "#1A1714" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Mark LSEG as clear
                </button>
                <button
                  onClick={() => setModal("lseg-reject")}
                  className="w-full px-4 py-2 text-[12px] font-medium"
                  style={{ color: "#9E5555", background: "transparent" }}
                >
                  Mark LSEG as high risk
                </button>
              </div>
            </div>
          </section>

          {/* DBS section */}
          <section
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: "var(--color-card-border)", background: "var(--color-card)" }}
          >
            <div
              className="px-5 py-3.5 border-b flex items-center justify-between"
              style={{ borderColor: "var(--color-card-border)", background: "var(--color-card-header-bg)" }}
            >
              <div>
                <h2 className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>DBS certificate</h2>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Optional — informational only</p>
              </div>
              <Badge map={DBS_BADGE} value={dbsStatus} />
            </div>
            <div className="p-5 flex flex-col gap-4">
              {compliance?.dbs_uploaded_at && (
                <Field label="Uploaded" value={fmt(compliance.dbs_uploaded_at)} />
              )}
              {compliance?.dbs_expiry_date && (
                <Field label="Expires"  value={fmt(compliance.dbs_expiry_date)} />
              )}
              {compliance?.dbs_reviewed_at && (
                <Field label="Reviewed" value={fmt(compliance.dbs_reviewed_at)} />
              )}
              {dbsStatus === "rejected" && compliance?.dbs_rejection_reason && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                    Rejection reason
                  </p>
                  <div className="rounded-xl p-3 text-[13px] leading-relaxed" style={{ background: "#FEE2E2", color: "#DC2626", border: "1px solid #FBD5D5" }}>
                    {compliance.dbs_rejection_reason}
                  </div>
                </div>
              )}
              {dbsUrl && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "var(--color-text-muted)" }}>Document</p>
                  {dbsUrl.match(/\.pdf(\?|$)/i) ? (
                    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-card-border)", height: "260px" }}>
                      <iframe src={dbsUrl} className="w-full h-full border-0" title="DBS certificate" />
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-card-border)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={dbsUrl} alt="DBS certificate" className="w-full object-contain max-h-[260px]" />
                    </div>
                  )}
                  <a href={dbsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[12px]" style={{ color: "var(--color-gold)" }}>
                    Open in new tab ↗
                  </a>
                </div>
              )}
              {!compliance?.dbs_document_url && (
                <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>No document uploaded yet.</p>
              )}
              {isPending && (
                <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "var(--color-card-border)" }}>
                  <button
                    onClick={() => setModal("approve")}
                    className="w-full px-4 py-2.5 rounded-xl text-[13px] font-semibold"
                    style={{ background: "var(--color-gold)", color: "#1A1714" }}
                  >
                    Approve DBS
                  </button>
                  <button
                    onClick={() => setModal("reject")}
                    className="w-full px-4 py-2 text-[12px] font-medium"
                    style={{ color: "#9E5555", background: "transparent" }}
                  >
                    Reject DBS
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Left column — personal info */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* Activity & points */}
          {(() => {
            const tierStyle = points?.tier ? TIER_STYLE[points.tier.name] : null;
            const total = points?.total ?? 0;
            const next = points?.nextTier ?? null;
            return (
              <section className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--color-card-border)", background: "var(--color-card)" }}>
                <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "var(--color-card-border)", background: "var(--color-card-header-bg)" }}>
                  <h2 className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Activity &amp; points</h2>
                  {points?.tier && tierStyle && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ background: tierStyle.bg, color: tierStyle.color, padding: "3px 9px", borderRadius: 6 }}>
                      <span aria-hidden>{tierStyle.emoji}</span> {points.tier.name}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  {/* Total + progress */}
                  <div className="flex items-end justify-between gap-3 mb-1">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-0.5" style={{ color: "var(--color-text-muted)" }}>Total points</p>
                      <p className="text-[28px] font-bold tabular-nums leading-none" style={{ color: "var(--color-text-primary)" }}>{total.toLocaleString()}</p>
                    </div>
                    {next && (
                      <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                        {Math.max(0, next.min_points - total).toLocaleString()} to {next.name}
                      </p>
                    )}
                  </div>
                  {next && (
                    <div className="mt-2 mb-4 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-bg)" }}>
                      <div style={{ width: `${Math.min(100, Math.round((total / next.min_points) * 100))}%`, height: "100%", background: "linear-gradient(90deg,#C9A227,#A8854A)" }} />
                    </div>
                  )}

                  {/* Transaction feed */}
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--color-card-border)" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "var(--color-text-muted)" }}>Points history</p>
                    {!points || points.transactions.length === 0 ? (
                      <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>No points activity yet.</p>
                    ) : (
                      <div className="flex flex-col">
                        {points.transactions.map((t, i) => {
                          const positive = t.amount >= 0;
                          return (
                            <div key={t.id} className="flex items-center justify-between gap-3 py-2.5" style={{ borderTop: i > 0 ? "1px solid var(--color-divider-subtle)" : "none" }}>
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                                  {t.description || PTS_TYPE_LABEL[t.type] || t.type}
                                </p>
                                <p className="text-[11.5px] truncate" style={{ color: "var(--color-text-muted)" }}>
                                  {t.event_name ? `${t.event_name} · ` : ""}{fmtDateTime(t.earned_at)}
                                </p>
                              </div>
                              <span className="text-[13px] font-bold tabular-nums flex-shrink-0" style={{ color: positive ? "var(--color-success)" : "var(--color-error)" }}>
                                {positive ? "+" : ""}{t.amount}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })()}

          {/* Communications */}
          <section className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--color-card-border)", background: "var(--color-card)" }}>
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--color-card-border)", background: "var(--color-card-header-bg)" }}>
              <h2 className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Communications</h2>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Send a direct message and view everything sent to {volunteer.first_name}.</p>
            </div>
            <div className="p-5">
              {/* Composer */}
              <div className="rounded-xl border p-4 mb-5" style={{ borderColor: "var(--color-card-border)", background: "var(--color-bg)" }}>
                <div className="flex gap-1.5 mb-3" style={{ background: "var(--color-card)", padding: 4, borderRadius: 8, border: "1px solid var(--color-card-border)", width: "fit-content" }}>
                  {(["email", "sms"] as const).map(c => (
                    <button key={c} onClick={() => { setMsgChannel(c); setMsgError(null); setMsgOk(false); }}
                      className="text-[12px] font-semibold capitalize"
                      style={{ padding: "5px 14px", borderRadius: 6, cursor: "pointer", border: "none",
                        background: msgChannel === c ? "var(--color-gold-subtle)" : "transparent",
                        color: msgChannel === c ? "var(--color-gold)" : "var(--color-text-muted)" }}>
                      {c === "email" ? "Email" : "SMS"}
                    </button>
                  ))}
                </div>
                {msgChannel === "email" && (
                  <input value={msgSubject} onChange={e => setMsgSubject(e.target.value)} placeholder="Subject"
                    className="w-full border rounded-lg px-3 py-2 text-[13px] mb-2"
                    style={{ borderColor: "var(--color-input-border)", background: "var(--color-input-bg)", color: "var(--color-text-primary)" }} />
                )}
                <textarea value={msgBody} onChange={e => setMsgBody(e.target.value)} rows={3}
                  placeholder={msgChannel === "sms" ? "Text message… ({{first_name}} supported)" : "Message… ({{first_name}} supported)"}
                  className="w-full border rounded-lg px-3 py-2 text-[13px] resize-none"
                  style={{ borderColor: "var(--color-input-border)", background: "var(--color-input-bg)", color: "var(--color-text-primary)", lineHeight: 1.5 }} />
                {msgError && <p className="text-[12px] mt-2" style={{ color: "var(--color-error)" }}>{msgError}</p>}
                {msgOk && <p className="text-[12px] mt-2" style={{ color: "var(--color-success)" }}>Message sent.</p>}
                <div className="flex justify-end mt-3">
                  <button onClick={sendMessage} disabled={msgSending}
                    className="text-[13px] font-semibold px-4 py-2 rounded-lg"
                    style={{ background: "var(--color-gold)", color: "#1A1714", opacity: msgSending ? 0.6 : 1, cursor: msgSending ? "default" : "pointer" }}>
                    {msgSending ? "Sending…" : `Send ${msgChannel === "sms" ? "SMS" : "email"}`}
                  </button>
                </div>
              </div>

              {/* History */}
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "var(--color-text-muted)" }}>History</p>
              {comms === null ? (
                <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>Loading…</p>
              ) : comms.length === 0 ? (
                <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>Nothing sent yet.</p>
              ) : (
                <div className="flex flex-col">
                  {comms.map((c, i) => {
                    const cat = COMM_CATEGORY[c.category] ?? COMM_CATEGORY.system;
                    const failed = c.status === "failed";
                    return (
                      <div key={c.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: i > 0 ? "1px solid var(--color-divider-subtle)" : "none" }}>
                        <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 28, height: 28, background: "var(--color-bg)", color: "var(--color-text-muted)" }}>
                          {c.channel === "sms" ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                            {c.subject || (c.channel === "sms" ? "SMS message" : "Message")}
                          </p>
                          <p className="text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>{c.created_at ? fmtDateTime(c.created_at) : "—"}</p>
                        </div>
                        <span className="text-[10px] font-semibold flex-shrink-0" style={{ background: cat.bg, color: cat.color, padding: "2px 7px", borderRadius: 5 }}>{cat.label}</span>
                        {failed && <span className="text-[10px] font-semibold flex-shrink-0" style={{ background: "var(--color-error-bg)", color: "var(--color-error)", padding: "2px 7px", borderRadius: 5 }}>Failed</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Personal details */}
          <section
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: "var(--color-card-border)", background: "var(--color-card)" }}
          >
            <div
              className="px-5 py-3.5 border-b"
              style={{ borderColor: "var(--color-card-border)", background: "var(--color-card-header-bg)" }}
            >
              <h2 className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Personal details</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date of birth"  value={fmt(volunteer.date_of_birth)} />
              <Field label="Gender"         value={volunteer.gender ? volunteer.gender.charAt(0).toUpperCase() + volunteer.gender.slice(1) : "—"} />
              <Field label="Nationality"    value={volunteer.nationality} />
              <Field label="Phone"          value={volunteer.phone} />
              <Field label="Address"        value={volunteer.address} />
              {volunteer.dietary_requirements && (
                <Field label="Dietary"      value={volunteer.dietary_requirements} />
              )}
              {volunteer.medical_info && (
                <Field label="Medical info" value={volunteer.medical_info} />
              )}
            </div>
          </section>

          {/* Emergency contact */}
          <section
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: "var(--color-card-border)", background: "var(--color-card)" }}
          >
            <div
              className="px-5 py-3.5 border-b"
              style={{ borderColor: "var(--color-card-border)", background: "var(--color-card-header-bg)" }}
            >
              <h2 className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Emergency contact</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name"  value={volunteer.emergency_contact_name} />
              <Field label="Phone" value={volunteer.emergency_contact_phone} />
            </div>
          </section>
        </div>

      </div>

      {/* Modals */}
      {modal === "approve" && (
        <ApproveModal
          volunteer={volunteer}
          onClose={() => setModal(null)}
          onDone={() => handleDone(`DBS approved for ${volunteer.first_name}.`)}
        />
      )}
      {modal === "reject" && (
        <RejectModal
          volunteer={volunteer}
          rejectTemplate={rejectTpl}
          onClose={() => setModal(null)}
          onDone={() => handleDone(`DBS rejected. Rejection email sent to ${volunteer.email}.`)}
        />
      )}
      {modal === "lseg-approve" && (
        <LsegApproveModal
          volunteer={volunteer}
          dbsStatus={dbsStatus}
          approvalTemplate={approveTpl}
          onClose={() => setModal(null)}
          onDone={() => handleDone(
            dbsStatus === "verified"
              ? `LSEG cleared for ${volunteer.first_name}. Approval email sent.`
              : `LSEG marked as clear. Awaiting DBS verification before full approval.`
          )}
        />
      )}
      {modal === "lseg-reject" && (
        <LsegRejectModal
          volunteer={volunteer}
          onClose={() => setModal(null)}
          onDone={() => handleDone(`LSEG marked as high risk for ${volunteer.first_name}.`)}
        />
      )}
    </div>
  );
}
