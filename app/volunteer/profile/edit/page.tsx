"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

type FieldState = {
  first_name:  string;
  last_name:   string;
  phone:       string;
  nationality: string;
  address:     string;
  email:       string;
};

const EMPTY: FieldState = {
  first_name:  "",
  last_name:   "",
  phone:       "",
  nationality: "",
  address:     "",
  email:       "",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 11, fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  color: "#78716C",
  marginBottom: 6,
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  border: "1px solid #D9D2C5",
  borderRadius: 11,
  padding: "13px 14px",
  fontSize: 15,
  background: "#fff",
  color: "#1C1917",
  outline: "none",
  boxSizing: "border-box",
};

export default function EditProfilePage() {
  const router = useRouter();
  const [fields, setFields] = useState<FieldState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const focusRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/volunteer/me")
      .then(r => r.json())
      .then(d => {
        const v = d?.volunteer;
        if (v) {
          setFields({
            first_name:  v.first_name  ?? "",
            last_name:   v.last_name   ?? "",
            phone:       v.phone       ?? "",
            nationality: v.nationality ?? "",
            address:     v.address     ?? "",
            email:       v.email       ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function set(key: keyof FieldState, value: string) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.first_name.trim() || !fields.last_name.trim()) {
      setError("First name and last name are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/volunteer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name:  fields.first_name.trim(),
          last_name:   fields.last_name.trim(),
          phone:       fields.phone.trim()       || null,
          nationality: fields.nationality.trim() || null,
          address:     fields.address.trim()     || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setSaved(true);
      setTimeout(() => router.push("/volunteer/profile"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "#A8854A", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, padding: "0 22px 32px", maxWidth: 600, margin: "0 auto", width: "100%" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0 20px" }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            padding: "6px 8px 6px 0", color: "#1C1917", display: "flex", alignItems: "center",
          }}
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 style={{
          fontFamily: "var(--font-cormorant, 'Cormorant Garamond', Georgia, serif)",
          fontSize: 24, fontWeight: 600, color: "#1C1917", margin: 0,
        }}>
          Edit details
        </h1>
      </div>

      <form onSubmit={handleSave}>

        {/* First name */}
        <div style={{ marginBottom: 18 }}>
          <label style={LABEL_STYLE}>First name</label>
          <input
            type="text"
            value={fields.first_name}
            onChange={e => set("first_name", e.target.value)}
            onFocus={e => { e.target.style.borderColor = "#A8854A"; }}
            onBlur={e => { e.target.style.borderColor = "#D9D2C5"; }}
            placeholder="First name"
            style={INPUT_STYLE}
            required
          />
        </div>

        {/* Last name */}
        <div style={{ marginBottom: 18 }}>
          <label style={LABEL_STYLE}>Last name</label>
          <input
            type="text"
            value={fields.last_name}
            onChange={e => set("last_name", e.target.value)}
            onFocus={e => { e.target.style.borderColor = "#A8854A"; }}
            onBlur={e => { e.target.style.borderColor = "#D9D2C5"; }}
            placeholder="Last name"
            style={INPUT_STYLE}
            required
          />
        </div>

        {/* Email (read-only) */}
        <div style={{ marginBottom: 18 }}>
          <label style={LABEL_STYLE}>Email</label>
          <input
            type="email"
            value={fields.email}
            readOnly
            style={{ ...INPUT_STYLE, background: "#F7F4EE", color: "#A8A29E", cursor: "not-allowed" }}
          />
        </div>

        {/* Phone */}
        <div style={{ marginBottom: 18 }}>
          <label style={LABEL_STYLE}>Phone</label>
          <input
            type="tel"
            value={fields.phone}
            onChange={e => set("phone", e.target.value)}
            onFocus={e => { e.target.style.borderColor = "#A8854A"; }}
            onBlur={e => { e.target.style.borderColor = "#D9D2C5"; }}
            placeholder="+44 7700 000000"
            style={INPUT_STYLE}
          />
        </div>

        {/* Nationality */}
        <div style={{ marginBottom: 18 }}>
          <label style={LABEL_STYLE}>Nationality</label>
          <input
            type="text"
            value={fields.nationality}
            onChange={e => set("nationality", e.target.value)}
            onFocus={e => { e.target.style.borderColor = "#A8854A"; }}
            onBlur={e => { e.target.style.borderColor = "#D9D2C5"; }}
            placeholder="e.g. British"
            style={INPUT_STYLE}
          />
        </div>

        {/* Address */}
        <div style={{ marginBottom: 26 }}>
          <label style={LABEL_STYLE}>Address <span style={{ textTransform: "none", fontWeight: 400, fontSize: 10 }}>(optional)</span></label>
          <textarea
            value={fields.address}
            onChange={e => set("address", e.target.value)}
            onFocus={e => { e.target.style.borderColor = "#A8854A"; }}
            onBlur={e => { e.target.style.borderColor = "#D9D2C5"; }}
            placeholder="Street, City, Postcode"
            rows={3}
            style={{ ...INPUT_STYLE, resize: "vertical", minHeight: 80, fontFamily: "inherit" }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "#FEE2E2", color: "#DC2626", borderRadius: 10,
            padding: "11px 14px", fontSize: 13, marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Success */}
        {saved && (
          <div style={{
            background: "#DCFCE7", color: "#15803D", borderRadius: 10,
            padding: "11px 14px", fontSize: 13, marginBottom: 16, fontWeight: 600,
          }}>
            Saved! Redirecting…
          </div>
        )}

        {/* Save button */}
        <button
          type="submit"
          disabled={saving || saved}
          style={{
            width: "100%", background: saving || saved ? "#6B6259" : "#1A1714",
            color: "#fff", border: "none", borderRadius: 12,
            padding: 15, fontSize: 15, fontWeight: 600, cursor: saving || saved ? "not-allowed" : "pointer",
            marginBottom: 12,
          }}
        >
          {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
        </button>

        {/* Cancel */}
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            width: "100%", background: "transparent",
            border: "1px solid #D9D2C5", color: "#44403C",
            borderRadius: 12, padding: 15, fontSize: 15, fontWeight: 600, cursor: "pointer",
          }}
        >
          Cancel
        </button>

      </form>
    </div>
  );
}
