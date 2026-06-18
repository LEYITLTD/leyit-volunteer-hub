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
type PermState = "idle" | "requesting" | "granted" | "denied" | "unavailable";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" });
}

/* ─── Scanner page ───────────────────────────────────────────────────────── */

export default function CheckInScannerPage() {
  const [events,      setEvents]      = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventId,     setEventId]     = useState<string>("");
  const [permState,   setPermState]   = useState<PermState>("idle");
  const [scanning,    setScanning]    = useState(false);
  const [lastResult,  setLastResult]  = useState<ScanResult | null>(null);
  const [processing,  setProcessing]  = useState(false);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const rafRef      = useRef<number>(0);
  const coolRef     = useRef(false);  // debounce between scans
  const processingRef = useRef(false);

  // Sync processing to ref for scan loop
  useEffect(() => { processingRef.current = processing; }, [processing]);

  // Load events
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

  // Start camera
  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermState("unavailable");
      return;
    }
    setPermState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width:      { ideal: 1280 },
          height:     { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPermState("granted");
      setScanning(true);
    } catch (e) {
      const err = e as DOMException;
      setPermState(
        err.name === "NotFoundError" || err.name === "DevicesNotFoundError"
          ? "unavailable"
          : "denied"
      );
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // QR scan loop using jsQR dynamically (client-only)
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
          if (code && !coolRef.current && !processingRef.current) {
            handleQR(code.data);
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    runLoop();
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning, eventId]);

  async function handleQR(data: string) {
    if (!eventId) return;
    // Extract UUID from check-in URL: /checkin/<uuid>
    const match = data.match(/\/checkin\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (!match) return;

    coolRef.current     = true;
    processingRef.current = true;
    setProcessing(true);
    setLastResult(null);
    navigator.vibrate?.(80);

    try {
      const res    = await fetch("/api/admin/checkin", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ volunteer_id: match[1], event_id: eventId }),
      });
      const result = await res.json() as ScanResult;
      setLastResult(result);
    } catch {
      setLastResult({ error: "Network error — try again." });
    } finally {
      setProcessing(false);
      processingRef.current = false;
      // 3 second cooldown before next scan
      setTimeout(() => { coolRef.current = false; }, 3000);
    }
  }

  function dismiss() {
    setLastResult(null);
    coolRef.current = false;
  }

  const selectedEvent = events.find(e => e.id === eventId);

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden" style={{ background: "#0A0907" }}>

      {/* ── Top strip: event selector ────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)", background: "#1A1714" }}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--color-text-muted)" }}>
          Scanning for event
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
              background:   "rgba(255,255,255,0.07)",
              border:       "1px solid rgba(255,255,255,0.12)",
              color:        eventId ? "var(--color-gold)" : "rgba(255,255,255,0.4)",
              appearance:   "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat:   "no-repeat",
              backgroundPosition: "right 10px center",
              paddingRight:       "32px",
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

      {/* ── Camera area ──────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col items-center justify-center">

        {/* Live camera feed (hidden until granted) */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          style={{ display: permState === "granted" ? "block" : "none" }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Dark vignette overlay while scanning */}
        {permState === "granted" && (
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 55% 55% at 50% 50%, transparent 0%, rgba(0,0,0,0.65) 100%)",
          }} />
        )}

        {/* ── State: idle / select event ─────────────────────────── */}
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
                {!eventId
                  ? "Select an event above, then start the camera"
                  : `Ready to scan for ${selectedEvent?.name}`}
              </p>
            </div>
            {eventId && (
              <button
                onClick={startCamera}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold"
                style={{ background: "var(--color-gold)", color: "#1A1411" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
                Start camera
              </button>
            )}
          </div>
        )}

        {/* ── State: requesting permission ───────────────────────── */}
        {permState === "requesting" && (
          <div className="relative z-10 flex flex-col items-center gap-4 px-8 text-center">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
            <p className="text-[14px] font-semibold" style={{ color: "#F3E9D2" }}>Requesting camera access…</p>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>Please allow camera access when prompted</p>
          </div>
        )}

        {/* ── State: denied ──────────────────────────────────────── */}
        {permState === "denied" && (
          <div className="relative z-10 flex flex-col items-center gap-4 px-8 text-center max-w-[320px]">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,142,142,0.1)", border: "1px solid rgba(255,142,142,0.25)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF8E8E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-bold mb-1" style={{ color: "#FF8E8E" }}>Camera access denied</p>
              <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                Open your browser settings and allow camera access for this site, then try again.
              </p>
            </div>
            <button onClick={startCamera}
              className="px-5 py-2.5 rounded-xl text-[13px] font-semibold"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#F3E9D2" }}>
              Try again
            </button>
          </div>
        )}

        {/* ── State: unavailable ─────────────────────────────────── */}
        {permState === "unavailable" && (
          <div className="relative z-10 flex flex-col items-center gap-4 px-8 text-center max-w-[320px]">
            <p className="text-[15px] font-bold" style={{ color: "#FF8E8E" }}>No camera found</p>
            <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              This device doesn&apos;t have a camera or the browser doesn&apos;t support it.
            </p>
          </div>
        )}

        {/* ── Scanning: QR frame overlay ─────────────────────────── */}
        {permState === "granted" && !processing && !lastResult && (
          <div className="relative z-10 flex flex-col items-center gap-4 pointer-events-none select-none">
            {/* Animated scan frame */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64">
              {/* Corners */}
              {[
                "top-0 left-0 border-t-2 border-l-2 rounded-tl-lg",
                "top-0 right-0 border-t-2 border-r-2 rounded-tr-lg",
                "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg",
                "bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg",
              ].map(cls => (
                <div key={cls} className={`absolute w-8 h-8 ${cls}`} style={{ borderColor: "var(--color-gold)" }} />
              ))}
              {/* Scan line */}
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

        {/* ── Processing spinner ─────────────────────────────────── */}
        {processing && (
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
            <p className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Processing…</p>
          </div>
        )}

        {/* ── Scan result overlay ────────────────────────────────── */}
        {lastResult && (
          <div className="absolute inset-0 z-20 flex items-end justify-center p-4">
            {/* Backdrop tap-to-dismiss */}
            <div className="absolute inset-0" onClick={dismiss} style={{ background: "rgba(0,0,0,0.5)" }} />

            {/* Result card */}
            <div
              className="relative w-full max-w-sm rounded-2xl overflow-hidden"
              style={{
                background:   "#1A1714",
                border:       `1px solid ${lastResult.error ? "rgba(255,142,142,0.3)" : lastResult.already_complete ? "rgba(255,255,255,0.1)" : lastResult.scan_type === "check_in" ? "rgba(125,232,130,0.3)" : "rgba(136,204,255,0.3)"}`,
                boxShadow:    "0 -4px 40px rgba(0,0,0,0.6)",
              }}
            >
              {/* Colour top accent */}
              <div className="h-1" style={{
                background: lastResult.error
                  ? "#FF8E8E"
                  : lastResult.already_complete
                  ? "rgba(255,255,255,0.15)"
                  : lastResult.scan_type === "check_in"
                  ? "#7DE882"
                  : "#88CCFF",
              }} />

              <div className="p-5">
                {/* Error state */}
                {lastResult.error && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(255,142,142,0.12)" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF8E8E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[15px] mb-0.5" style={{ color: "#FF8E8E" }}>Scan failed</p>
                      <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>{lastResult.error}</p>
                    </div>
                  </div>
                )}

                {/* Already complete */}
                {lastResult.already_complete && lastResult.volunteer && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[14px]"
                      style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                      {initials(lastResult.volunteer.first_name, lastResult.volunteer.last_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[15px]" style={{ color: "#F3E9D2" }}>
                        {lastResult.volunteer.first_name} {lastResult.volunteer.last_name}
                      </p>
                      <p className="text-[13px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                        Already checked in &amp; out
                      </p>
                    </div>
                  </div>
                )}

                {/* Successful scan */}
                {lastResult.success && lastResult.volunteer && (
                  <div>
                    <div className="flex items-start gap-3 mb-4">
                      {/* Avatar circle */}
                      <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[15px]"
                        style={{
                          background: lastResult.scan_type === "check_in" ? "rgba(125,232,130,0.15)" : "rgba(136,204,255,0.15)",
                          color:      lastResult.scan_type === "check_in" ? "#7DE882" : "#88CCFF",
                        }}>
                        {initials(lastResult.volunteer.first_name, lastResult.volunteer.last_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[16px] leading-tight" style={{ color: "#F3E9D2" }}>
                          {lastResult.volunteer.first_name} {lastResult.volunteer.last_name}
                        </p>
                        <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {lastResult.volunteer.email}
                        </p>
                      </div>
                      {/* Check/arrow icon */}
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ background: lastResult.scan_type === "check_in" ? "#1A2E1A" : "#1A263A" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke={lastResult.scan_type === "check_in" ? "#7DE882" : "#88CCFF"}
                          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          {lastResult.scan_type === "check_in"
                            ? <polyline points="20 6 9 17 4 12"/>
                            : <polyline points="4 6 9 17 20 12"/>
                          }
                        </svg>
                      </div>
                    </div>

                    {/* Status pill */}
                    <span className="text-[12px] font-bold px-3 py-1.5 rounded-full"
                      style={{
                        background: lastResult.scan_type === "check_in" ? "#1A2E1A" : "#1A263A",
                        color:      lastResult.scan_type === "check_in" ? "#7DE882" : "#88CCFF",
                      }}>
                      {lastResult.scan_type === "check_in" ? "✓ Checked in" : "→ Checked out"}
                    </span>
                  </div>
                )}

                {/* Dismiss hint */}
                <p className="text-[11px] text-center mt-4" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Tap anywhere to scan next
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom bar: status + stop ─────────────────────────────────── */}
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
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
            </svg>
            Stop
          </button>
        </div>
      )}

      {/* Scanline animation */}
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
