"use client";

import { useEffect, useState } from "react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Role = {
  id: string;
  role_name: string;
  capacity: number;
  gender_restriction: string;
  appliedCount: number;
};

type MyApplication = {
  id: string;
  role_id: string;
  status: string;
};

type Event = {
  id: string;
  name: string;
  city: string | null;
  event_start: string;
  event_end: string;
  status: string;
  eligibleRoles: Role[];
  myApplication: MyApplication | null;
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const APP_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  applied:    { label: "Applied",    bg: "#3A2E1A", color: "#C4973A" },
  confirmed:  { label: "Confirmed",  bg: "#1A2E1A", color: "#4CAF50" },
  waitlisted: { label: "Waitlisted", bg: "#1A263A", color: "#5BA4CF" },
  declined:   { label: "Declined",   bg: "#2E1A1A", color: "#E57373" },
  cancelled:  { label: "Cancelled",  bg: "#2C2825", color: "#9E9690" },
};

const GENDER_LABEL: Record<string, string> = {
  any: "Open", male: "Brothers", female: "Sisters",
};

/* ─── Role row ───────────────────────────────────────────────────────────── */

function RoleRow({ role }: { role: Role }) {
  const spotsLeft = Math.max(0, role.capacity - role.appliedCount);
  const pct       = role.capacity > 0 ? Math.min((role.appliedCount / role.capacity) * 100, 100) : 0;
  const full      = spotsLeft === 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
            {role.role_name}
          </span>
          {role.gender_restriction !== "any" && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
              style={{
                background: role.gender_restriction === "male" ? "#1A263A" : "#2D1A2E",
                color:      role.gender_restriction === "male" ? "#5BA4CF" : "#CF5BA4",
              }}
            >
              {GENDER_LABEL[role.gender_restriction]}
            </span>
          )}
        </div>
        <span
          className="text-[12px] font-semibold tabular-nums shrink-0"
          style={{ color: full ? "#E57373" : "var(--color-text-secondary)" }}
        >
          {full ? "Full" : `${spotsLeft} left`}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#2C2825" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: full ? "#E57373" : "var(--color-gold)" }}
        />
      </div>
    </div>
  );
}

/* ─── Event card ─────────────────────────────────────────────────────────── */

