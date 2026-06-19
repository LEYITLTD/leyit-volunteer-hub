"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Role        = { id: string; role_name: string; capacity: number; gender_restriction: string };
type Volunteer   = { id: string; first_name: string; last_name: string; email: string };
type Application = {
  id: string; role_id: string; status: string;
  applied_at: string; confirmed_at: string | null;
  volunteers: Volunteer;
};
type Event = {
  id: string; name: string; city: string | null;
  event_start: string; event_end: string; status: string;
  event_roles: Role[];
  event_applications: Application[];
};
type CertConfig = {
  id: string; event_id: string;
  template_storage_path: string; template_url: string | null;
  name_x: number; name_y: number; font_size: number; text_color: string;
};
type PageTab = "overview" | "applications" | "checkins" | "points" | "certificate";

type CheckInRow = {
  volunteer_id:  string;
  first_name:    string;
  last_name:     string;
  email:         string;
  role_name:     string;
  check_in:      { id: string; scanned_at: string; within_time_window: boolean } | null;
  check_out:     { id: string; scanned_at: string; within_time_window: boolean } | null;
  duration_mins: number | null;
};

/* ─── Badge maps ─────────────────────────────────────────────────────────── */

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: "Draft",     bg: "#F3EFE6", color: "#9E9690" },
  published: { label: "Published", bg: "#DBEAFE", color: "#1D4ED8" },
  active:    { label: "Active",    bg: "#DCFCE7", color: "#15803D" },
  completed: { label: "Completed", bg: "#F3EFE6", color: "#78716C" },
  cancelled: { label: "Cancelled", bg: "#FEE2E2", color: "#DC2626" },
};
const GENDER: Record<string, { label: string; bg: string; color: string }> = {
  any:    { label: "Any",    bg: "#F3EFE6", color: "#78716C" },
  male:   { label: "Male",   bg: "#DBEAFE", color: "#1D4ED8" },
  female: { label: "Female", bg: "#FCE7F3", color: "#9D174D" },
};
const APP_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  confirmed:  { label: "Confirmed",  bg: "#DCFCE7", color: "#15803D" },
  waitlisted: { label: "Waitlisted", bg: "#DBEAFE", color: "#1D4ED8" },
  declined:   { label: "Declined",   bg: "#FEE2E2", color: "#DC2626" },
  cancelled:  { label: "Cancelled",  bg: "#F3EFE6", color: "#9E9690" },
  no_show:    { label: "No show",    bg: "#FEE2E2", color: "#DC2626" },
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const UK = "Europe/London";
function fmt(d: string)      { return new Date(d).toLocaleDateString("en-GB",  { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: UK }); }
function fmtTime(d: string)  { return new Date(d).toLocaleTimeString("en-GB",  { hour: "2-digit", minute: "2-digit", timeZone: UK }); }
function fmtShort(d: string) { return new Date(d).toLocaleDateString("en-GB",  { day: "numeric", month: "short", year: "numeric", timeZone: UK }); }

/* ─── Certificate text colour presets ───────────────────────────────────── */

const TEXT_COLORS = [
  { label: "Dark ink", value: "#2C2220" },
  { label: "Gold",     value: "#A8854A" },
  { label: "Navy",     value: "#1A263A" },
  { label: "White",    value: "#F5F2EE" },
];

/* ─── CertificateTab ─────────────────────────────────────────────────────── */

