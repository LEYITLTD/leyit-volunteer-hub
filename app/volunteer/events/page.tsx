"use client";

import { useEffect, useState } from "react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Role = {
  id: string; role_name: string; capacity: number;
  gender_restriction: string; appliedCount: number;
};
type MyApplication = { id: string; role_id: string; status: string };
type Event = {
  id: string; name: string;
  city: string | null; venue_name: string | null; venue_address: string | null;
  description: string | null; thumbnail_url: string | null;
  event_start: string; event_end: string; doors_open: string | null;
  status: string;
  eligibleRoles: Role[]; myApplication: MyApplication | null;
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London",
  });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
}

const APP_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  confirmed:  { label: "✓ Confirmed",      bg: "#DCFCE7", fg: "#15803D" },
  applied:    { label: "Applied — pending", bg: "#DBEAFE", fg: "#1D4ED8" },
  waitlisted: { label: "Waitlisted",        bg: "#FEF9C3", fg: "#92400E" },
  declined:   { label: "Not going",         bg: "#F3F4F6", fg: "#4B5563" },
  cancelled:  { label: "Not going",         bg: "#F3F4F6", fg: "#4B5563" },
};
const EV_BADGE: Record<string, { label: string; fg: string }> = {
  active:    { label: "Active", fg: "#15803D" },
  published: { label: "Open",   fg: "#1D4ED8" },
  open:      { label: "Open",   fg: "#1D4ED8" },
};

/* ─── Shared: event image header (poster) ────────────────────────────────── */

