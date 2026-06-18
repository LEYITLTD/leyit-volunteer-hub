"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Event = {
  id: string; name: string; city: string | null;
  event_start: string; event_end: string; status: string;
};
type ScanResult = {
  success?: boolean;
  already_complete?: boolean;
  scan_type?: "check_in" | "check_out";
  volunteer?: { id: string; first_name: string; last_name: string; email: string };
  event?: { id: string; name: string };
  message?: string;
  error?: string;
};
type Attendee = {
  application_id: string;
  volunteer_id:   string;
  first_name:     string;
  last_name:      string;
  email:          string;
  role_name:      string;
  checked_in:     boolean;
  checked_out:    boolean;
};
type PermState = "idle" | "requesting" | "granted" | "denied" | "unavailable";
type Mode = "qr" | "manual";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" });
}

/* ─── Result card (shared) ───────────────────────────────────────────────── */

function ResultCard({ result, onDismiss }: { result: ScanResult; onDismiss: () => void }) {
  return (
    <div
      className="w-full max-w-sm rounded-2xl overflow-hidden"
      style={{
        background: "#1A1714",
        border: `1px solid ${result.error ? "rgba(255,142,142,0.3)" : result.already_complete ? "rgba(255,255,255,0.1)" : result.scan_type === "check_in" ? "rgba(125,232,130,0.3)" : "rgba(136,204,255,0.3)"}`,
        boxShadow: "0 4px 40px rgba(0,0,0,0.5)",
      }}
    >
      <div className="h-1" style={{
        background: result.error ? "#FF8E8E" : result.already_complete ? "rgba(255,255,255,0.15)" : result.scan_type === "check_in" ? "#7DE882" : "#88CCFF",
      }} />
      <div className="p-5">
        {result.error && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(255,142,142,0.12)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF8E8E" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[15px] mb-0.5" style={{ color: "#FF8E8E" }}>Check-in failed</p>
              <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>{result.error}</p>
            </div>
          </div>
        )}

        {result.already_complete && result.volunteer && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[14px]"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
              {initials(result.volunteer.first_name, result.volunteer.last_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[15px]" style={{ color: "#F3E9D2" }}>
                {result.volunteer.first_name} {result.volunteer.last_name}
              </p>
              <p className="text-[13px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Already checked in &amp; out</p>
            </div>
          </div>
        )}

        {result.success && result.volunteer && (
          <div>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[15px]"
                style={{
                  background: result.scan_type === "check_in" ? "rgba(125,232,130,0.15)" : "rgba(136,204,255,0.15)",
                  color:      result.scan_type === "check_in" ? "#7DE882" : "#88CCFF",
                }}>
                {initials(result.volunteer.first_name, result.volunteer.last_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[16px] leading-tight" style={{ color: "#F3E9D2" }}>
                  {result.volunteer.first_name} {result.volunteer.last_name}
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{result.volunteer.email}</p>
              </div>
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ background: result.scan_type === "check_in" ? "#1A2E1A" : "#1A263A" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={result.scan_type === "check_in" ? "#7DE882" : "#88CCFF"}
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {result.scan_type === "check_in"
                    ? <polyline points="20 6 9 17 4 12"/>
                    : <polyline points="4 6 9 17 20 12"/>}
                </svg>
              </div>
            </div>
            <span className="text-[12px] font-bold px-3 py-1.5 rounded-full"
              style={{
                background: result.scan_type === "check_in" ? "#1A2E1A" : "#1A263A",
                color:      result.scan_type === "check_in" ? "#7DE882" : "#88CCFF",
              }}>
              {result.scan_type === "check_in" ? "✓ Checked in" : "→ Checked out"}
            </span>
          </div>
        )}

        <button
          onClick={onDismiss}
          className="mt-4 w-full py-2.5 rounded-xl text-[13px] font-semibold"
          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}
        >
          {result.error || result.already_complete ? "Dismiss" : "Done"}
        </button>
      </div>
    </div>
  );
}

/* ─── Manual check-in panel ──────────────────────────────────────────────── */

function ManualPanel({ eventId, onResult }: { eventId: string; onResult: (r: ScanResult) => void }) {
  const [query,      setQuery]      = useState("");
  const [attendees,  setAttendees]  = useState<Attendee[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  // Load all attendees on mount, then filter as user types
  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/events/${eventId}/attendees`)
      .then(r => r.json())
      .then(d => setAttendees(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [eventId]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  const q = query.toLowerCase().trim();
  const filtered = q
    ? attendees.filter(a => {
        const full = `${a.first_name} ${a.last_name}`.toLowerCase();
        return full.includes(q) || a.first_name.toLowerCase().includes(q) || a.last_name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
      })
    : attendees;

  async function checkIn(attendee: Attendee) {
    setProcessing(attendee.volunteer_id);
    try {
      const res = await fetch("/api/admin/checkin", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ volunteer_id: attendee.volunteer_id, event_id: eventId }),
      });
      const result = await res.json() as ScanResult;
      onResult(result);
      // Update local state to reflect new check-in status
      if (result.success || result.already_complete) {
        setAttendees(prev => prev.map(a =>
          a.volunteer_id === attendee.volunteer_id
            ? {
                ...a,
                checked_in:  result.scan_type === "check_in"  ? true  : a.checked_in,
                checked_out: result.scan_type === "check_out" ? true  : a.checked_out,
              }
            : a
        ));
      }
    } catch {
      onResult({ error: "Network error — try again." });
    } finally {
      setProcessing(null);
    }
  }

  const notCheckedIn = filtered.filter(a => !a.checked_in);
  const checkedIn    = filtered.filter(a => a.checked_in && !a.checked_out);
  const checkedOut   = filtered.filter(a => a.checked_out);

  function Section({ label, items, color }: { label: string; items: Attendee[]; color: string }) {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2 px-1" style={{ color }}>
          {label} ({items.length})
        </p>
        <div className="flex flex-col gap-2">
          {items.map(a => {
            const busy = processing === a.volunteer_id;
            const statusLabel = a.checked_out ? "Out" : a.checked_in ? "In" : null;
            const statusColor = a.checked_out ? "#88CCFF" : "#7DE882";
            const actionLabel = a.checked_in && !a.checked_out ? "Check out" : a.checked_in ? "Done" : "Check in";
            const canAct      = !a.checked_out;

            return (
              <div
                key={a.volunteer_id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[13px]"
                  style={{ background: "rgba(168,133,74,0.15)", color: "var(--color-gold)" }}>
                  {initials(a.first_name, a.last_name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] truncate" style={{ color: "#F3E9D2" }}>
                    {a.first_name} {a.last_name}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {a.role_name}
                  </p>
                </div>

                {/* Status badge */}
                {statusLabel && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)", color: statusColor }}>
                    {statusLabel}
                  </span>
                )}

                {/* Action button */}
                {canAct && (
                  <button
                    onClick={() => checkIn(a)}
                    disabled={busy}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-opacity"
                    style={{
                      background: a.checked_in ? "rgba(136,204,255,0.15)" : "rgba(125,232,130,0.15)",
                      color:      a.checked_in ? "#88CCFF" : "#7DE882",
                      opacity:    busy ? 0.5 : 1,
                      border:     `1px solid ${a.checked_in ? "rgba(136,204,255,0.2)" : "rgba(125,232,130,0.2)"}`,
                    }}
                  >
                    {busy ? "…" : actionLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search input */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => setQuery(e.target.value), 0);
              setQuery(e.target.value);
            }}
            placeholder="Search by name…"
            className="w-full rounded-xl pl-9 pr-4 py-2.5 text-[13px]"
            style={{
              background: "rgba(255,255,255,0.07)",
              border:     "1px solid rgba(255,255,255,0.1)",
              color:      "#F3E9D2",
              outline:    "none",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              {query ? "No volunteers match that name" : "No confirmed volunteers for this event"}
            </p>
          </div>
        ) : (
          <>
            <Section label="Not yet checked in" items={notCheckedIn} color="rgba(255,255,255,0.35)" />
            <Section label="Checked in"          items={checkedIn}    color="#7DE882" />
            <Section label="Checked out"         items={checkedOut}   color="#88CCFF" />
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Scanner page ───────────────────────────────────────────────────────── */

export default function CheckInScannerPage() {
  const [events,        setEvents]        = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventId,       setEventId]       = useState<string>("");
  const [mode,          setMode]          = useState<Mode>("qr");
  const [permState,     setPermState]     = useState<PermState>("idle");
  const [scanning,      setScanning]      = useState(false);
  const [lastResult,    setLastResult]    = useState<ScanResult | null>(null);
  const [processing,    setProcessing]    = useState(false);

  const videoRef      = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const rafRef        = useRef<number>(0);
  const coolRef       = useRef(false);
  const processingRef = useRef(false);

  useEffect(() => { processingRef.current = processing; }, [processing]);

  useEffect(() => {
    fetch("/api/admin/events")
      .then(r => r.json())
      .then((data: Event[] | { events?: Event[] }) => {
        const list = (Array.isArray(data) ? data : (data.events ?? [])) as Event[];
        const relevant = list.filter(e => e.status === "active" || e.status === "published");
        setEvents(relevant);
        if (relevant.length === 1) setEventId(relevant[0].id);
      })
      .finally(() => setEventsLoading(false));
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setPermState("unavailable"); return; }
    setPermState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setPermState("granted");
      setScanning(true);
    } catch (e) {
      const err = e as DOMException;
      setPermState(err.name === "NotFoundError" || err.name === "DevicesNotFoundError" ? "unavailable" : "denied");
    }
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Stop camera when switching to manual mode
  useEffect(() => { if (mode === "manual") stopCamera(); }, [mode, stopCamera]);

  useEffect(() => {
    if (!scanning) return;
    let active = true;
    async function runLoop() {
      const { default: jsQR } = await import("jsqr");
      const canvas = canvasRef.current;
      const video  = videoRef.current;
      if (!canvas || !video) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      function tick() {
        if (!active) return;
        if (video!.readyState >= 2 && video!.videoWidth > 0) {
          canvas!.width  = video!.videoWidth;
          canvas!.height = video!.videoHeight;
          ctx!.drawImage(video!, 0, 0);
          const imageData = ctx!.getImageData(0, 0, canvas!.width, canvas!.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
          if (code && !coolRef.current && !processingRef.current) handleQR(code.data);
        }
        rafRef.current = requestAnimationFrame(tick);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    runLoop();
    return () => { active = false; cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning, eventId]);

  async function handleQR(data: string) {
    if (!eventId) return;
    const match = data.match(/\/checkin\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (!match) return;
    coolRef.current = processingRef.current = true;
    setProcessing(true);
    setLastResult(null);
    navigator.vibrate?.(80);
    try {
      const res = await fetch("/api/admin/checkin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteer_id: match[1], event_id: eventId }),
      });
      setLastResult(await res.json() as ScanResult);
    } catch {
      setLastResult({ error: "Network error — try again." });
    } finally {
      setProcessing(false);
      processingRef.current = false;
      setTimeout(() => { coolRef.current = false; }, 3000);
    }
  }

  function dismiss() { setLastResult(null); coolRef.current = false; }

  const selectedEvent = events.find(e => e.id === eventId);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden" style={{ background: "#0A0907" }}>

      {/* ── Top strip: event selector ─────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)", background: "#1A1714" }}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--color-text-muted)" }}>
          Event
        </p>
        {eventsLoading ? (
          <div className="h-9 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
        ) : events.length === 0 ? (
          <p className="text-[13px]" style={{ color: "#FF8E8E" }}>No active events found</p>
        ) : (
          <select
            value={eventId}
            onChange={e => { setEventId(e.target.value); setLastResult(null); }}
            className="w-full rounded-lg px-3 py-2 text-[13px] font-semibold"
            style={{
              background:          "rgba(255,255,255,0.07)",
              border:              "1px solid rgba(255,255,255,0.12)",
              color:               eventId ? "var(--color-gold)" : "rgba(255,255,255,0.4)",
              appearance:          "none",
              backgroundImage:     `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat:    "no-repeat",
              backgroundPosition:  "right 10px center",
              paddingRight:        "32px",
            }}
          >
            <option value="" disabled style={{ background: "#1A1714" }}>— Select an event —</option>
            {events.map(e => (
              <option key={e.id} value={e.id} style={{ background: "#1A1714", color: "#F3E9D2" }}>
                {e.name}{e.city ? ` · ${e.city}` : ""} · {fmtDate(e.event_start)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Mode tabs ─────────────────────────────────────────────────── */}
      {eventId && (
        <div className="flex-shrink-0 flex border-b" style={{ borderColor: "rgba(255,255,255,0.08)", background: "#110F0D" }}>
          {(["qr", "manual"] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-semibold transition-colors"
              style={{
                color:        mode === m ? "var(--color-gold)" : "rgba(255,255,255,0.35)",
                borderBottom: mode === m ? "2px solid var(--color-gold)" : "2px solid transparent",
                background:   "transparent",
              }}
            >
              {m === "qr" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3"/>
                    <rect x="18" y="18" width="3" height="3"/>
                  </svg>
                  QR Scanner
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  Manual
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Manual mode ───────────────────────────────────────────────── */}
      {mode === "manual" && eventId && (
        <div className="flex-1 min-h-0 overflow-hidden">
          {lastResult ? (
            <div className="flex items-center justify-center p-6 h-full">
              <ResultCard result={lastResult} onDismiss={dismiss} />
            </div>
          ) : (
            <ManualPanel eventId={eventId} onResult={r => setLastResult(r)} />
          )}
        </div>
      )}

      {/* ── No event selected (manual tab hidden) ─────────────────────── */}
      {!eventId && (
        <div className="flex-1 flex items-center justify-center px-8 text-center">
          <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.3)" }}>Select an event above to begin</p>
        </div>
      )}

      {/* ── QR mode ───────────────────────────────────────────────────── */}
      {mode === "qr" && eventId && (
        <>
          <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col items-center justify-center">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline
              style={{ display: permState === "granted" ? "block" : "none" }} />
            <canvas ref={canvasRef} className="hidden" />

            {permState === "granted" && (
              <div className="absolute inset-0 pointer-events-none" style={{
                background: "radial-gradient(ellipse 55% 55% at 50% 50%, transparent 0%, rgba(0,0,0,0.65) 100%)",
              }} />
            )}

            {permState === "idle" && (
              <div className="relative z-10 flex flex-col items-center gap-5 px-8 text-center">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{ background: "rgba(168,133,74,0.12)", border: "1px solid rgba(168,133,74,0.25)" }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7V5a1 1 0 011-1h2M17 4h2a1 1 0 011 1v2M20 17v2a1 1 0 01-1 1h-2M7 20H5a1 1 0 01-1-1v-2"/>
                    <rect x="8" y="8" width="8" height="8" rx="1"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-[18px] font-bold mb-1" style={{ color: "#F3E9D2" }}>QR Check-in Scanner</h2>
                  <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Ready to scan for <strong style={{ color: "rgba(255,255,255,0.7)" }}>{selectedEvent?.name}</strong>
                  </p>
                </div>
                <button onClick={startCamera}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold"
                  style={{ background: "var(--color-gold)", color: "#1A1411" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                  </svg>
                  Start camera
                </button>
              </div>
            )}

            {permState === "requesting" && (
              <div className="relative z-10 flex flex-col items-center gap-4 px-8 text-center">
                <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
                <p className="text-[14px] font-semibold" style={{ color: "#F3E9D2" }}>Requesting camera access…</p>
              </div>
            )}

            {permState === "denied" && (
              <div className="relative z-10 flex flex-col items-center gap-4 px-8 text-center max-w-[320px]">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,142,142,0.1)", border: "1px solid rgba(255,142,142,0.25)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF8E8E" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] font-bold mb-1" style={{ color: "#FF8E8E" }}>Camera access denied</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Allow camera access in browser settings, then try again.
                  </p>
                </div>
                <button onClick={startCamera} className="px-5 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#F3E9D2" }}>
                  Try again
                </button>
              </div>
            )}

            {permState === "unavailable" && (
              <div className="relative z-10 flex flex-col items-center gap-4 px-8 text-center max-w-[320px]">
                <p className="text-[15px] font-bold" style={{ color: "#FF8E8E" }}>No camera found</p>
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                  This device doesn&apos;t have a camera or the browser doesn&apos;t support it.
                  <br />Use the <button onClick={() => setMode("manual")} style={{ color: "var(--color-gold)", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>Manual tab</button> instead.
                </p>
              </div>
            )}

            {permState === "granted" && !processing && !lastResult && (
              <div className="relative z-10 flex flex-col items-center gap-4 pointer-events-none select-none">
                <div className="relative w-56 h-56 sm:w-64 sm:h-64">
                  {["top-0 left-0 border-t-2 border-l-2 rounded-tl-lg","top-0 right-0 border-t-2 border-r-2 rounded-tr-lg","bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg","bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg"].map(cls => (
                    <div key={cls} className={`absolute w-8 h-8 ${cls}`} style={{ borderColor: "var(--color-gold)" }} />
                  ))}
                  <div className="absolute inset-x-2 h-0.5 rounded-full" style={{
                    background: "linear-gradient(90deg, transparent, var(--color-gold), transparent)",
                    animation:  "scanline 1.8s ease-in-out infinite",
                    top:        "50%",
                  }} />
                </div>
                <p className="text-[12px] font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Point camera at volunteer QR code
                </p>
              </div>
            )}

            {processing && (
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
                <p className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Processing…</p>
              </div>
            )}

            {lastResult && (
              <div className="absolute inset-0 z-20 flex items-end justify-center p-4">
                <div className="absolute inset-0" onClick={dismiss} style={{ background: "rgba(0,0,0,0.5)" }} />
                <div className="relative w-full max-w-sm">
                  <ResultCard result={lastResult} onDismiss={dismiss} />
                </div>
              </div>
            )}
          </div>

          {permState === "granted" && (
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-t"
              style={{ borderColor: "rgba(255,255,255,0.06)", background: "#110F0D" }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#7DE882" }} />
                <span className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {processing ? "Processing…" : "Live · ready to scan"}
                </span>
              </div>
              <button onClick={stopCamera}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                style={{ background: "rgba(255,142,142,0.1)", color: "#FF8E8E", border: "1px solid rgba(255,142,142,0.15)" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                </svg>
                Stop
              </button>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes scanline {
          0%   { top: 10%; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
