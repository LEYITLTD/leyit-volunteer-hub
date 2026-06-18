"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const ROLE_OPTIONS = ["Welcome Team", "Registration Team", "Main Hall Team"];
const GENDER_OPTIONS = [
  { value: "any",    label: "Any" },
  { value: "male",   label: "Male only" },
  { value: "female", label: "Female only" },
];

type RoleRow = { id: number; role_name: string; gender_restriction: string; capacity: string };

let _nextId = 1;

export default function NewEventPage() {
  const router = useRouter();

  const [name,         setName]         = useState("");
  const [city,         setCity]         = useState("");
  const [venueName,    setVenueName]    = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [description,  setDescription]  = useState("");
  const [startDt,      setStartDt]      = useState("");
  const [endDt,        setEndDt]        = useState("");
  const [doorsOpen,    setDoorsOpen]    = useState("");
  const [roles,        setRoles]        = useState<RoleRow[]>([
    { id: _nextId++, role_name: "Welcome Team", gender_restriction: "any", capacity: "1" },
  ]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  function addRole() {
    setRoles(r => [...r, { id: _nextId++, role_name: "Welcome Team", gender_restriction: "any", capacity: "1" }]);
  }
  function removeRole(id: number) { setRoles(r => r.filter(row => row.id !== id)); }
  function updateRole(id: number, field: keyof RoleRow, value: string) {
    setRoles(r => r.map(row => row.id === id ? { ...row, [field]: value } : row));
  }

  async function submit() {
    if (!name.trim())   { setError("Event name is required."); return; }
    if (!city.trim())   { setError("City is required."); return; }
    if (!startDt)       { setError("Start date and time is required."); return; }
    if (!endDt)         { setError("End date and time is required."); return; }
    if (new Date(endDt) <= new Date(startDt)) { setError("End time must be after start time."); return; }
    if (doorsOpen && new Date(doorsOpen) >= new Date(startDt)) { setError("Doors open time must be before the event start."); return; }
    if (roles.length === 0) { setError("Add at least one role."); return; }
    for (const r of roles) {
      if (!r.capacity || parseInt(r.capacity) < 1) { setError(`Capacity for "${r.role_name}" must be at least 1.`); return; }
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:          name.trim(),
          city:          city.trim(),
          venue_name:    venueName.trim()    || null,
          venue_address: venueAddress.trim() || null,
          description:   description.trim()  || null,
          event_start:   new Date(startDt).toISOString(),
          event_end:     new Date(endDt).toISOString(),
          doors_open:    doorsOpen ? new Date(doorsOpen).toISOString() : null,
          roles: roles.map(r => ({
            role_name:          r.role_name,
            gender_restriction: r.gender_restriction,
            capacity:           parseInt(r.capacity),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create event");
      router.push(`/admin/events/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create event");
      setLoading(false);
    }
  }

  const selectClass = [
    "w-full min-h-[44px] border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] appearance-none",
    "focus:outline-none focus:ring-2",
  ].join(" ");
  const selectStyle = {
    borderColor: "var(--color-input-border)",
    background:  "var(--color-input-bg)",
    color:       "var(--color-text-primary)",
  };
  const labelClass = "text-[11px] font-semibold uppercase tracking-[0.06em]";
  const labelStyle = { color: "var(--color-text-secondary)" };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
      <Link href="/admin/events" className="inline-flex items-center gap-1.5 text-[13px] mb-6" style={{ color: "var(--color-text-secondary)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Events
      </Link>

      <h1 className="font-display text-[24px] sm:text-[28px] font-semibold mb-6" style={{ color: "var(--color-text-primary)" }}>
        Create Event
      </h1>

      <div className="space-y-5">

        {/* ── Basic info ─────────────────────────────────────────────── */}
        <div className="rounded-xl border p-5 sm:p-6 space-y-5" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text-muted)" }}>Event details</h2>

          {/* Name + city */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Event name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Eman Channel Volunteer Day" required />
            <Input label="City" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. London" required />
          </div>

          {/* Venue name + address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Venue name" value={venueName} onChange={e => setVenueName(e.target.value)} placeholder="e.g. Emirates Stadium" />
            <Input label="Venue address" value={venueAddress} onChange={e => setVenueAddress(e.target.value)} placeholder="e.g. Hornsey Rd, London N7 7AJ" />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} style={labelStyle}>Description <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(shown to volunteers)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief overview of what volunteers will be doing at this event…"
              className="w-full border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] resize-none focus:outline-none focus:ring-2"
              style={{ ...selectStyle, lineHeight: 1.6 }}
            />
          </div>
        </div>

        {/* ── Date & time ────────────────────────────────────────────── */}
        <div className="rounded-xl border p-5 sm:p-6 space-y-4" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text-muted)" }}>Date &amp; time</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} style={labelStyle}>Doors open <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(optional)</span></label>
              <input type="datetime-local" value={doorsOpen} onChange={e => setDoorsOpen(e.target.value)} className={selectClass} style={selectStyle} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} style={labelStyle}>Event starts <span style={{ color: "var(--color-error)" }}>*</span></label>
              <input type="datetime-local" value={startDt} onChange={e => setStartDt(e.target.value)} className={selectClass} style={selectStyle} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} style={labelStyle}>Event ends <span style={{ color: "var(--color-error)" }}>*</span></label>
              <input type="datetime-local" value={endDt} onChange={e => setEndDt(e.target.value)} className={selectClass} style={selectStyle} />
            </div>
          </div>
        </div>

        {/* ── Roles ──────────────────────────────────────────────────── */}
        <div className="rounded-xl border p-5 sm:p-6" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text-muted)" }}>Volunteer roles</h2>
            <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{roles.length} role{roles.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-[1fr_140px_100px_32px] gap-2.5 px-0.5">
              {["Role", "Gender", "Capacity", ""].map(h => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--color-text-muted)" }}>{h}</span>
              ))}
            </div>

            {roles.map((row, idx) => (
              <div key={row.id} className="flex flex-col sm:grid sm:grid-cols-[1fr_140px_100px_32px] gap-2 sm:gap-2.5 rounded-xl p-3 sm:p-0 sm:rounded-none" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-card-border)", borderRadius: "10px" }}>
                <div className="flex items-center justify-between sm:hidden mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Role {idx + 1}</span>
                  {roles.length > 1 && (
                    <button onClick={() => removeRole(row.id)} className="text-[11px] px-2 py-0.5 rounded" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>Remove</button>
                  )}
                </div>

                <select value={row.role_name} onChange={e => updateRole(row.id, "role_name", e.target.value)} className={selectClass} style={selectStyle}>
                  {ROLE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>

                <select value={row.gender_restriction} onChange={e => updateRole(row.id, "gender_restriction", e.target.value)} className={selectClass} style={selectStyle}>
                  {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                <input type="number" min="1" value={row.capacity} onChange={e => updateRole(row.id, "capacity", e.target.value)} placeholder="Qty" className={selectClass} style={selectStyle} />

                <button
                  onClick={() => removeRole(row.id)} disabled={roles.length === 1}
                  className="hidden sm:flex items-center justify-center w-8 h-[44px] rounded-lg"
                  style={{ color: roles.length === 1 ? "#3A3530" : "#9E9690", background: "transparent" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addRole}
            className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-lg"
            style={{ color: "var(--color-gold)", background: "var(--color-gold-subtle)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add another role
          </button>
        </div>

        {error && (
          <p className="text-[13px] rounded-lg px-3 py-2.5" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <Link href="/admin/events" className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>Cancel</Link>
          <Button variant="gold" onClick={submit} disabled={loading}>
            {loading ? "Creating…" : "Create Event"}
          </Button>
        </div>
      </div>
    </div>
  );
}