function CertificateTab({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [config,  setConfig]  = useState<CertConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Builder state — mirrors config; updated live as user adjusts controls
  const [localDataUrl,    setLocalDataUrl]    = useState<string | null>(null);
  const [localBase64,     setLocalBase64]     = useState<string | null>(null);
  const [nameX,           setNameX]           = useState(0.5);
  const [nameY,           setNameY]           = useState(0.5);
  const [fontSize,        setFontSize]        = useState(80);
  const [textColor,       setTextColor]       = useState("#2C2220");
  const [saving,          setSaving]          = useState(false);
  const [saveError,       setSaveError]       = useState<string | null>(null);

  // Send state
  const [confirmedCount,  setConfirmedCount]  = useState<number | null>(null);
  const [confirmSend,     setConfirmSend]     = useState(false);
  const [sendingCerts,    setSendingCerts]    = useState(false);
  const [sendResult,      setSendResult]      = useState<number | null>(null);
  const [sendError,       setSendError]       = useState<string | null>(null);

  // Image refs for font scaling
  const containerRef  = useRef<HTMLDivElement>(null);
  const [naturalWidth, setNaturalWidth] = useState(1);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  // Load Great Vibes font for browser preview
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap";
    link.rel  = "stylesheet";
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch { /* already removed */ } };
  }, []);

  // Fetch saved config
  useEffect(() => {
    fetch(`/api/admin/events/${eventId}/certificate`)
      .then(r => r.json())
      .then((d: CertConfig | null) => {
        if (d) {
          setConfig(d);
          setNameX(d.name_x);
          setNameY(d.name_y);
          setFontSize(d.font_size);
          setTextColor(d.text_color);
        }
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  // Confirmed volunteer count (reuses broadcast count endpoint)
  useEffect(() => {
    fetch(`/api/admin/broadcast?scope=event&event_id=${eventId}&gender=all`)
      .then(r => r.json())
      .then(d => setConfirmedCount(typeof d.count === "number" ? d.count : null));
  }, [eventId]);

  const templateUrl = localDataUrl ?? config?.template_url ?? null;
  const hasTemplate = !!templateUrl;
  const hasConfig   = !!config;
  const isCustomColor = !TEXT_COLORS.some(c => c.value === textColor);

  function handleFiles(files: FileList | null) {
    if (!files?.[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setLocalDataUrl(dataUrl);
      setLocalBase64(dataUrl.split(",")[1]);
    };
    reader.readAsDataURL(files[0]);
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setNameX(Math.min(1, Math.max(0, (e.clientX - rect.left)  / rect.width)));
    setNameY(Math.min(1, Math.max(0, (e.clientY - rect.top)   / rect.height)));
  }

  const getDisplayFontSize = useCallback(() => {
    if (!containerRef.current || naturalWidth === 0) return fontSize;
    return fontSize * containerRef.current.clientWidth / naturalWidth;
  }, [fontSize, naturalWidth]);

  async function save() {
    setSaving(true); setSaveError(null);
    try {
      const body: Record<string, unknown> = { name_x: nameX, name_y: nameY, font_size: fontSize, text_color: textColor };
      if (localBase64) body.template_base64 = localBase64;
      const res  = await fetch(`/api/admin/events/${eventId}/certificate`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setConfig({ ...data, template_url: templateUrl });
      setLocalBase64(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  }

  async function sendCertificates() {
    setSendingCerts(true); setSendError(null);
    try {
      const res  = await fetch(`/api/admin/events/${eventId}/certificate/send`, { method: "POST" });
      const data = await res.json() as { sent?: number; failed?: { email: string; error: string }[]; total?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      if ((data.failed?.length ?? 0) > 0) {
        const firstErr = data.failed![0].error;
        setSendError(`${data.failed!.length} failed. First error: ${firstErr}`);
      }
      setSendResult(data.sent ?? 0); setConfirmSend(false);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Failed to send");
    } finally { setSendingCerts(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Template upload + positioning ─────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--color-card-border)" }}>
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text-muted)" }}>Certificate Template</h2>
            {hasTemplate && (
              <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                Click anywhere on the certificate to position the name
              </p>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" className="hidden"
            onChange={e => handleFiles(e.target.files)} />
          <button onClick={() => fileInputRef.current?.click()}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
            style={{ background: "var(--color-gold-subtle)", color: "var(--color-gold)", border: "1px solid var(--color-gold)" }}>
            {hasTemplate ? "Replace" : "Upload PNG"}
          </button>
        </div>

        {!hasTemplate ? (
          <div
            className="m-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-14 gap-3 cursor-pointer transition-colors"
            style={{ borderColor: "var(--color-card-border)", background: "var(--color-bg)" }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-muted)" }}>
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <p className="text-[14px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Drop your blank certificate PNG here
            </p>
            <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>or click to browse</p>
          </div>
        ) : (
          <div className="p-4">
            <div
              ref={containerRef}
              className="relative w-full rounded-xl overflow-hidden border select-none"
              style={{ borderColor: "var(--color-card-border)", cursor: "crosshair" }}
              onClick={handleClick}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={templateUrl}
                alt="Certificate template"
                className="w-full h-auto block pointer-events-none"
                draggable={false}
                onLoad={e => setNaturalWidth((e.target as HTMLImageElement).naturalWidth)}
              />

              {/* Name overlay */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left:       `${nameX * 100}%`,
                  top:        `${nameY * 100}%`,
                  transform:  "translate(-50%, -50%)",
                  fontFamily: "'Great Vibes', cursive",
                  fontSize:   `${getDisplayFontSize()}px`,
                  color:      textColor,
                  whiteSpace: "nowrap",
                  lineHeight: 1,
                  filter:     "drop-shadow(0 1px 3px rgba(0,0,0,0.2))",
                }}
              >
                Ahmed Hassan
              </div>

              {/* Crosshair pin */}
              <div
                className="absolute pointer-events-none"
                style={{ left: `${nameX * 100}%`, top: `${nameY * 100}%`, transform: "translate(-50%, -50%)" }}
              >
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: "rgba(255,255,255,0.7)", background: "rgba(0,0,0,0.25)" }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.9)" }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Style controls ────────────────────────────────────────────── */}
      {hasTemplate && (
        <div className="rounded-xl border p-5" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-5" style={{ color: "var(--color-text-muted)" }}>Name Style</h2>

          {/* Font size */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[13px] font-medium" style={{ color: "var(--color-text-secondary)" }}>Font size</label>
              <span className="text-[13px] font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>{fontSize}px</span>
            </div>
            <input
              type="range" min={30} max={220} step={2} value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "var(--color-gold)" }}
            />
            <div className="flex justify-between mt-1 text-[10px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              <span>Small</span><span>Large</span>
            </div>
          </div>

          {/* Colour */}
          <div>
            <label className="text-[13px] font-medium block mb-2.5" style={{ color: "var(--color-text-secondary)" }}>Text colour</label>
            <div className="flex flex-wrap gap-2">
              {TEXT_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setTextColor(c.value)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium border transition-all"
                  style={{
                    borderColor: textColor === c.value ? "var(--color-gold)" : "var(--color-card-border)",
                    background:  textColor === c.value ? "var(--color-gold-subtle)" : "transparent",
                    color:       textColor === c.value ? "var(--color-gold)" : "var(--color-text-secondary)",
                  }}
                >
                  <span className="w-4 h-4 rounded-full border flex-shrink-0" style={{ background: c.value, borderColor: "rgba(255,255,255,0.15)" }} />
                  {c.label}
                </button>
              ))}

              {/* Custom colour picker */}
              <label
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium border cursor-pointer transition-all"
                style={{
                  borderColor: isCustomColor ? "var(--color-gold)" : "var(--color-card-border)",
                  background:  isCustomColor ? "var(--color-gold-subtle)" : "transparent",
                  color:       isCustomColor ? "var(--color-gold)" : "var(--color-text-secondary)",
                }}
              >
                <span className="w-4 h-4 rounded-full border flex-shrink-0 overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                  <input
                    type="color" value={textColor}
                    onChange={e => setTextColor(e.target.value)}
                    className="w-6 h-6 -ml-1 -mt-1 cursor-pointer border-0 p-0 opacity-0 absolute"
                  />
                  <span className="block w-full h-full" style={{ background: textColor }} />
                </span>
                Custom
                <input
                  type="color" value={textColor}
                  onChange={e => setTextColor(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── Save button ───────────────────────────────────────────────── */}
      {hasTemplate && (
        <div className="flex items-center gap-3 justify-end">
          {saveError && <p className="text-[12px] flex-1" style={{ color: "var(--color-error)" }}>{saveError}</p>}
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold"
            style={{ background: "var(--color-gold)", color: "#1A1411", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving…" : hasConfig ? "Save changes" : "Save configuration"}
          </button>
        </div>
      )}

      {/* ── Send certificates ─────────────────────────────────────────── */}
      {hasConfig && (
        <div className="rounded-xl border p-5" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-4" style={{ color: "var(--color-text-muted)" }}>Send Certificates</h2>

          {sendResult !== null ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "#1A2E1A" }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7DE882" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Certificates sent!</p>
                <p className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                  {sendResult} volunteer{sendResult !== 1 ? "s" : ""} received a personalised PDF.
                </p>
              </div>
            </div>
          ) : confirmSend ? (
            <div>
              <p className="text-[13px] mb-4" style={{ color: "var(--color-text-secondary)" }}>
                This will generate a personalised certificate for each of the{" "}
                <strong style={{ color: "var(--color-text-primary)" }}>{confirmedCount ?? "…"} confirmed volunteer{(confirmedCount ?? 0) !== 1 ? "s" : ""}</strong>{" "}
                and email it as a PDF. This cannot be undone.
              </p>
              {sendError && (
                <p className="text-[12px] mb-3 px-3 py-2 rounded-lg" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>
                  {sendError}
                </p>
              )}
              <div className="flex gap-3 max-w-sm">
                <button onClick={() => setConfirmSend(false)}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-medium border"
                  style={{ borderColor: "var(--color-card-border)", color: "var(--color-text-secondary)" }}>
                  Cancel
                </button>
                <button onClick={sendCertificates} disabled={sendingCerts}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={{ background: "var(--color-gold)", color: "#1A1411", opacity: sendingCerts ? 0.7 : 1 }}>
                  {sendingCerts ? "Sending…" : `Send to ${confirmedCount ?? "…"}`}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div>
                <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                  Ready to send to{" "}
                  <strong style={{ color: "var(--color-text-primary)" }}>
                    {confirmedCount ?? "…"} confirmed volunteer{(confirmedCount ?? 0) !== 1 ? "s" : ""}
                  </strong>
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  Each person gets a personalised PDF with their name in calligraphy.
                </p>
              </div>
              <button
                onClick={() => setConfirmSend(true)}
                disabled={(confirmedCount ?? 0) === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold flex-shrink-0 self-start sm:self-auto"
                style={{ background: "var(--color-gold)", color: "#1A1411", opacity: (confirmedCount ?? 0) === 0 ? 0.5 : 1 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Send certificates
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── CheckInsTab ────────────────────────────────────────────────────────── */

function fmtDuration(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function CheckInsTab({ eventId }: { eventId: string }) {
  const [rows,    setRows]    = useState<CheckInRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/events/${eventId}/checkins`)
      .then(r => r.json())
      .then(setRows)
      .finally(() => setLoading(false));
  }, [eventId]);

  const checkedIn  = rows.filter(r => r.check_in).length;
  const checkedOut = rows.filter(r => r.check_out).length;
  const still      = checkedIn - checkedOut;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border px-5 py-12 text-center" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
        <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-muted)" }}>
          <path d="M4 7V5a1 1 0 011-1h2M17 4h2a1 1 0 011 1v2M20 17v2a1 1 0 01-1 1h-2M7 20H5a1 1 0 01-1-1v-2"/>
          <rect x="8" y="8" width="8" height="8" rx="1"/>
        </svg>
        <p className="text-[14px] font-medium" style={{ color: "var(--color-text-secondary)" }}>No check-ins yet</p>
        <p className="text-[12px] mt-1" style={{ color: "var(--color-text-muted)" }}>Scans will appear here as volunteers arrive.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Checked in",   value: checkedIn,             color: "#15803D" },
          { label: "Checked out",  value: checkedOut,            color: "#1D4ED8" },
          { label: "Still inside", value: still < 0 ? 0 : still, color: "var(--color-gold)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-3 text-center" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
            <p className="text-[24px] font-bold tabular-nums" style={{ color }}>{value}</p>
            <p className="text-[10px] uppercase tracking-[0.06em] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>

        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-card-border)" }}>
                {["Volunteer", "Role", "Check-in", "Check-out", "Duration", "Status"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isLast   = i === rows.length - 1;
                const hasIn    = !!row.check_in;
                const hasOut   = !!row.check_out;
                const inside   = hasIn && !hasOut;

                return (
                  <tr key={row.volunteer_id} style={{ borderBottom: isLast ? undefined : "1px solid var(--color-card-border)" }}>
                    {/* Volunteer */}
                    <td className="px-5 py-3">
                      <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {row.first_name} {row.last_name}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{row.email}</p>
                    </td>
                    {/* Role */}
                    <td className="px-5 py-3" style={{ color: "var(--color-text-secondary)" }}>
                      {row.role_name}
                    </td>
                    {/* Check-in */}
                    <td className="px-5 py-3 tabular-nums">
                      {row.check_in ? (
                        <span style={{ color: "#7DE882" }}>{fmtTime(row.check_in.scanned_at)}</span>
                      ) : (
                        <span style={{ color: "var(--color-text-muted)" }}>—</span>
                      )}
                    </td>
                    {/* Check-out */}
                    <td className="px-5 py-3 tabular-nums">
                      {row.check_out ? (
                        <span style={{ color: "#88CCFF" }}>{fmtTime(row.check_out.scanned_at)}</span>
                      ) : inside ? (
                        <span className="text-[10.5px] font-semibold" style={{ background: "#F3EFE6", color: "var(--color-gold)", padding: "2px 8px", borderRadius: 6 }}>
                          Still inside
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-text-muted)" }}>—</span>
                      )}
                    </td>
                    {/* Duration */}
                    <td className="px-5 py-3 tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
                      {row.duration_mins !== null ? fmtDuration(row.duration_mins) : "—"}
                    </td>
                    {/* Status */}
                    <td className="px-5 py-3">
                      {!hasIn ? (
                        <span className="text-[10.5px] font-semibold" style={{ background: "#F3EFE6", color: "#9E9690", padding: "2px 8px", borderRadius: 6 }}>Not scanned</span>
                      ) : inside ? (
                        <span className="text-[10.5px] font-semibold" style={{ background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6 }}>Checked in</span>
                      ) : (
                        <span className="text-[10.5px] font-semibold" style={{ background: "#DBEAFE", color: "#1D4ED8", padding: "2px 8px", borderRadius: 6 }}>Checked out</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y" style={{ borderColor: "var(--color-card-border)" }}>
          {rows.map(row => {
            const hasIn  = !!row.check_in;
            const hasOut = !!row.check_out;
            const inside = hasIn && !hasOut;

            return (
              <div key={row.volunteer_id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-[13px]" style={{ color: "var(--color-text-primary)" }}>
                      {row.first_name} {row.last_name}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{row.role_name}</p>
                  </div>
                  {!hasIn ? (
                    <span className="text-[10px] font-semibold flex-shrink-0" style={{ background: "#F3EFE6", color: "#9E9690", padding: "2px 7px", borderRadius: 6 }}>Not scanned</span>
                  ) : inside ? (
                    <span className="text-[10px] font-semibold flex-shrink-0" style={{ background: "#DCFCE7", color: "#15803D", padding: "2px 7px", borderRadius: 6 }}>Inside</span>
                  ) : (
                    <span className="text-[10px] font-semibold flex-shrink-0" style={{ background: "#DBEAFE", color: "#1D4ED8", padding: "2px 7px", borderRadius: 6 }}>Out</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-[12px]">
                  {row.check_in && (
                    <span className="flex items-center gap-1">
                      <span style={{ color: "var(--color-text-muted)" }}>In</span>
                      <span className="tabular-nums font-medium" style={{ color: "#7DE882" }}>{fmtTime(row.check_in.scanned_at)}</span>
                    </span>
                  )}
                  {row.check_out && (
                    <span className="flex items-center gap-1">
                      <span style={{ color: "var(--color-text-muted)" }}>Out</span>
                      <span className="tabular-nums font-medium" style={{ color: "#88CCFF" }}>{fmtTime(row.check_out.scanned_at)}</span>
                    </span>
                  )}
                  {row.duration_mins !== null && (
                    <span style={{ color: "var(--color-text-muted)" }}>{fmtDuration(row.duration_mins)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

/* ─── PointsTab ──────────────────────────────────────────────────────────── */

type PointsTx = {
  id: string; volunteer_id: string; amount: number; type: string;
  description: string | null; earned_at: string;
  volunteers: { first_name: string; last_name: string } | null;
};

function PointsTab({ eventId, confirmedVolunteers }: {
  eventId: string;
  confirmedVolunteers: { id: string; first_name: string; last_name: string }[];
}) {
  const [txs,      setTxs]      = useState<PointsTx[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [volId,    setVolId]    = useState("");
  const [amount,   setAmount]   = useState("");
  const [reason,   setReason]   = useState("");
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState<string | null>(null);

  function load() {
    return fetch(`/api/admin/events/${eventId}/points`)
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setTxs(d) : null);
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, [eventId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const pts = parseInt(amount, 10);
    if (!volId) { setErr("Select a volunteer."); return; }
    if (!pts || pts === 0) { setErr("Enter a non-zero point value."); return; }
    if (!reason.trim()) { setErr("Reason is required."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteer_id: volId, amount: pts, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setTxs(prev => [data, ...prev]);
      setVolId(""); setAmount(""); setReason("");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const totalPoints = txs.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-5">

      {/* Add points form */}
      <div className="rounded-xl border p-5" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.07em] mb-4" style={{ color: "var(--color-text-muted)" }}>
          Award Points
        </h3>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 items-end">
          {/* Volunteer */}
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5" style={{ color: "var(--color-text-muted)" }}>Volunteer</label>
            <select
              value={volId}
              onChange={e => setVolId(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-[13px]"
              style={{ background: "var(--color-input-bg)", border: "1px solid var(--color-input-border)", color: "var(--color-text-primary)", outline: "none" }}
            >
              <option value="">Select volunteer…</option>
              {confirmedVolunteers.map(v => (
                <option key={v.id} value={v.id}>{v.first_name} {v.last_name}</option>
              ))}
            </select>
          </div>

          {/* Points */}
          <div style={{ width: 110 }}>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5" style={{ color: "var(--color-text-muted)" }}>Points</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 10"
              className="w-full rounded-lg px-3 py-2.5 text-[13px]"
              style={{ background: "var(--color-input-bg)", border: "1px solid var(--color-input-border)", color: "var(--color-text-primary)", outline: "none" }}
            />
            <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>Negative = deduction</p>
          </div>

          {/* Reason */}
          <div className="flex-[2] min-w-0">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5" style={{ color: "var(--color-text-muted)" }}>Reason</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Excellent setup coordination"
              className="w-full rounded-lg px-3 py-2.5 text-[13px]"
              style={{ background: "var(--color-input-bg)", border: "1px solid var(--color-input-border)", color: "var(--color-text-primary)", outline: "none" }}
            />
          </div>

          <button
            type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold flex-shrink-0"
            style={{ background: "var(--color-gold)", color: "#1A1714", opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            {saving ? "Saving…" : "Add"}
          </button>
        </form>
        {err && <p className="mt-3 text-[12px] font-semibold" style={{ color: "var(--color-error)" }}>{err}</p>}
        {confirmedVolunteers.length === 0 && (
          <p className="mt-3 text-[12px]" style={{ color: "var(--color-text-muted)" }}>No confirmed volunteers yet — confirm applications first.</p>
        )}
      </div>

      {/* Transaction list */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--color-card-border)" }}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: "var(--color-text-muted)" }}>
            Transaction history
          </span>
          {txs.length > 0 && (
            <span className="text-[13px] font-bold tabular-nums" style={{ color: totalPoints >= 0 ? "var(--color-gold)" : "#DC2626" }}>
              {totalPoints > 0 ? "+" : ""}{totalPoints} pts total
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
          </div>
        ) : txs.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>No point transactions for this event yet.</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-card-border)" }}>
                {["Volunteer", "Points", "Reason", "Date"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txs.map((tx, i) => {
                const isLast = i === txs.length - 1;
                const vol    = tx.volunteers;
                const pos    = tx.amount > 0;
                return (
                  <tr key={tx.id} style={{ borderBottom: isLast ? undefined : "1px solid var(--color-card-border)" }}>
                    <td className="px-5 py-3 font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {vol ? `${vol.first_name} ${vol.last_name}` : "—"}
                    </td>
                    <td className="px-5 py-3 tabular-nums font-bold" style={{ color: pos ? "#16A34A" : "#DC2626" }}>
                      {pos ? "+" : ""}{tx.amount}
                    </td>
                    <td className="px-5 py-3" style={{ color: "var(--color-text-secondary)" }}>
                      {tx.description ?? "—"}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(tx.earned_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */

export default function EventDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const [event,          setEvent]          = useState<Event | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [publishing,     setPublishing]     = useState(false);
  const [tab,            setTab]            = useState<PageTab>("overview");
  const [cancellingApp,  setCancellingApp]  = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/events/${id}`)
      .then(r => r.json())
      .then(setEvent)
      .finally(() => setLoading(false));
  }, [id]);

  async function cancelApplication(appId: string) {
    setCancellingApp(appId);
    try {
      const res = await fetch(`/api/admin/applications/${appId}/cancel`, { method: "POST" });
      if (res.ok) {
        setEvent(e => e ? {
          ...e,
          event_applications: e.event_applications.map(a =>
            a.id === appId ? { ...a, status: "cancelled" } : a,
          ),
        } : e);
      }
    } finally {
      setCancellingApp(null);
    }
  }

  async function publish() {
    if (!event) return;
    setPublishing(true);
    const res = await fetch(`/api/admin/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published", published_at: new Date().toISOString() }),
    });
    if (res.ok) {
      const data = await res.json();
      setEvent(e => e ? { ...e, status: data.status } : e);
    }
    setPublishing(false);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }
  if (!event) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>Event not found.</p>
      </div>
    );
  }

  const totalCapacity  = event.event_roles.reduce((n, r) => n + r.capacity, 0);
  const totalApplied   = event.event_applications.length;
  const totalConfirmed = event.event_applications.filter(a => a.status === "confirmed").length;
  const fillRate       = totalCapacity > 0 ? Math.round((totalApplied / totalCapacity) * 100) : 0;
  const s              = STATUS[event.status] ?? STATUS.draft;

  function roleApps(roleId: string) { return event!.event_applications.filter(a => a.role_id === roleId); }
  function roleName(roleId: string) { return event!.event_roles.find(r => r.id === roleId)?.role_name ?? "—"; }

  const TABS: { key: PageTab; label: string }[] = [
    { key: "overview",     label: "Overview" },
    { key: "applications", label: `Applications (${totalApplied})` },
    { key: "checkins",     label: "Check-ins" },
    { key: "points",       label: "Points" },
    { key: "certificate",  label: "Certificate" },
  ];

  const confirmedVolunteers = event.event_applications
    .filter(a => a.status === "confirmed")
    .map(a => ({ id: a.volunteers.id, first_name: a.volunteers.first_name, last_name: a.volunteers.last_name }));

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">

      {/* Back */}
      <Link href="/admin/events" className="inline-flex items-center gap-1.5 text-[13px] mb-5" style={{ color: "var(--color-text-secondary)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        All Events
      </Link>

      {/* Event header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight leading-tight" style={{ color: "var(--color-text-primary)" }}>
              {event.name}
            </h1>
            <span className="text-[11px] font-semibold" style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 6 }}>
              {s.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            {event.city && (
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {event.city}
              </span>
            )}
            <span>{fmt(event.event_start)}</span>
            <span>{fmtTime(event.event_start)} – {fmtTime(event.event_end)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 self-start">
          <Link
            href={`/admin/events/${event.id}/report`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold"
            style={{ background: "var(--color-card)", border: "1px solid var(--color-card-border)", color: "var(--color-text-secondary)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            Report
          </Link>
          {event.status === "draft" && (
            <button
              onClick={publish} disabled={publishing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold"
              style={{ background: "var(--color-gold)", color: "#1A1411", opacity: publishing ? 0.7 : 1 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              {publishing ? "Publishing…" : "Publish Event"}
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total spots",  value: totalCapacity.toString() },
          { label: "Applied",      value: totalApplied.toString() },
          { label: "Confirmed",    value: totalConfirmed.toString(), gold: true },
          { label: "Fill rate",    value: `${fillRate}%` },
        ].map(({ label, value, gold }) => (
          <div key={label} className="rounded-xl border p-4 text-center" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
            <p className="font-ui text-[22px] sm:text-[26px] font-bold tabular-nums" style={{ color: gold ? "var(--color-gold)" : "var(--color-text-primary)" }}>{value}</p>
            <p className="text-[10px] uppercase tracking-[0.06em] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: "var(--color-card)", border: "1px solid var(--color-card-border)" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
            style={{
              background: tab === t.key ? "var(--color-gold-subtle)" : "transparent",
              color:      tab === t.key ? "var(--color-gold)" : "var(--color-text-muted)",
              border:     tab === t.key ? "1px solid var(--color-gold)" : "1px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ──────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="rounded-xl border p-5" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-4" style={{ color: "var(--color-text-muted)" }}>
            Role breakdown
          </h2>
          {event.event_roles.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>No roles on this event.</p>
          ) : (
            <div className="space-y-5">
              {event.event_roles.map(role => {
                const apps      = roleApps(role.id);
                const applied   = apps.length;
                const confirmed = apps.filter(a => a.status === "confirmed").length;
                const pct       = role.capacity > 0 ? Math.min((applied / role.capacity) * 100, 100) : 0;
                const full      = pct >= 100;
                const g         = GENDER[role.gender_restriction] ?? GENDER.any;

                return (
                  <div key={role.id}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-[14px]" style={{ color: "var(--color-text-primary)" }}>{role.role_name}</span>
                        <span className="text-[10px] font-semibold" style={{ background: g.bg, color: g.color, padding: "2px 7px", borderRadius: 6 }}>{g.label}</span>
                      </div>
                      <span className="text-[12px] font-semibold tabular-nums" style={{ color: full ? "#7DE882" : "var(--color-text-secondary)" }}>
                        {applied}/{role.capacity}
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: "#F1EAD9" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: full ? "#15803D" : "linear-gradient(90deg,#C9A227,#A8854A)" }} />
                    </div>
                    <div className="flex gap-4 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                      <span style={{ color: confirmed > 0 ? "#7DE882" : undefined }}>{confirmed} confirmed</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Applications tab ──────────────────────────────────────────── */}
      {tab === "applications" && (
        <div className="rounded-xl border overflow-hidden" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          {event.event_applications.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>No applications yet.</p>
              {event.status === "draft" && (
                <p className="text-[12px] mt-1" style={{ color: "var(--color-text-muted)" }}>Publish the event so volunteers can apply.</p>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-card-border)" }}>
                      {["Volunteer", "Role", "Status", "Date", ""].map((h, i) => (
                        <th key={i} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {event.event_applications.map((app, i) => {
                      const badge      = APP_STATUS[app.status] ?? APP_STATUS.confirmed;
                      const canCancel  = app.status === "confirmed" || app.status === "waitlisted";
                      const isCancelling = cancellingApp === app.id;
                      return (
                        <tr key={app.id} style={{ borderBottom: i < event.event_applications.length - 1 ? "1px solid var(--color-card-border)" : undefined }}>
                          <td className="px-5 py-3">
                            <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>{app.volunteers.first_name} {app.volunteers.last_name}</p>
                            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{app.volunteers.email}</p>
                          </td>
                          <td className="px-5 py-3" style={{ color: "var(--color-text-secondary)" }}>{roleName(app.role_id)}</td>
                          <td className="px-5 py-3">
                            <span className="text-[10.5px] font-semibold" style={{ background: badge.bg, color: badge.color, padding: "2px 9px", borderRadius: 6 }}>{badge.label}</span>
                          </td>
                          <td className="px-5 py-3 tabular-nums" style={{ color: "var(--color-text-secondary)" }}>{fmtShort(app.applied_at)}</td>
                          <td className="px-5 py-3">
                            {canCancel && (
                              <button
                                onClick={() => cancelApplication(app.id)}
                                disabled={isCancelling}
                                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg"
                                style={{ background: "#FEE2E2", color: "#DC2626", opacity: isCancelling ? 0.6 : 1 }}
                              >
                                {isCancelling ? "…" : "Cancel"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y" style={{ borderColor: "var(--color-card-border)" }}>
                {event.event_applications.map(app => {
                  const badge      = APP_STATUS[app.status] ?? APP_STATUS.confirmed;
                  const canCancel  = app.status === "confirmed" || app.status === "waitlisted";
                  const isCancelling = cancellingApp === app.id;
                  return (
                    <div key={app.id} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[13px] truncate" style={{ color: "var(--color-text-primary)" }}>{app.volunteers.first_name} {app.volunteers.last_name}</p>
                        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{roleName(app.role_id)} · {fmtShort(app.applied_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-semibold" style={{ background: badge.bg, color: badge.color, padding: "2px 8px", borderRadius: 6 }}>{badge.label}</span>
                        {canCancel && (
                          <button
                            onClick={() => cancelApplication(app.id)}
                            disabled={isCancelling}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                            style={{ background: "#FEE2E2", color: "#DC2626", opacity: isCancelling ? 0.6 : 1 }}
                          >
                            {isCancelling ? "…" : "Cancel"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Check-ins tab ─────────────────────────────────────────────── */}
      {tab === "checkins" && (
        <CheckInsTab eventId={event.id} />
      )}

      {/* ── Points tab ────────────────────────────────────────────────── */}
      {tab === "points" && (
        <PointsTab eventId={event.id} confirmedVolunteers={confirmedVolunteers} />
      )}

      {/* ── Certificate tab ───────────────────────────────────────────── */}
      {tab === "certificate" && (
        <CertificateTab eventId={event.id} eventName={event.name} />
      )}
    </div>
  );
}