function EventCard({
  event,
  onApply,
}: {
  event: Event;
  onApply: (event: Event) => void;
}) {
  const app       = event.myApplication;
  const appBadge  = app ? (APP_STATUS[app.status] ?? APP_STATUS.applied) : null;
  const hasRoles  = event.eligibleRoles.length > 0;
  const allFull   = hasRoles && event.eligibleRoles.every((r) => r.appliedCount >= r.capacity);

  const canApply  = !app && hasRoles && !allFull;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}
    >
      {/* Header */}
      <div
        className="px-4 sm:px-5 pt-4 pb-3 border-b"
        style={{ borderColor: "var(--color-card-border)" }}
      >
        <h3
          className="font-semibold text-[16px] leading-snug mb-1.5"
          style={{ color: "var(--color-text-primary)" }}
        >
          {event.name}
        </h3>
        <div
          className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px]"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {event.city && (
            <span className="flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              {event.city}
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {fmtDate(event.event_start)}
          </span>
          <span>{fmtTime(event.event_start)} – {fmtTime(event.event_end)}</span>
        </div>
      </div>

      {/* Roles */}
      <div className="px-4 sm:px-5 py-4">
        {!hasRoles ? (
          <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>
            No roles available for you on this event.
          </p>
        ) : (
          <div className="space-y-3.5">
            {event.eligibleRoles.map((role) => (
              <RoleRow key={role.id} role={role} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-4 sm:px-5 py-3 border-t flex items-center justify-between gap-3"
        style={{ borderColor: "var(--color-card-border)" }}
      >
        {app && appBadge ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: appBadge.bg, color: appBadge.color }}
              >
                {appBadge.label}
              </span>
              <span className="text-[12px] truncate" style={{ color: "var(--color-text-muted)" }}>
                {event.eligibleRoles.find((r) => r.id === app.role_id)?.role_name ?? ""}
              </span>
            </div>
            {(app.status === "applied" || app.status === "waitlisted") && (
              <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                We'll be in touch
              </span>
            )}
          </>
        ) : canApply ? (
          <>
            <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
              {event.eligibleRoles.length} role{event.eligibleRoles.length !== 1 ? "s" : ""} available
            </span>
            <button
              onClick={() => onApply(event)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold shrink-0"
              style={{ background: "var(--color-gold)", color: "#1A1411" }}
            >
              Apply
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </>
        ) : allFull ? (
          <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
            All roles are currently full
          </span>
        ) : (
          <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
            No roles available
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Apply modal ────────────────────────────────────────────────────────── */

function ApplyModal({
  event,
  onClose,
  onDone,
}: {
  event: Event;
  onClose: () => void;
  onDone: (waitlisted: boolean) => void;
}) {
  const availableRoles = event.eligibleRoles.filter((r) => r.appliedCount < r.capacity);
  const [selectedRole, setSelectedRole] = useState<string>(
    availableRoles.length === 1 ? availableRoles[0].id : "",
  );
  const [applying, setApplying]   = useState(false);
  const [err, setErr]             = useState<string | null>(null);

  async function apply() {
    if (!selectedRole) { setErr("Please select a role."); return; }
    setApplying(true);
    setErr(null);
    try {
      const res = await fetch(`/api/volunteer/events/${event.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const roleName = availableRoles.find((r) => r.id === selectedRole)?.role_name ?? "";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-stretch justify-end sm:items-center sm:justify-center sm:p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "var(--color-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="px-5 py-4 flex items-start justify-between border-b"
          style={{ borderColor: "var(--color-card-border)", background: "var(--color-card-header-bg)" }}
        >
          <div>
            <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Apply for event
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {event.name}
            </p>
          </div>
          <button onClick={onClose} className="text-[22px] leading-none mt-0.5" style={{ color: "var(--color-text-muted)" }}>×</button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Date/city summary */}
          <div
            className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] px-3 py-2.5 rounded-xl"
            style={{ background: "var(--color-card-header-bg)", color: "var(--color-text-secondary)" }}
          >
            {event.city && <span>📍 {event.city}</span>}
            <span>🗓 {fmtDate(event.event_start)}</span>
            <span>⏰ {fmtTime(event.event_start)} – {fmtTime(event.event_end)}</span>
          </div>

          {/* Role picker */}
          {availableRoles.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>
              All roles are currently full.
            </p>
          ) : availableRoles.length === 1 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Role
              </p>
              <div
                className="flex items-center justify-between px-3 py-3 rounded-xl border"
                style={{ borderColor: "var(--color-gold)", background: "var(--color-gold-subtle)" }}
              >
                <span className="text-[14px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {availableRoles[0].role_name}
                </span>
                <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                  {Math.max(0, availableRoles[0].capacity - availableRoles[0].appliedCount)} spots left
                </span>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Choose a role
              </p>
              <div className="flex flex-col gap-2">
                {availableRoles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    className="flex items-center justify-between px-3 py-3 rounded-xl border text-left transition-colors"
                    style={{
                      borderColor: selectedRole === role.id ? "var(--color-gold)" : "var(--color-card-border)",
                      background:  selectedRole === role.id ? "var(--color-gold-subtle)" : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: selectedRole === role.id ? "var(--color-gold)" : "var(--color-input-border)" }}
                      >
                        {selectedRole === role.id && (
                          <span className="w-2 h-2 rounded-full" style={{ background: "var(--color-gold)" }} />
                        )}
                      </span>
                      <span className="text-[14px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {role.role_name}
                      </span>
                    </div>
                    <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                      {Math.max(0, role.capacity - role.appliedCount)} left
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {err && (
            <p className="text-[13px] px-3 py-2.5 rounded-xl" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>
              {err}
            </p>
          )}

          {availableRoles.length > 0 && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-[13px] border"
                style={{ borderColor: "var(--color-card-border)", color: "var(--color-text-secondary)" }}
              >
                Cancel
              </button>
              <button
                onClick={apply}
                disabled={applying || !selectedRole}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-opacity"
                style={{
                  background: "var(--color-gold)",
                  color:      "#1A1411",
                  opacity:    applying || !selectedRole ? 0.6 : 1,
                }}
              >
                {applying ? "Applying…" : roleName ? `Apply — ${roleName}` : "Apply"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Success toast ──────────────────────────────────────────────────────── */

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-[13px] font-medium max-w-[90vw] text-center"
      style={{ background: "#1A2E1A", color: "#4CAF50", border: "1px solid #2A4E2A" }}
    >
      {message}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function BrowseEventsPage() {
  const [events,   setEvents]   = useState<Event[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [applyFor, setApplyFor] = useState<Event | null>(null);
  const [toast,    setToast]    = useState<string | null>(null);

  function load() {
    fetch("/api/volunteer/events")
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function handleApplied(event: Event, waitlisted: boolean) {
    setApplyFor(null);
    setToast(
      waitlisted
        ? `You've been added to the waitlist for ${event.name}.`
        : `Application sent for ${event.name}! We'll confirm soon.`,
    );
    load();
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[720px]">
      <div className="mb-6">
        <h1 className="font-display text-[24px] sm:text-[28px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Events
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          {events.length > 0
            ? `${events.length} open event${events.length !== 1 ? "s" : ""} you can apply for`
            : "No events open right now"}
        </p>
      </div>

      {events.length === 0 ? (
        <div
          className="rounded-2xl border p-12 flex flex-col items-center gap-4 text-center"
          style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--color-gold-subtle)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-[16px] mb-1" style={{ color: "var(--color-text-primary)" }}>
              No events open yet
            </h2>
            <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
              Check back soon — new events will appear here when they&apos;re published.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onApply={setApplyFor}
            />
          ))}
        </div>
      )}

      {applyFor && (
        <ApplyModal
          event={applyFor}
          onClose={() => setApplyFor(null)}
          onDone={(waitlisted) => handleApplied(applyFor, waitlisted)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
