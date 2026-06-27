"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ContactModal } from "@/components/ui/ContactModal";

/* ── Desktop sidebar nav ─────────────────────────────────── */

const SIDEBAR_NAV = [
  {
    section: "My Hub",
    links: [
      {
        href: "/volunteer/dashboard",
        label: "Dashboard",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 001 1h12a1 1 0 001-1V9.5" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Events",
    links: [
      {
        href: "/volunteer/events",
        label: "Browse Events",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 3v4M16 3v4" />
          </svg>
        ),
      },
      {
        href: "/volunteer/applications",
        label: "My Events",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            <path d="M9 16l2 2 4-4" />
          </svg>
        ),
      },
      {
        href: "/volunteer/qr-code",
        label: "My QR Code",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2h-2M20 14v2" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Points",
    links: [
      {
        href: "/volunteer/points",
        label: "Points & Rewards",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l2.6 5.8 6.4.6-4.8 4.2 1.4 6.2L12 16l-5.6 2.8 1.4-6.2L3 8.4l6.4-.6z" />
          </svg>
        ),
        soon: true,
      },
    ],
  },
  {
    section: "Account",
    links: [
      {
        href: "/volunteer/profile",
        label: "My Profile",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        ),
      },
      {
        href: "/volunteer/documents",
        label: "Documents & DBS",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        ),
        soon: true,
      },
    ],
  },
];

