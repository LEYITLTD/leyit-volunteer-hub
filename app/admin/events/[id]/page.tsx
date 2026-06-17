"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Role = { id: string; role_name: string; capacity: number; gender_restriction: string };
type Volunteer = { id: string; first_name: string; last_name: string; email: string };
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

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: "Draft",     bg: "#2C2825", color: "#9E9690" },
  published: { label: "Published", bg: "#1A263A", color: "#5BA4CF" },
  active:    { label: "Active",    bg: "#1A2E1A", color: "#4CAF50" },
  completed: { label: "Completed", bg: "#2C2825", color: "#6B6259" },
  cancelled: { label: "Cancelled", bg: "#2E1A1A", color: "#E57373" },
};
const GENDER: Record<string, { label: string; bg: string; color: string }> = {
  any:    { label: "Any",    bg: "#2C2825", color: "#9E9690" },
  male:   { label: "Male",   bg: "#1A263A", color: "#5BA4CF" },
  female: { label: "Female", bg: "#2D1A2E", color: "#CF5BA4" },
};
const APP_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  confirmed:  { label: "Confirmed",  bg: "#1A2E1A", color: "#4CAF50" },
  waitlisted: { label: "Waitlisted", bg: "#1A263A", color: "#5BA4CF" },
  declined:   { label: "Declined",   bg: "#2E1A1A", color: "#E57373" },
  cancelled:  { label: "Cancelled",  bg: "#2C2825", color: "#9E9690" },
  no_show:    { label: "No show",    bg: "#2E1A1A", color: "#E57373" },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function fmtShort(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [event,     setEvent]     = useState<Event | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [publishing,setPublishing]= useState(false);

  useEffect(() => {
    fetch(`/api/admin/events/${id}`)
      .then(r => r.json())
      .then(setEvent)
      .finally(() => setLoading(false));
  }, [id]);

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
  const s = STATUS[event.status] ?? STATUS.draft;

  function roleApps(roleId: string) {
    return event!.event_applications.filter(a => a.role_id === roleId);
  }
  function roleName(roleId: string) {
    return event!.event_roles.find(r => r.id === roleId)?.role_name ?? "—";
  }

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
            <h1 className="font-display text-[22px] sm:text-[26px] font-semibold leading-tight" style={{ color: "var(--color-text-primary)" }}>
              {event.name}
            </h1>
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>
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
        {event.status === "draft" && (
          <button
            onClick={publish}
            disabled={publishing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold flex-shrink-0 self-start"
            style={{ background: "var(--color-gold)", color: "#1A1411", opacity: publishing ? 0.7 : 1 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            {publishing ? "Publishing…" : "Publish Event"}
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total spots",  value: totalCapacity.toString() },
          { label: "Confirmed",     value: totalApplied.toString() },
          { label: "Confirmed",    value: totalConfirmed.toString(), gold: true },
          { label: "Fill rate",    value: `${fillRate}%` },
        ].map(({ label, value, gold }) => (
          <div key={label} className="rounded-xl border p-4 text-center" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
            <p className="font-ui text-[22px] sm:text-[26px] font-bold tabular-nums" style={{ color: gold ? "var(--color-gold)" : "var(--color-text-primary)" }}>
              {value}
            </p>
            <p className="text-[10px] uppercase tracking-[0.06em] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Role breakdown */}
      <div className="rounded-xl border p-5 mb-5" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
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
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: g.bg, color: g.color }}>{g.label}</span>
                    </div>
                    <span className="text-[12px] font-semibold tabular-nums" style={{ color: full ? "#4CAF50" : "var(--color-text-secondary)" }}>
                      {applied}/{role.capacity}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: "#2C2825" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: full ? "#4CAF50" : "var(--color-gold)" }}
                    />
                  </div>
                  <div className="flex gap-4 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    <span style={{ color: confirmed > 0 ? "#4CAF50" : undefined }}>{confirmed} confirmed</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Applications */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-card-border)" }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text-muted)" }}>
            Applications ({event.event_applications.length})
          </h2>
        </div>

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
                    {["Volunteer", "Role", "Status", "Date"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {event.event_applications.map((app, i) => {
                    const badge = APP_STATUS[app.status] ?? APP_STATUS.confirmed;
                    return (
                      <tr key={app.id} style={{ borderBottom: i < event.event_applications.length - 1 ? "1px solid var(--color-card-border)" : undefined }}>
                        <td className="px-5 py-3">
                          <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>{app.volunteers.first_name} {app.volunteers.last_name}</p>
                          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{app.volunteers.email}</p>
                        </td>
                        <td className="px-5 py-3" style={{ color: "var(--color-text-secondary)" }}>{roleName(app.role_id)}</td>
                        <td className="px-5 py-3">
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                        </td>
                        <td className="px-5 py-3 tabular-nums" style={{ color: "var(--color-text-secondary)" }}>{fmtShort(app.applied_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y" style={{ borderColor: "var(--color-card-border)" }}>
              {event.event_applications.map(app => {
                const badge = APP_STATUS[app.status] ?? APP_STATUS.confirmed;
                return (
                  <div key={app.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[13px] truncate" style={{ color: "var(--color-text-primary)" }}>{app.volunteers.first_name} {app.volunteers.last_name}</p>
                      <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{roleName(app.role_id)} · {fmtShort(app.applied_at)}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
