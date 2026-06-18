"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Compliance = {
  dbs_status:       string | null;
  overall_status:   string | null;
  dbs_uploaded_at:  string | null;
};

type Volunteer = {
  id:         string;
  first_name: string;
  last_name:  string;
  email:      string;
  volunteer_compliance: Compliance | null;
};

const DBS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  not_uploaded: { label: "Not uploaded",  bg: "#F3EFE6",  color: "#9E9690" },
  pending:      { label: "Pending review", bg: "#FEF9C3",  color: "#92400E" },
  verified:     { label: "Verified",       bg: "#DCFCE7",  color: "#15803D" },
  rejected:     { label: "Rejected",       bg: "#FEE2E2",  color: "#DC2626" },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London",
  });
}

const MENU_ITEMS = [
  {
    label: "Edit personal details",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    label: "Privacy & data",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    label: "Help & support",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
];

export default function ProfilePage() {
  const [volunteer, setVolunteer]     = useState<Volunteer | null>(null);
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/volunteer/me")
      .then(r => r.json())
      .then(d => setVolunteer(d?.volunteer ?? null))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const fd = new FormData();
    fd.append("certificate", file);
    const res = await fetch("/api/volunteer/dbs", { method: "POST", body: fd });
    if (!res.ok) {
      const d = await res.json();
      setUploadError(d.error ?? "Upload failed");
    } else {
      // Reload volunteer data to show pending status
      const r = await fetch("/api/volunteer/me");
      const d = await r.json();
      setVolunteer(d?.volunteer ?? null);
    }
    setUploading(false);
    // Reset so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "#A8854A", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!volunteer) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-[14px]" style={{ color: "#78716C" }}>Unable to load your profile.</p>
      </div>
    );
  }

  const initials   = `${volunteer.first_name[0]}${volunteer.last_name[0]}`.toUpperCase();
  const fullName   = `${volunteer.first_name} ${volunteer.last_name}`;
  const compliance = volunteer.volunteer_compliance;
  const dbsStatus  = compliance?.dbs_status ?? "not_uploaded";
  const dbsBadge   = DBS_BADGE[dbsStatus] ?? DBS_BADGE.not_uploaded;
  const uploaded   = compliance?.dbs_uploaded_at;

  return (
    <div style={{ padding: "8px 22px 8px", maxWidth: 600, margin: "0 auto", width: "100%" }}>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        style={{ display: "none" }}
        onChange={handleUpload}
      />

      {/* Avatar + name + email */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 22, paddingTop: 14 }}>
        <div style={{
          width: 78, height: 78, borderRadius: "50%",
          background: "#A8854A", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 27, fontWeight: 700, marginBottom: 12, flexShrink: 0,
        }}>
          {initials}
        </div>

        <div style={{ fontFamily: "var(--font-cormorant, 'Cormorant Garamond', Georgia, serif)", fontSize: 24, fontWeight: 600, color: "#1C1917", lineHeight: 1.2 }}>
          {fullName}
        </div>
        <div style={{ fontSize: 13.5, color: "#78716C", marginTop: 4 }}>
          {volunteer.email}
        </div>

        {/* Status badge */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <span style={{
            background: dbsBadge.bg, color: dbsBadge.color,
            fontSize: 11.5, fontWeight: 600, padding: "4px 11px", borderRadius: 20,
          }}>
            {dbsBadge.label}
          </span>
        </div>
      </div>

      {/* DBS certificate card */}
      <div style={{ background: "#fff", border: "1px solid #EAE6DD", borderRadius: 16, padding: 17, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "#78716C", fontWeight: 700 }}>
            DBS Certificate
          </div>
          <span style={{
            background: dbsBadge.bg, color: dbsBadge.color,
            fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 7,
          }}>
            {dbsBadge.label}
          </span>
        </div>

        {dbsStatus !== "not_uploaded" && uploaded ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 13 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 9,
                background: "#FEE2E2", color: "#DC2626",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                PDF
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1C1917" }}>DBS-certificate.pdf</div>
                <div style={{ fontSize: 12, color: "#78716C" }}>Uploaded {fmtDate(uploaded)}</div>
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: "100%", marginTop: 13,
                background: "transparent", border: "1px solid #D9D2C5",
                color: "#44403C", borderRadius: 10, padding: "10px",
                fontSize: 13.5, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer",
                opacity: uploading ? 0.7 : 1,
              }}
            >
              {uploading ? "Uploading…" : "Replace certificate"}
            </button>
          </>
        ) : (
          <>
            <div style={{ marginTop: 13, fontSize: 13, color: "#78716C", lineHeight: 1.5 }}>
              {dbsStatus === "not_uploaded"
                ? "No certificate uploaded yet. Upload your DBS certificate so we can verify your account."
                : "Your certificate is being reviewed. We'll notify you once it's processed."}
            </div>
            {dbsStatus === "not_uploaded" && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  width: "100%", marginTop: 13,
                  background: "#1A1714", border: "none",
                  color: "#fff", borderRadius: 10, padding: "10px",
                  fontSize: 13.5, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer",
                  opacity: uploading ? 0.7 : 1,
                }}
              >
                {uploading ? "Uploading…" : "Upload certificate"}
              </button>
            )}
          </>
        )}

        {uploadError && (
          <p style={{ marginTop: 10, fontSize: 12.5, color: "#DC2626" }}>{uploadError}</p>
        )}
      </div>

      {/* Profile menu */}
      <div style={{ background: "#fff", border: "1px solid #EAE6DD", borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
        {MENU_ITEMS.map((item, i) => {
          const inner = (
            <>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: "#F3EFE6", color: "#A8854A",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {item.icon}
              </div>
              <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500, color: "#1C1917" }}>
                {item.label}
              </span>
              <span style={{ color: "#C9C1B2", fontSize: 18, lineHeight: 1 }}>›</span>
            </>
          );

          const sharedStyle: React.CSSProperties = {
            display: "flex", alignItems: "center", gap: 13,
            padding: "15px 16px", cursor: "pointer",
            borderBottom: i < MENU_ITEMS.length - 1 ? "1px solid #F4EFE6" : "none",
            width: "100%", background: "transparent",
            textDecoration: "none",
          };

          if (i === 0) {
            return (
              <Link key={item.label} href="/volunteer/profile/edit" style={sharedStyle}>
                {inner}
              </Link>
            );
          }

          return (
            <button
              key={item.label}
              style={{ ...sharedStyle, border: "none", textAlign: "left" }}
            >
              {inner}
            </button>
          );
        })}
      </div>

      {/* Sign out */}
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          style={{
            width: "100%",
            background: "#fff", border: "1px solid #F3D2D2",
            color: "#DC2626", borderRadius: 13,
            padding: 14, fontSize: 14.5, fontWeight: 600, cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
