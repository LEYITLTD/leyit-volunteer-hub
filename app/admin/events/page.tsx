"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Role = { id: string; role_name: string; capacity: number; gender_restriction: string };
type Application = { id: string; role_id: string; status: string };
type Event = {
  id: string;
  name: string;
  city: string | null;
  event_start: string;
  event_end: string;
  status: string;
  event_roles: Role[];
  event_applications: Application[];
};

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: "Draft",     bg: "#2C2825", color: "#C5BFB8" },
  published: { label: "Published", bg: "#1A263A", color: "#88CCFF" },
  active:    { label: "Active",    bg: "#1A2E1A", color: "#7DE882" },
  completed: { label: "Completed", bg: "#2C2825", color: "#6B6259" },
  cancelled: { label: "Cancelled", bg: "#2E1A1A", color: "#FF8E8E" },
};

const GENDER: Record<string, { label: string; bg: string; color: string }> = {
  any:    { label: "Any",    bg: "#2C2825", color: "#C5BFB8" },
  male:   { label: "Male",   bg: "#1A263A", color: "#88CCFF" },
  female: { label: "Female", bg: "#2D1A2E", color: "#EE7DC8" },
};

const UK = "Europe/London";
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: UK });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: UK });
}

function GenderBar({ gender, capacity, applied }: { gender: string; capacity: number; applied: number }) {
  const pct  = capacity > 0 ? Math.min((applied / capacity) * 100, 100) : 0;
  const full = pct >= 100;
  const g    = GENDER[gender] ?? GENDER.any;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: g.bg, color: g.color }}>{g.label}</span>
          <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>{capacity} spots</span>
        </div>
        <span className="text-[11px] tabular-nums font-medium" style={{ color: full ? "#7DE882" : "var(--color-text-secondary)" }}>
          {applied}/{capacity}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#2C2825" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: full ? "#7DE882" : "var(--color-gold)" }}
        />
      </div>
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const s   = STATUS[event.status] ?? STATUS.draft;
  const totalCapacity = event.event_roles.reduce((n, r) => n + r.capacity, 0);
  const totalApplied  = event.event_applications.length;

  // Group roles by gender and sum capacities + applications
  const genderGroups = (["male", "female", "any"] as const)
    .map(g => {
      const rolesForGender = event.event_roles.filter(r => r.gender_restriction === g);
      if (rolesForGender.length === 0) return null;
      const roleIds  = new Set(rolesForGender.map(r => r.id));
      const capacity = rolesForGender.reduce((n, r) => n + r.capacity, 0);
      const applied  = event.event_applications.filter(a => roleIds.has(a.role_id)).length;
      return { gender: g, capacity, applied };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
      {/* Card header */}
      <div className="px-4 sm:px-5 pt-4 pb-3 border-b" style={{ borderColor: "var(--color-card-border)" }}>
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="font-semibold text-[15px] sm:text-[16px] leading-snug" style={{ color: "var(--color-text-primary)" }}>
            {event.name}
          </h3>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0" style={{ background: s.bg, color: s.color }}>
            {s.label}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
          {event.city && (
            <span className="flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {event.city}
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {fmtDate(event.event_start)}
          </span>
          <span>{fmtTime(event.event_start)} – {fmtTime(event.event_end)}</span>
        </div>
      </div>

      {/* Gender capacity bars */}
      <div className="px-4 sm:px-5 py-3 space-y-3">
        {genderGroups.length === 0 ? (
          <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>No roles added yet</p>
        ) : (
          genderGroups.map(g => (
            <GenderBar key={g.gender} gender={g.gender} capacity={g.capacity} applied={g.applied} />
          ))
        )}
      </div>

      {/* Card footer */}
      <div className="px-4 sm:px-5 py-3 border-t flex items-center justify-between gap-3" style={{ borderColor: "var(--color-card-border)" }}>
        <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          {totalApplied} confirmed · {totalCapacity} total spots
        </span>
        <Link
          href={`/admin/events/${event.id}`}
          className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: "var(--color-gold-subtle)", color: "var(--color-gold)" }}
        >
          View →
        </Link>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents]   = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/events")
      .then(r => r.json())
      .then(d => setEvents(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 mb-6 flex-col sm:flex-row">
        <div>
          <h1 className="font-display text-[24px] sm:text-[28px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Events
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {events.length} event{events.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold flex-shrink-0 self-start sm:self-auto"
          style={{ background: "var(--color-gold)", color: "#1A1411" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Event
        </Link>
      </div>

      {/* Empty state */}
      {events.length === 0 ? (
        <div className="rounded-xl border p-12 flex flex-col items-center gap-4 text-center" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--color-gold-subtle)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-[16px] mb-1" style={{ color: "var(--color-text-primary)" }}>No events yet</h2>
            <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>Create your first event to get started</p>
          </div>
          <Link
            href="/admin/events/new"
            className="px-5 py-2.5 rounded-lg text-[13px] font-semibold"
            style={{ background: "var(--color-gold)", color: "#1A1411" }}
          >
            Create Event
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map(event => <EventCard key={event.id} event={event} />)}
        </div>
      )}
    </div>
  );
}