function SidebarContents() {
  const path = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-4 py-5 border-b flex-shrink-0" style={{ borderColor: "#2C2825" }}>
        <Image src="/assets/logo-gold.png" alt="LUL" width={32} height={32} className="h-8 w-auto object-contain flex-shrink-0" />
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] block" style={{ color: "var(--color-gold)" }}>
            LUL Global Volunteers
          </span>
          <span className="text-[10px]" style={{ color: "#6B6259" }}>Volunteer Portal</span>
        </div>
      </div>

      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        {SIDEBAR_NAV.map(({ section, links }) => (
          <div key={section} className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] px-2 mb-1" style={{ color: "#6B6259" }}>
              {section}
            </p>
            {links.map(({ href, label, icon, soon }: { href: string; label: string; icon: React.ReactNode; soon?: boolean }) => {
              const active = path === href || path.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] mb-0.5 transition-colors"
                  style={{
                    background: active ? "var(--color-gold-subtle)" : "transparent",
                    color:      active ? "var(--color-gold)" : soon ? "#4A4440" : "#9E9690",
                    fontWeight: active ? "600" : "400",
                  }}
                >
                  <span className="w-[15px] h-[15px] flex-shrink-0" style={{ opacity: active ? 1 : soon ? 0.35 : 0.6 }}>
                    {icon}
                  </span>
                  <span className="flex-1 truncate">{label}</span>
                  {soon && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ background: "#2C2825", color: "#6B6259" }}>
                      Soon
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex-shrink-0 px-2.5 py-4 border-t" style={{ borderColor: "#2C2825" }}>
        {/* T&C / FAQ links */}
        <div className="flex items-center gap-3 px-2.5 mb-3">
          <Link href="/terms" className="text-[11px] font-medium" style={{ color: "#4A4440" }}>
            Terms &amp; Conditions
          </Link>
          <span style={{ color: "#3A3432", fontSize: 10 }}>·</span>
          <Link href="/faq" className="text-[11px] font-medium" style={{ color: "#4A4440" }}>
            FAQ
          </Link>
        </div>

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] w-full text-left transition-colors hover:bg-[#1A1714]"
            style={{ color: "#6B6259" }}
          >
            <svg className="w-[15px] h-[15px] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Mobile bottom tab bar ───────────────────────────────── */

function BottomTabBar() {
  const path = usePathname();

  const active =
    path.startsWith("/volunteer/dashboard") ? "home"    :
    path.startsWith("/volunteer/events") || path.startsWith("/volunteer/applications") ? "events"  :
    path.startsWith("/volunteer/qr-code")   ? "qr"      :
    path.startsWith("/volunteer/points")    ? "points"  :
    path.startsWith("/volunteer/profile")   ? "profile" : "";

  const fg = (key: string) => active === key ? "#A8854A" : "#A8A29E";

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-start"
      style={{
        height: 84,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid #EAE6DD",
        paddingTop: 11,
        paddingLeft: 14,
        paddingRight: 14,
      }}
    >
      {/* Home */}
      <Link href="/volunteer/dashboard" className="flex-1 flex flex-col items-center gap-1" style={{ color: fg("home") }}>
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 001 1h12a1 1 0 001-1V9.5" />
        </svg>
        <span style={{ fontSize: 10.5, fontWeight: 600 }}>Home</span>
      </Link>

      {/* Events */}
      <Link href="/volunteer/events" className="flex-1 flex flex-col items-center gap-1" style={{ color: fg("events") }}>
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 3v4M16 3v4" />
        </svg>
        <span style={{ fontSize: 10.5, fontWeight: 600 }}>Events</span>
      </Link>

      {/* QR — centre elevated button */}
      <Link href="/volunteer/qr-code" className="flex-1 flex flex-col items-center" style={{ marginTop: -20 }}>
        <div style={{
          width: 54, height: 54, borderRadius: "50%",
          background: "linear-gradient(135deg,#C9A227,#A8854A)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 18px -4px rgba(168,133,74,0.6)",
          border: "3px solid #fff",
          color: "#fff",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="3" height="3" /><rect x="18" y="18" width="3" height="3" />
          </svg>
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: fg("qr"), marginTop: 3 }}>QR</span>
      </Link>

      {/* Points */}
      <Link href="/volunteer/points" className="flex-1 flex flex-col items-center gap-1" style={{ color: fg("points") }}>
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l2.6 5.8 6.4.6-4.8 4.2 1.4 6.2L12 16l-5.6 2.8 1.4-6.2L3 8.4l6.4-.6z" />
        </svg>
        <span style={{ fontSize: 10.5, fontWeight: 600 }}>Points</span>
      </Link>

      {/* Profile */}
      <Link href="/volunteer/profile" className="flex-1 flex flex-col items-center gap-1" style={{ color: fg("profile") }}>
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        <span style={{ fontSize: 10.5, fontWeight: 600 }}>Profile</span>
      </Link>

      {/* iOS-style home indicator */}
      <div style={{
        position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
        width: 128, height: 5, borderRadius: 3, background: "#1C1917", opacity: 0.22,
      }} />
    </div>
  );
}

/* ── Compliance review gate ──────────────────────────────── */

type Stage = "awaiting_review" | "dbs_required" | "dbs_review" | "rejected";
type GateState =
  | { phase: "loading" }
  | { phase: "approved" }
  | { phase: "review"; stage: Stage; firstName: string; email: string };

const STAGE_COPY: Record<Stage, { heading: string; body: string }> = {
  awaiting_review: {
    heading: "Your application is being reviewed",
    body: "Thank you for registering. Our team is reviewing your application — this usually takes 24–48 hours. You'll be notified by email once you're approved, and your dashboard will unlock automatically.",
  },
  dbs_required: {
    heading: "One last step",
    body: "To complete your application we need to verify a DBS certificate. Please upload it below — once our team has reviewed it, we'll confirm your status.",
  },
  dbs_review: {
    heading: "We're reviewing your DBS",
    body: "Thanks for uploading your DBS certificate. Our team is reviewing it now and we'll email you as soon as it's confirmed.",
  },
  rejected: {
    heading: "Application not approved",
    body: "Unfortunately we're unable to approve your volunteer account at this time. If you believe this is a mistake, please contact our team.",
  },
};

function ReviewScreen({ stage, firstName, email, onUploaded }: { stage: Stage; firstName: string; email: string; onUploaded: () => void }) {
  const [file, setFile]           = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr]             = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const inputRef                  = useRef<HTMLInputElement>(null);

  const rejected = stage === "rejected";
  const copy = STAGE_COPY[stage];

  async function submit() {
    if (!file) { setErr("Please choose your DBS certificate first."); return; }
    setErr(null); setUploading(true);
    try {
      const fd = new FormData(); fd.append("certificate", file);
      const res  = await fetch("/api/volunteer/dbs", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onUploaded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: "var(--gradient-auth-bg, var(--color-bg))" }}>
      <div className="w-full max-w-[420px] rounded-2xl border p-8 text-center" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)", boxShadow: "var(--shadow-card)" }}>
        <Image src="/assets/logo-gold.png" alt="LUL" width={40} height={40} className="h-10 w-auto object-contain mx-auto mb-6" />

        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: rejected ? "var(--color-error-bg)" : "var(--color-gold-subtle)" }}>
          {rejected ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          ) : stage === "dbs_required" ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          )}
        </div>

        <h1 className="font-display text-[22px] font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
          {copy.heading}
        </h1>
        <p className="text-[14px] leading-relaxed mb-1" style={{ color: "var(--color-text-secondary)" }}>
          {firstName ? `Assalamu alaikum ${firstName},` : "Assalamu alaikum,"}
        </p>
        <p className="text-[14px] leading-relaxed mb-6" style={{ color: "var(--color-text-secondary)" }}>
          {copy.body}
        </p>

        {stage === "dbs_required" && (
          <div className="mb-6 text-left">
            <input
              ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => { setErr(null); setFile(e.target.files?.[0] ?? null); }}
            />
            <button
              type="button" onClick={() => inputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 text-[13px] font-medium rounded-xl px-4 py-3 mb-3"
              style={{ border: "1.5px dashed var(--color-input-border)", color: "var(--color-text-secondary)", background: "var(--color-input-bg)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span className="truncate">{file ? file.name : "Choose your DBS certificate"}</span>
            </button>
            <p className="text-[11px] mb-3" style={{ color: "var(--color-text-muted)" }}>PDF or image · max 10 MB</p>
            {err && <p className="text-[12px] mb-3" style={{ color: "var(--color-error)" }}>{err}</p>}
            <button
              type="button" onClick={submit} disabled={uploading}
              className="w-full text-[14px] font-semibold rounded-xl px-4 py-3"
              style={{ background: "var(--color-gold)", color: "#1A1714", opacity: uploading ? 0.6 : 1 }}
            >
              {uploading ? "Uploading…" : "Submit DBS certificate"}
            </button>
          </div>
        )}

        <button
          type="button" onClick={() => setContactOpen(true)}
          className="w-full text-[13px] font-semibold px-4 py-2.5 rounded-lg mb-3"
          style={{ color: "var(--color-gold)", background: "var(--color-gold-subtle)" }}
        >
          Contact us
        </button>

        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="text-[13px] font-semibold px-4 py-2.5 rounded-lg w-full" style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-card-border)" }}>
            Sign out
          </button>
        </form>
      </div>

      {contactOpen && (
        <ContactModal
          onClose={() => setContactOpen(false)}
          defaultName={firstName}
          defaultEmail={email}
          lockIdentity
        />
      )}
    </div>
  );
}

