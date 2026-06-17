"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

/* ─── Types ─────────────────────────────────────────────────────────────── */

type Compliance = {
  dbs_status:           string | null;
  dbs_document_url:     string | null;
  dbs_uploaded_at:      string | null;
  dbs_expiry_date:      string | null;
  dbs_reviewed_at:      string | null;
  dbs_rejection_reason: string | null;
  refinitiv_status:     string | null;
  overall_status:       string | null;
  approved_at:          string | null;
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
  return d ? new Date(d).toLocaleDateString("en-GB") : "—";
}

function renderTemplate(html: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, v), html);
}

const DBS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  not_uploaded: { label: "Not uploaded", bg: "#2C2825", color: "#9E9690" },
  pending:      { label: "Pending review", bg: "#3A2E1A", color: "#C4973A" },
  verified:     { label: "Verified",       bg: "#1A2E1A", color: "#4CAF50" },
  rejected:     { label: "Rejected",       bg: "#2E1A1A", color: "#E57373" },
};

const OVERALL_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  pending:  { label: "Pending",  bg: "#3A2E1A", color: "#C4973A" },
  approved: { label: "Approved", bg: "#1A2E1A", color: "#4CAF50" },
  rejected: { label: "Rejected", bg: "#2E1A1A", color: "#E57373" },
};

function Badge({ map, value }: { map: typeof DBS_BADGE; value: string | null }) {
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
  refinitivStatus,
  approvalTemplate,
  onClose,
  onDone,
}: {
  volunteer: Volunteer;
  refinitivStatus: string | null;
  approvalTemplate: Template | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]               = useState<string | null>(null);

  const willApprove = refinitivStatus === "clear";
  const previewHtml = approvalTemplate
    ? renderTemplate(approvalTemplate.body_html, { first_name: volunteer.first_name })
    : "";

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
            style={{
              background: willApprove ? "#1A2E1A" : "#3A2E1A",
              color:      willApprove ? "#4CAF50"  : "#C4973A",
            }}
          >
            {willApprove
              ? `Refinitiv check is already clear — approving this DBS will fully approve ${volunteer.first_name}'s application and send the approval email immediately.`
              : `Refinitiv check is still pending — DBS will be marked verified but the full approval email won't be sent until Refinitiv clears.`}
          </div>

          {/* Email preview if will approve */}
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
                style={{ background: reason.trim() ? "#4CAF50" : "#C4973A" }}
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
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState<"approve" | "reject" | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch(`/api/admin/volunteers/${id}`)
      .then((r) => r.json())
      .then(({ volunteer: v, dbsSignedUrl, templates: tpls }) => {
        setVolunteer(v);
        setDbsUrl(dbsSignedUrl);
        setTemplates(tpls ?? []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

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
          style={{ background: "#1A2E1A", color: "#4CAF50" }}
        >
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column — personal info */}
        <div className="lg:col-span-3 flex flex-col gap-5">
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

        {/* Right column — compliance */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* DBS section */}
          <section
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: "var(--color-card-border)", background: "var(--color-card)" }}
          >
            <div
              className="px-5 py-3.5 border-b flex items-center justify-between"
              style={{ borderColor: "var(--color-card-border)", background: "var(--color-card-header-bg)" }}
            >
              <h2 className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>DBS certificate</h2>
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

              {/* Rejection reason */}
              {dbsStatus === "rejected" && compliance?.dbs_rejection_reason && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                    Rejection reason
                  </p>
                  <div
                    className="rounded-xl p-3 text-[13px] leading-relaxed"
                    style={{ background: "#2E1A1A", color: "#E57373", border: "1px solid #4E2A2A" }}
                  >
                    {compliance.dbs_rejection_reason}
                  </div>
                </div>
              )}

              {/* Document viewer */}
              {dbsUrl && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "var(--color-text-muted)" }}>
                    Document
                  </p>
                  {dbsUrl.match(/\.pdf(\?|$)/i) ? (
                    <div
                      className="rounded-xl overflow-hidden border"
                      style={{ borderColor: "var(--color-card-border)", height: "260px" }}
                    >
                      <iframe src={dbsUrl} className="w-full h-full border-0" title="DBS certificate" />
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-card-border)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={dbsUrl} alt="DBS certificate" className="w-full object-contain max-h-[260px]" />
                    </div>
                  )}
                  <a
                    href={dbsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-[12px]"
                    style={{ color: "var(--color-gold)" }}
                  >
                    Open in new tab ↗
                  </a>
                </div>
              )}

              {!compliance?.dbs_document_url && (
                <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>
                  No document uploaded yet.
                </p>
              )}

              {/* Approve / Reject buttons */}
              {isPending && (
                <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "var(--color-card-border)" }}>
                  <button
                    onClick={() => setModal("approve")}
                    className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-opacity"
                    style={{ background: "var(--color-gold)", color: "#1A1714" }}
                  >
                    Approve DBS
                  </button>
                  <button
                    onClick={() => setModal("reject")}
                    className="w-full py-2.5 rounded-xl text-[13px] font-semibold border transition-opacity"
                    style={{ borderColor: "#B33A3A", color: "#E57373", background: "#2E1A1A" }}
                  >
                    Reject DBS
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Refinitiv */}
          <section
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: "var(--color-card-border)", background: "var(--color-card)" }}
          >
            <div
              className="px-5 py-3.5 border-b"
              style={{ borderColor: "var(--color-card-border)", background: "var(--color-card-header-bg)" }}
            >
              <h2 className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Refinitiv check</h2>
            </div>
            <div className="p-5">
              <Badge map={DBS_BADGE} value={compliance?.refinitiv_status ?? "not_uploaded"} />
              {compliance?.refinitiv_status === "pending" || !compliance?.refinitiv_status ? (
                <p className="text-[13px] mt-3" style={{ color: "var(--color-text-muted)" }}>
                  Awaiting Refinitiv screening.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {/* Modals */}
      {modal === "approve" && (
        <ApproveModal
          volunteer={volunteer}
          refinitivStatus={compliance?.refinitiv_status ?? null}
          approvalTemplate={approveTpl}
          onClose={() => setModal(null)}
          onDone={() => handleDone(`DBS approved for ${volunteer.first_name}. ${compliance?.refinitiv_status === "clear" ? "Approval email sent." : "Awaiting Refinitiv check."}`)}
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
    </div>
  );
}