function EventPoster({
  event, height = 200, showCloseBtn, onClose,
}: {
  event: Event; height?: number;
  showCloseBtn?: boolean; onClose?: () => void;
}) {
  const badge = EV_BADGE[event.status];

  return (
    <div style={{ position: "relative", height, overflow: "hidden", flexShrink: 0 }}>
      {event.thumbnail_url ? (
        <img
          src={event.thumbnail_url}
          alt={event.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        /* ── Beautiful no-image placeholder ── */
        <div style={{
          width: "100%", height: "100%", position: "relative", overflow: "hidden",
          background: "linear-gradient(145deg,#1C1510 0%,#2D1E10 55%,#3D2A16 100%)",
        }}>
          {/* Large faint initial */}
          <span style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontSize: height * 0.68, fontWeight: 700,
            color: "#C9A227", opacity: 0.09,
            lineHeight: 1, userSelect: "none",
            transform: "translateY(4%)",
          }}>
            {event.name[0]?.toUpperCase()}
          </span>
          {/* Warm gold glow top-right */}
          <div style={{
            position: "absolute", top: "-20%", right: "-10%",
            width: "60%", paddingTop: "60%", borderRadius: "50%",
            background: "radial-gradient(circle,rgba(201,162,39,0.18) 0%,transparent 70%)",
          }} />
        </div>
      )}

      {/* Gradient scrim — always on */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom,rgba(0,0,0,0.04) 0%,rgba(0,0,0,0.04) 22%,rgba(0,0,0,0.76) 100%)",
      }} />

      {/* Top-right: badge + optional close */}
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 7 }}>
        {badge && (
          <span style={{
            background: "rgba(255,255,255,0.92)", color: badge.fg,
            fontSize: 9, fontWeight: 800,
            padding: "4px 10px", borderRadius: 20,
            backdropFilter: "blur(8px)",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            {badge.label}
          </span>
        )}
        {showCloseBtn && onClose && (
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "rgba(0,0,0,0.45)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", backdropFilter: "blur(6px)",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Bottom: event name + date */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 18px 14px" }}>
        <h2 style={{
          fontFamily: "'Cormorant Garamond',Georgia,serif",
          fontSize: height >= 180 ? 22 : 18,
          fontWeight: 700, color: "#FFFFFF",
          margin: "0 0 3px", lineHeight: 1.15,
          textShadow: "0 1px 8px rgba(0,0,0,0.4)",
        }}>
          {event.name}
        </h2>
        <p style={{
          fontSize: 12, color: "rgba(255,255,255,0.78)",
          margin: 0, fontWeight: 500, letterSpacing: "0.01em",
        }}>
          {fmtDate(event.event_start)} · {fmtTime(event.event_start)}–{fmtTime(event.event_end)}
        </p>
      </div>
    </div>
  );
}

/* ─── Apply modal ────────────────────────────────────────────────────────── */

function ApplyModal({
  event, onClose, onDone,
}: { event: Event; onClose: () => void; onDone: (waitlisted: boolean) => void }) {
  const availableRoles = event.eligibleRoles.filter(r => r.appliedCount < r.capacity);
  const [selectedRole, setSelectedRole] = useState<string>(
    availableRoles.length === 1 ? availableRoles[0].id : "",
  );
  const [applying, setApplying] = useState(false);
  const [err, setErr]           = useState<string | null>(null);

  async function apply() {
    if (!selectedRole) { setErr("Please select a role."); return; }
    setApplying(true); setErr(null);
    try {
      const res  = await fetch(`/api/volunteer/events/${event.id}/apply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: selectedRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to apply");
      onDone(data.waitlisted ?? false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to apply");
      setApplying(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-stretch justify-end sm:items-center sm:justify-center sm:p-6"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: "var(--color-card)", maxHeight: "92dvh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Banner header */}
        <EventPoster event={event} height={160} showCloseBtn onClose={onClose} />

        {/* Meta row below banner */}
        {(event.venue_name || event.city || event.doors_open) && (
          <div className="px-5 pt-3 pb-0 flex flex-wrap gap-x-4 gap-y-0.5 shrink-0">
            {(event.venue_name || event.city) && (
              <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {event.venue_name
                  ? `${event.venue_name}${event.city ? `, ${event.city}` : ""}`
                  : event.city}
              </span>
            )}
            {event.doors_open && (
              <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Doors open {fmtTime(event.doors_open)}
              </span>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
          {event.description && (
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              {event.description}
            </p>
          )}

          {availableRoles.length === 0 ? (
            <p className="text-[14px] text-center py-4" style={{ color: "var(--color-text-muted)" }}>
              All roles are currently full.
            </p>
          ) : availableRoles.length === 1 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: "var(--color-text-muted)" }}>
                Your role
              </p>
              <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border"
                style={{ borderColor: "var(--color-gold)", background: "var(--color-gold-subtle)" }}>
                <span className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {availableRoles[0].role_name}
                </span>
                <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                  {Math.max(0, availableRoles[0].capacity - availableRoles[0].appliedCount)} spots left
                </span>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: "var(--color-text-muted)" }}>
                Choose a role
              </p>
              <div className="flex flex-col gap-2">
                {availableRoles.map(role => {
                  const selected = selectedRole === role.id;
                  return (
                    <button key={role.id} type="button" onClick={() => setSelectedRole(role.id)}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl border w-full text-left transition-colors"
                      style={{ borderColor: selected ? "var(--color-gold)" : "var(--color-card-border)", background: selected ? "var(--color-gold-subtle)" : "transparent" }}>
                      <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: selected ? "var(--color-gold)" : "var(--color-input-border)" }}>
                        {selected && <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-gold)" }} />}
                      </span>
                      <span className="flex-1 text-[14px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {role.role_name}
                      </span>
                      <span className="text-[12px] shrink-0" style={{ color: "var(--color-text-secondary)" }}>
                        {Math.max(0, role.capacity - role.appliedCount)} left
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {err && (
            <p className="text-[13px] text-center px-3 py-2.5 rounded-xl"
              style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>
              {err}
            </p>
          )}
        </div>

        {availableRoles.length > 0 && (
          <div className="px-5 py-4 border-t shrink-0 flex gap-3" style={{ borderColor: "var(--color-card-border)" }}>
            <button onClick={onClose}
              className="flex-1 flex items-center justify-center py-3 rounded-xl text-[14px] font-medium border"
              style={{ borderColor: "var(--color-card-border)", color: "var(--color-text-secondary)" }}>
              Cancel
            </button>
            <button onClick={apply} disabled={applying || !selectedRole}
              className="flex-1 flex items-center justify-center py-3 rounded-xl text-[14px] font-semibold transition-opacity"
              style={{ background: "var(--color-gold)", color: "#1A1411", opacity: applying || !selectedRole ? 0.55 : 1 }}>
              {applying ? "Submitting…" : "Confirm"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Cancel modal ───────────────────────────────────────────────────────── */

function CancelModal({ event, onClose, onDone }: { event: Event; onClose: () => void; onDone: () => void }) {
  const [cancelling, setCancelling] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function cancel() {
    setCancelling(true); setErr(null);
    try {
      const res = await fetch(`/api/volunteer/events/${event.id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to cancel");
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to cancel");
      setCancelling(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--color-card)" }} onClick={e => e.stopPropagation()}>
        <h2 className="text-[17px] font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>Cancel your place?</h2>
        <p className="text-[13px] mb-5 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          You&apos;re about to cancel your place at{" "}
          <strong style={{ color: "var(--color-text-primary)" }}>{event.name}</strong>. You may re-apply if spaces are still available.
        </p>
        {err && <p className="text-[12px] px-3 py-2.5 rounded-xl mb-4" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>{err}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-[14px] font-medium border"
            style={{ borderColor: "var(--color-card-border)", color: "var(--color-text-secondary)" }}>Keep place</button>
          <button onClick={cancel} disabled={cancelling} className="flex-1 py-3 rounded-xl text-[14px] font-semibold"
            style={{ background: "#FEE2E2", color: "#DC2626", opacity: cancelling ? 0.7 : 1 }}>
            {cancelling ? "Cancelling…" : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Claim modal ────────────────────────────────────────────────────────── */

function ClaimModal({ event, onClose, onDone }: { event: Event; onClose: () => void; onDone: () => void }) {
  const [claiming, setClaiming] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function claim() {
    setClaiming(true); setErr(null);
    try {
      const res = await fetch(`/api/volunteer/events/${event.id}/claim`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to claim spot");
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to claim spot");
      setClaiming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--color-card)" }} onClick={e => e.stopPropagation()}>
        <h2 className="text-[17px] font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>Claim your spot?</h2>
        <p className="text-[13px] mb-5 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          A spot has opened up at{" "}
          <strong style={{ color: "var(--color-text-primary)" }}>{event.name}</strong>. Confirm below to secure your place.
        </p>
        {err && <p className="text-[12px] px-3 py-2.5 rounded-xl mb-4" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>{err}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-[14px] font-medium border"
            style={{ borderColor: "var(--color-card-border)", color: "var(--color-text-secondary)" }}>Not now</button>
          <button onClick={claim} disabled={claiming} className="flex-1 py-3 rounded-xl text-[14px] font-semibold"
            style={{ background: "var(--color-gold)", color: "#1A1411", opacity: claiming ? 0.7 : 1 }}>
            {claiming ? "Claiming…" : "Claim spot"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-[13px] font-medium max-w-[90vw] text-center"
      style={{ background: "#1A2E1A", color: "#7DE882", border: "1px solid #2A4E2A" }}>
      {message}
    </div>
  );
}

/* ─── Event card ─────────────────────────────────────────────────────────── */

function EventCard({
  event, onApply, onCancel, onClaim,
}: { event: Event; onApply: (e: Event) => void; onCancel: (e: Event) => void; onClaim: (e: Event) => void }) {
  const app      = event.myApplication;
  const hasRoles = event.eligibleRoles.length > 0;
  const allFull  = hasRoles && event.eligibleRoles.every(r => r.appliedCount >= r.capacity);

  const isInactive = !app || app.status === "cancelled" || app.status === "declined";
  const canApply   = isInactive && hasRoles && !allFull;

  const totalCapacity = event.eligibleRoles.reduce((s, r) => s + r.capacity, 0);
  const totalApplied  = event.eligibleRoles.reduce((s, r) => s + r.appliedCount, 0);
  const pct           = totalCapacity > 0 ? Math.min((totalApplied / totalCapacity) * 100, 100) : 0;

  const appStyle     = app && !isInactive ? (APP_STATUS[app.status] ?? null) : null;
  const isConfirmed  = app?.status === "confirmed";
  const isWaitlisted = app?.status === "waitlisted";
  const isActive     = isConfirmed || isWaitlisted;

  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #EAE6DD",
      borderRadius: 18,
      overflow: "hidden",
      marginBottom: 16,
      boxShadow: "0 2px 16px rgba(0,0,0,0.055)",
    }}>
      {/* ── Poster image ── */}
      <EventPoster event={event} height={200} />

      {/* ── Card body ── */}
      <div style={{ padding: "14px 16px 16px" }}>

        {/* Venue + doors */}
        {(event.venue_name || event.city) && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#78716C", marginBottom: 2 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            {event.venue_name
              ? `${event.venue_name}${event.city ? `, ${event.city}` : ""}`
              : event.city}
          </div>
        )}
        {event.doors_open && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#A8A29E", marginBottom: 4 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Doors open {fmtTime(event.doors_open)}
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p style={{
            fontSize: 13, color: "#78716C", margin: "6px 0 10px", lineHeight: 1.55,
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {event.description}
          </p>
        )}

        {/* Role chips */}
        {event.eligibleRoles.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, marginTop: event.description ? 0 : 8 }}>
            {event.eligibleRoles.map(r => (
              <span key={r.id} style={{
                background: "#F3EFE6", color: "#7A6A4A",
                fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
                border: "1px solid #EAE0CC",
              }}>
                {r.role_name}
              </span>
            ))}
          </div>
        )}

        {/* Capacity bar */}
        {totalCapacity > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#A8A29E", marginBottom: 5 }}>
              <span>Capacity</span>
              <span><strong style={{ color: "#1C1917" }}>{totalApplied}</strong> / {totalCapacity} confirmed</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#F1EAD9", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#C9A227,#A8854A)", borderRadius: 3 }} />
            </div>
          </div>
        )}

        {/* Status / action */}
        {appStyle && isActive ? (
          <div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: appStyle.bg,
              borderRadius: isWaitlisted ? "11px 11px 0 0" : 11,
              padding: "11px 14px",
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: appStyle.fg }}>{appStyle.label}</span>
              <button onClick={() => onCancel(event)}
                style={{ fontSize: 12, fontWeight: 600, color: "#DC2626", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                Cancel
              </button>
            </div>
            {isWaitlisted && (
              <button onClick={() => onClaim(event)}
                style={{
                  width: "100%", background: "#1A1714", color: "#fff",
                  border: "none", borderRadius: "0 0 11px 11px",
                  padding: "11px 14px", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Claim spot
              </button>
            )}
          </div>
        ) : appStyle ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            background: appStyle.bg, color: appStyle.fg,
            borderRadius: 11, padding: 12, fontSize: 14, fontWeight: 600,
          }}>
            {appStyle.label}
          </div>
        ) : canApply ? (
          <button onClick={() => onApply(event)}
            style={{
              width: "100%", background: "#1A1714", color: "#fff",
              border: "none", borderRadius: 11, padding: "13px 16px",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
            Apply for a role
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        ) : (
          <div style={{ fontSize: 12, color: "#A8A29E", textAlign: "center", padding: "4px 0" }}>
            {allFull ? "All roles are currently full" : "No roles available for you"}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

type FilterKey = "all" | "applied" | "confirmed";

export default function BrowseEventsPage() {
  const [events,    setEvents]    = useState<Event[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<FilterKey>("all");
  const [applyFor,  setApplyFor]  = useState<Event | null>(null);
  const [cancelFor, setCancelFor] = useState<Event | null>(null);
  const [claimFor,  setClaimFor]  = useState<Event | null>(null);
  const [toast,     setToast]     = useState<string | null>(null);

  function load() {
    fetch("/api/volunteer/events")
      .then(r => r.json())
      .then(d => setEvents(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function handleApplied(event: Event, waitlisted: boolean) {
    setApplyFor(null);
    setToast(waitlisted ? `You've been added to the waitlist for ${event.name}.` : `You're confirmed for ${event.name}!`);
    load();
  }
  function handleCancelled(event: Event) {
    setCancelFor(null);
    setToast(`Your place at ${event.name} has been cancelled.`);
    load();
  }
  function handleClaimed(event: Event) {
    setClaimFor(null);
    setToast(`Your spot at ${event.name} is confirmed!`);
    load();
  }

  const filtered = events.filter(ev => {
    if (filter === "applied")   return ev.myApplication?.status === "applied" || ev.myApplication?.status === "waitlisted";
    if (filter === "confirmed") return ev.myApplication?.status === "confirmed";
    return true;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "#A8854A", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const CHIPS: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "applied", label: "Applied" },
    { key: "confirmed", label: "Confirmed" },
  ];

  return (
    <div style={{ flex: 1 }}>
      {/* Page header */}
      <div style={{ padding: "8px 22px 6px" }}>
        <h1 style={{
          fontFamily: "var(--font-cormorant,'Cormorant Garamond',serif)",
          fontSize: 28, fontWeight: 600, color: "#1C1917", margin: "0 0 4px",
        }}>
          Events
        </h1>
      </div>

      {/* Filter chips */}
      <div style={{
        display: "flex", gap: 8, overflowX: "auto",
        padding: "2px 22px 16px",
        WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"],
      }}>
        {CHIPS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{
              flexShrink: 0, borderRadius: 20, padding: "8px 16px",
              fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              border: "1px solid",
              background: filter === key ? "#1A1714" : "#fff",
              color:      filter === key ? "#fff"    : "#57534E",
              borderColor: filter === key ? "#1A1714" : "#E4DDD0",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div style={{ padding: "0 16px" }}>
        {filtered.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #EAE6DD", borderRadius: 18, padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1C1917", marginBottom: 6 }}>No events</div>
            <div style={{ fontSize: 13, color: "#78716C" }}>
              {filter === "all" ? "No events open right now — check back soon." : `No ${filter} events yet.`}
            </div>
          </div>
        ) : (
          filtered.map(event => (
            <EventCard key={event.id} event={event} onApply={setApplyFor} onCancel={setCancelFor} onClaim={setClaimFor} />
          ))
        )}
      </div>

      {applyFor  && <ApplyModal  event={applyFor}  onClose={() => setApplyFor(null)}  onDone={w => handleApplied(applyFor, w)} />}
      {cancelFor && <CancelModal event={cancelFor} onClose={() => setCancelFor(null)} onDone={() => handleCancelled(cancelFor)} />}
      {claimFor  && <ClaimModal  event={claimFor}  onClose={() => setClaimFor(null)}  onDone={() => handleClaimed(claimFor)} />}
      {toast     && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
