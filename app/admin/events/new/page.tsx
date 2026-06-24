"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const GENDER_OPTIONS = [
  { value: "any",    label: "Any" },
  { value: "male",   label: "Male only" },
  { value: "female", label: "Female only" },
];

type CatalogRole = { id: string; name: string; description: string | null };
type RoleRow = { id: number; role_catalog_id: string; role_name: string; gender_restriction: string; capacity: string };
let _nextId = 1;

/* ─── Image upload area ──────────────────────────────────────────────────── */

function ImageUpload({
  name, file, preview,
  onChange, onRemove,
}: {
  name: string;
  file: File | null;
  preview: string | null;
  onChange: (f: File, url: string) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [err,      setErr]      = useState<string | null>(null);

  function validate(f: File): string | null {
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return "Only JPG, PNG or WebP allowed";
    if (f.size > 5 * 1024 * 1024) return "File must be under 5 MB";
    return null;
  }

  function handle(f: File) {
    const e = validate(f);
    if (e) { setErr(e); return; }
    setErr(null);
    onChange(f, URL.createObjectURL(f));
  }

  return (
    <div>
      {preview ? (
        /* ── Preview ── */
        <div>
          <div style={{
            position: "relative", borderRadius: 12, overflow: "hidden",
            aspectRatio: "16/9", background: "#1C1510",
          }}>
            {/* Image */}
            <img src={preview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

            {/* Gradient scrim */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(0,0,0,0.04) 0%,rgba(0,0,0,0.04) 25%,rgba(0,0,0,0.72) 100%)" }} />

            {/* Event name preview overlay */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 16px" }}>
              {name.trim() ? (
                <p style={{
                  fontSize: 18, fontWeight: 700, color: "#fff",
                  margin: 0, lineHeight: 1.2,
                  textShadow: "0 1px 6px rgba(0,0,0,0.4)",
                }}>
                  {name}
                </p>
              ) : (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0 }}>
                  Fill in the event name above to preview
                </p>
              )}
            </div>

            {/* Remove button */}
            <button
              type="button" onClick={onRemove}
              style={{
                position: "absolute", top: 10, right: 10,
                width: 30, height: 30, borderRadius: "50%",
                background: "rgba(0,0,0,0.55)", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <button
            type="button" onClick={() => inputRef.current?.click()}
            className="mt-2 text-[12px] font-semibold"
            style={{ color: "var(--color-gold)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Replace image
          </button>
        </div>
      ) : (
        /* ── Drop zone ── */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault(); setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handle(f);
          }}
          style={{
            width: "100%", padding: "32px 20px", borderRadius: 12,
            border: `2px dashed ${dragging ? "var(--color-gold)" : "var(--color-card-border)"}`,
            background: dragging ? "var(--color-gold-subtle)" : "transparent",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            cursor: "pointer", transition: "all 0.15s ease",
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: "var(--color-gold-subtle)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <div style={{ textAlign: "center" }}>
            <p className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)", margin: "0 0 2px" }}>
              Click to upload or drag &amp; drop
            </p>
            <p className="text-[11px]" style={{ color: "var(--color-text-muted)", margin: 0 }}>
              JPG, PNG or WebP · Max 5 MB · 1200×675px recommended
            </p>
          </div>
        </button>
      )}

      {err && <p className="mt-2 text-[12px]" style={{ color: "var(--color-error)" }}>{err}</p>}

      <input
        ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }}
      />
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function NewEventPage() {
  const router = useRouter();

  const [name,         setName]         = useState("");
  const [city,         setCity]         = useState("");
  const [venueName,    setVenueName]    = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [description,  setDescription]  = useState("");
  const [volunteerStart, setVolunteerStart] = useState("");
  const [startDt,      setStartDt]      = useState("");
  const [endDt,        setEndDt]        = useState("");
  const [volunteerEnd, setVolunteerEnd] = useState("");
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [catalog,      setCatalog]      = useState<CatalogRole[]>([]);
  const [roles,        setRoles]        = useState<RoleRow[]>([
    { id: _nextId++, role_catalog_id: "", role_name: "", gender_restriction: "any", capacity: "1" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  /* Load the global role catalog (managed in Settings) */
  useEffect(() => {
    fetch("/api/admin/roles")
      .then(r => r.ok ? r.json() : [])
      .then((d) => {
        const list: CatalogRole[] = Array.isArray(d) ? d : [];
        setCatalog(list);
        // Default the first (empty) role row to the first catalog entry.
        if (list.length) {
          setRoles(rows => rows.map((row, i) =>
            i === 0 && !row.role_catalog_id
              ? { ...row, role_catalog_id: list[0].id, role_name: list[0].name }
              : row,
          ));
        }
      })
      .catch(() => {});
  }, []);

  function addRole() {
    const first = catalog[0];
    setRoles(r => [...r, { id: _nextId++, role_catalog_id: first?.id ?? "", role_name: first?.name ?? "", gender_restriction: "any", capacity: "1" }]);
  }
  function removeRole(id: number) { setRoles(r => r.filter(row => row.id !== id)); }
  function updateRole(id: number, field: keyof RoleRow, value: string) {
    setRoles(r => r.map(row => row.id === id ? { ...row, [field]: value } : row));
  }
  function selectRole(id: number, catalogId: string) {
    const cat = catalog.find(c => c.id === catalogId);
    setRoles(r => r.map(row => row.id === id ? { ...row, role_catalog_id: cat?.id ?? "", role_name: cat?.name ?? "" } : row));
  }

  async function submit() {
    if (!name.trim()) { setError("Event name is required."); return; }
    if (!city.trim()) { setError("City is required."); return; }
    if (!startDt)     { setError("Event start date and time is required."); return; }
    if (!endDt)       { setError("Event end date and time is required."); return; }
    if (new Date(endDt) <= new Date(startDt)) { setError("Event end must be after the event start."); return; }
    if (volunteerStart && new Date(volunteerStart) > new Date(startDt)) { setError("Volunteer start time must be at or before the event start."); return; }
    if (volunteerEnd && new Date(volunteerEnd) < new Date(endDt)) { setError("Volunteer end time must be at or after the event end."); return; }
    if (volunteerStart && volunteerEnd && new Date(volunteerEnd) <= new Date(volunteerStart)) { setError("Volunteer end must be after the volunteer start."); return; }
    if (roles.length === 0) { setError("Add at least one role."); return; }
    for (const r of roles) {
      if (!r.role_catalog_id) { setError("Please choose a role for every row."); return; }
      if (!r.capacity || parseInt(r.capacity) < 1) { setError(`Capacity for "${r.role_name}" must be at least 1.`); return; }
    }

    setError(null);
    setLoading(true);

    try {
      /* 1. Upload thumbnail if provided */
      let thumbnail_url: string | null = null;
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const upRes  = await fetch("/api/admin/upload/event-thumbnail", { method: "POST", body: fd });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error ?? "Image upload failed");
        thumbnail_url = upData.url as string;
      }

      /* 2. Create event */
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:          name.trim(),
          city:          city.trim(),
          venue_name:    venueName.trim()    || null,
          venue_address: venueAddress.trim() || null,
          description:   description.trim()  || null,
          event_start:    new Date(startDt).toISOString(),
          event_end:      new Date(endDt).toISOString(),
          volunteer_start: volunteerStart ? new Date(volunteerStart).toISOString() : null,
          volunteer_end:   volunteerEnd   ? new Date(volunteerEnd).toISOString()   : null,
          thumbnail_url,
          roles: roles.map(r => ({
            role_catalog_id:    r.role_catalog_id,
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

  const inputCls = [
    "w-full min-h-[44px] border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] appearance-none",
    "focus:outline-none focus:ring-2",
  ].join(" ");
  const inputSty = { borderColor: "var(--color-input-border)", background: "var(--color-input-bg)", color: "var(--color-text-primary)" };
  const lblCls   = "text-[11px] font-semibold uppercase tracking-[0.06em]";
  const lblSty   = { color: "var(--color-text-secondary)" };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
      <Link href="/admin/events" className="inline-flex items-center gap-1.5 text-[13px] mb-6" style={{ color: "var(--color-text-secondary)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Events
      </Link>

      <h1 className="font-display text-[24px] sm:text-[28px] font-semibold mb-6" style={{ color: "var(--color-text-primary)" }}>
        Create Event
      </h1>

      <div className="space-y-5">

        {/* ── Thumbnail ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border p-5 sm:p-6" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-4" style={{ color: "var(--color-text-muted)" }}>
            Event thumbnail <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
          </h2>
          <ImageUpload
            name={name}
            file={imageFile}
            preview={imagePreview}
            onChange={(f, url) => { setImageFile(f); setImagePreview(url); }}
            onRemove={() => { setImageFile(null); setImagePreview(null); }}
          />
        </div>

        {/* ── Basic info ─────────────────────────────────────────────── */}
        <div className="rounded-xl border p-5 sm:p-6 space-y-5" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text-muted)" }}>Event details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Event name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Eman Channel Volunteer Day" required />
            <Input label="City" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. London" required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Venue name" value={venueName} onChange={e => setVenueName(e.target.value)} placeholder="e.g. Emirates Stadium" />
            <Input label="Venue address" value={venueAddress} onChange={e => setVenueAddress(e.target.value)} placeholder="e.g. Hornsey Rd, London N7 7AJ" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={lblCls} style={lblSty}>Description <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(shown to volunteers)</span></label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Brief overview of what volunteers will be doing at this event…"
              className="w-full border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] resize-none focus:outline-none focus:ring-2"
              style={{ ...inputSty, lineHeight: 1.6 }}
            />
          </div>
        </div>

        {/* ── Date & time ────────────────────────────────────────────── */}
        <div className="rounded-xl border p-5 sm:p-6 space-y-4" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text-muted)" }}>Date &amp; time</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={lblCls} style={lblSty}>Volunteer start <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(optional)</span></label>
              <input type="datetime-local" value={volunteerStart} onChange={e => setVolunteerStart(e.target.value)} className={inputCls} style={inputSty} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={lblCls} style={lblSty}>Event starts <span style={{ color: "var(--color-error)" }}>*</span></label>
              <input type="datetime-local" value={startDt} onChange={e => setStartDt(e.target.value)} className={inputCls} style={inputSty} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={lblCls} style={lblSty}>Event ends <span style={{ color: "var(--color-error)" }}>*</span></label>
              <input type="datetime-local" value={endDt} onChange={e => setEndDt(e.target.value)} className={inputCls} style={inputSty} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={lblCls} style={lblSty}>Volunteer end <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(optional)</span></label>
              <input type="datetime-local" value={volunteerEnd} onChange={e => setVolunteerEnd(e.target.value)} className={inputCls} style={inputSty} />
            </div>
          </div>
          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            Volunteer start/end are when volunteers should arrive and finish (e.g. for setup &amp; cleanup). They drive attendance points.
          </p>
        </div>

        {/* ── Roles ──────────────────────────────────────────────────── */}
        <div className="rounded-xl border p-5 sm:p-6" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text-muted)" }}>Volunteer roles</h2>
            <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{roles.length} role{roles.length !== 1 ? "s" : ""}</span>
          </div>

          {catalog.length === 0 && (
            <p className="text-[12px] mb-3 rounded-lg px-3 py-2.5" style={{ color: "var(--color-warning)", background: "var(--color-warning-bg)" }}>
              No roles defined yet. Add roles in <Link href="/admin/settings" className="underline font-semibold">Settings → Volunteer roles</Link> first.
            </p>
          )}

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
                <select value={row.role_catalog_id} onChange={e => selectRole(row.id, e.target.value)} className={inputCls} style={inputSty}>
                  <option value="" disabled>Select a role…</option>
                  {catalog.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <select value={row.gender_restriction} onChange={e => updateRole(row.id, "gender_restriction", e.target.value)} className={inputCls} style={inputSty}>
                  {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input type="number" min="1" value={row.capacity} onChange={e => updateRole(row.id, "capacity", e.target.value)} placeholder="Qty" className={inputCls} style={inputSty} />
                <button onClick={() => removeRole(row.id)} disabled={roles.length === 1}
                  className="hidden sm:flex items-center justify-center w-8 h-[44px] rounded-lg"
                  style={{ color: roles.length === 1 ? "#3A3530" : "#9E9690", background: "transparent" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button onClick={addRole} className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-lg"
            style={{ color: "var(--color-gold)", background: "var(--color-gold-subtle)" }}>
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