/* ── Shell ───────────────────────────────────────────────── */

export function VolunteerShell({ children }: { children: React.ReactNode }) {
  const [gate, setGate] = useState<GateState>({ phase: "loading" });

  function loadGate() {
    fetch("/api/volunteer/me")
      .then(async (r) => {
        if (r.status === 401) { window.location.href = "/login"; return null; }
        return r.ok ? r.json() : null;
      })
      .then((data) => {
        if (!data) { setGate({ phase: "approved" }); return; }
        const v = data.volunteer ?? {};
        const comp = Array.isArray(v.volunteer_compliance) ? v.volunteer_compliance[0] : v.volunteer_compliance;
        const overall: string  = comp?.overall_status ?? "pending";
        const lseg: string     = comp?.lseg_status ?? "pending";
        const dbs: string      = comp?.dbs_status ?? "not_uploaded";
        const firstName        = v.first_name ?? "";
        const email            = v.email ?? "";

        if (overall === "approved") { setGate({ phase: "approved" }); return; }
        if (overall === "rejected") { setGate({ phase: "review", stage: "rejected", firstName, email }); return; }

        // pending — derive the onboarding sub-stage
        let stage: Stage = "awaiting_review";
        if (lseg === "possible_match" || lseg === "high_risk") {
          stage = dbs === "not_uploaded" ? "dbs_required" : "dbs_review";
        }
        setGate({ phase: "review", stage, firstName, email });
      })
      .catch(() => setGate({ phase: "approved" }));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadGate(); }, []);

  if (gate.phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (gate.phase === "review") {
    return <ReviewScreen stage={gate.stage} firstName={gate.firstName} email={gate.email} onUploaded={loadGate} />;
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--color-bg)" }}>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-[220px] flex-shrink-0 sticky top-0 h-screen border-r"
        style={{ background: "var(--color-chrome)", borderColor: "#2C2825" }}
      >
        <SidebarContents />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 flex flex-col overflow-auto">
          <div className="flex-1 flex flex-col pb-24 lg:pb-0">
            {children}
          </div>
        </main>
      </div>

      <BottomTabBar />
    </div>
  );
}
