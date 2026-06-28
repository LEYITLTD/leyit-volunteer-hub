"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AppItem = {
  id:                string;
  event_id:          string;
  name:              string;
  city:              string | null;
  event_start:       string;
  event_end:         string;
  status:            string;
  waitlist_position: number | null;
  role_name:         string;
  role_description:  string | null;
};

const UK = "Europe/London";
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: UK });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: UK });
}
function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  confirmed:  { label: "Confirmed",  bg: "#1A2E1A", fg: "#7DE882" },
  waitlisted: { label: "Waitlisted", bg: "#FEF9C3", fg: "#92400E" },
  applied:    { label: "Pending",    bg: "#DBEAFE", fg: "#1D4ED8" },
  no_show:    { label: "No show",    bg: "#F3F4F6", fg: "#6B7280" },
};

export default function MyEventsPage() {
  const [items, setItems]     = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState<string | null>(null);
  const [toast, setToast]     = useState<string | null>(null);

  function load() {
    fetch("/api/volunteer/applications")
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function act(kind: "cancel" | "claim", ev: AppItem) {
    if (kind === "cancel" && !window.confirm(`Cancel your place at ${ev.name}?`)) return;
    setBusy(ev.id + kind);
    try {
      const res  = await fetch(`/api/volunteer/events/${ev.event_id}/${kind}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setToast(kind === "cancel" ? `Your place at ${ev.name} was cancelled.` : `You're confirmed for ${ev.name}!`);
      load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
      setTimeout(() => setToast(null), 4000);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const now      = Date.now();
  const upcoming = items.filter(i => new Date(i.event_end).getTime() >= now);
  const archived = items.filter(i => new Date(i.event_end).getTime() <  now)
                        .sort((a, b) => b.event_start.localeCompare(a.event_start));

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
      <div className="mb-6">
        <h1 className="font-display text-[24px] sm:text-[28px] font-semibold" style={{ color: "var(--color-text-primary)" }}>My Events</h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          {items.length > 0 ? `${upcoming.length} upcoming · ${archived.length} archived` : "Events you've signed up for"}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border p-12 flex flex-col items-center gap-4 text-center" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--color-gold-subtle)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-[16px] mb-1" style={{ color: "var(--color-text-primary)" }}>You haven&apos;t signed up for any events yet</h2>
            <p className="text-[13px] mb-4" style={{ color: "var(--color-text-secondary)" }}>Browse what&apos;s on and sign up — your events will appear here.</p>
            <Link href="/volunteer/events" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: "var(--color-gold)", color: "#1A1411" }}>
              Browse events
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {upcoming.length > 0 && (
            <Section title="Upcoming">
              {upcoming.map(ev => <EventRow key={ev.id} ev={ev} archived={false} busy={busy} onAct={act} />)}
            </Section>
          )}
          {archived.length > 0 && (
            <Section title="Archived">
              {archived.map(ev => <EventRow key={ev.id} ev={ev} archived busy={busy} onAct={act} />)}
            </Section>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-[13px] font-medium animate-toast-in" style={{ background: "#1A1714", color: "#fff", boxShadow: "var(--shadow-toast)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: "var(--color-text-muted)" }}>{title}</p>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function EventRow({ ev, archived, busy, onAct }: { ev: AppItem; archived: boolean; busy: string | null; onAct: (k: "cancel" | "claim", e: AppItem) => void }) {
  const st = STATUS[ev.status] ?? STATUS.applied;
  const days = daysUntil(ev.event_start);
  const dayNum = new Date(ev.event_start).toLocaleDateString("en-GB", { day: "numeric", timeZone: UK });
  const mon    = new Date(ev.event_start).toLocaleDateString("en-GB", { month: "short", timeZone: UK });

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)", opacity: archived ? 0.92 : 1 }}>
      <div className="p-4 sm:p-5 flex gap-4">
        {/* Date block */}
        <div className="flex-shrink-0 w-[58px] h-[58px] rounded-xl flex flex-col items-center justify-center"
          style={{ background: archived ? "var(--color-bg)" : "var(--color-gold-subtle)", border: `1px solid ${archived ? "var(--color-card-border)" : "var(--color-gold)"}` }}>
          <span className="text-[20px] font-bold leading-none tabular-nums" style={{ color: archived ? "var(--color-text-muted)" : "var(--color-gold)" }}>{dayNum}</span>
          <span className="text-[10px] font-semibold uppercase" style={{ color: archived ? "var(--color-text-muted)" : "var(--color-gold)" }}>{mon}</span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-[16px] font-semibold leading-snug" style={{ color: "var(--color-text-primary)" }}>{ev.name}</h2>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.fg }}>
              {st.label}{ev.status === "waitlisted" && ev.waitlist_position ? ` · #${ev.waitlist_position}` : ""}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {ev.city && <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>{ev.city}</span>}
            <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>{fmtDate(ev.event_start)}</span>
            <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>{fmtTime(ev.event_start)} – {fmtTime(ev.event_end)}</span>
          </div>

          {/* Role + description */}
          <div className="mt-2 rounded-lg px-3 py-2" style={{ background: "var(--color-bg)" }}>
            <p className="text-[12.5px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Role: {ev.role_name}</p>
            {ev.role_description && <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{ev.role_description}</p>}
          </div>

          {/* Actions */}
          {!archived && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {!days && days !== 0 ? null : (
                <span className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full" style={{ background: days <= 3 ? "var(--color-gold-subtle)" : "var(--color-bg)", color: days <= 3 ? "var(--color-gold)" : "var(--color-text-muted)" }}>
                  {days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`}
                </span>
              )}
              {ev.status === "confirmed" && (
                <Link href="/volunteer/qr-code" className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1 rounded-full" style={{ background: "#2C2825", color: "#fff" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                  My QR
                </Link>
              )}
              {ev.status === "waitlisted" && (
                <button onClick={() => onAct("claim", ev)} disabled={busy === ev.id + "claim"} className="text-[12px] font-semibold px-3 py-1 rounded-full" style={{ background: "var(--color-gold)", color: "#1A1411" }}>
                  {busy === ev.id + "claim" ? "…" : "Claim spot"}
                </button>
              )}
              <button onClick={() => onAct("cancel", ev)} disabled={busy === ev.id + "cancel"} className="text-[12px] font-medium px-3 py-1 rounded-full" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>
                {busy === ev.id + "cancel" ? "…" : "Cancel"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
