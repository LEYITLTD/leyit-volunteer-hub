"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

/* ── Shell ───────────────────────────────────────────────── */

export function VolunteerShell({ children }: { children: React.ReactNode }) {
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
