"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/admin/overview",
    label: "Overview",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: "/admin/events",
    label: "Events",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>
      </svg>
    ),
  },
  {
    href: "/admin/volunteers",
    label: "Volunteers",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
        <path d="M16 5a3 3 0 010 6M18 20c0-2.5-1-4.5-2.5-5.5"/>
      </svg>
    ),
  },
  {
    href: "/admin/compliance",
    label: "Compliance",
    soon: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>
      </svg>
    ),
  },
  {
    href: "/admin/checkin",
    label: "Check-in",
    soon: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7V5a1 1 0 011-1h2M17 4h2a1 1 0 011 1v2M20 17v2a1 1 0 01-1 1h-2M7 20H5a1 1 0 01-1-1v-2"/>
        <path d="M4 12h16"/>
      </svg>
    ),
  },
  {
    href: "/admin/points",
    label: "Leaderboard",
    soon: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="12" width="4" height="8" rx="1"/><rect x="10" y="6" width="4" height="14" rx="1"/>
        <rect x="16" y="9" width="4" height="11" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/admin/reports",
    label: "Reporting",
    soon: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/>
        <path d="M14 3v5h5M9 13h6M9 17h6"/>
      </svg>
    ),
  },
  {
    href: "/admin/broadcast",
    label: "Email",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>
      </svg>
    ),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

function SidebarContents({ onNav }: { onNav?: () => void }) {
  const path = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div style={{ padding: "22px 20px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
        <Image src="/assets/logo-gold.png" alt="LUL" width={42} height={42} className="h-[42px] w-auto object-contain" />
      </div>

      {/* "Admin console" label */}
      <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: ".14em", color: "rgba(255,255,255,0.35)", padding: "6px 24px 8px" }}>
        Admin console
      </div>

      {/* Nav — flat, no section titles */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1px", overflowY: "auto" }}>
        {NAV.map(({ href, label, icon, soon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={soon ? undefined : onNav}
              style={{
                display:        "flex",
                alignItems:     "center",
                gap:            "11px",
                margin:         "1px 12px",
                padding:        "9px 12px",
                borderRadius:   "8px",
                fontSize:       "13.5px",
                fontWeight:     600,
                textDecoration: "none",
                cursor:         soon ? "default" : "pointer",
                transition:     "background .12s, color .12s",
                background:     active ? "var(--color-gold-subtle)" : "transparent",
                color:          active ? "var(--color-gold)" : soon ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.55)",
              }}
            >
              <span style={{ width: "17px", height: "17px", flexShrink: 0, display: "flex" }}>
                {icon}
              </span>
              <span style={{ flex: 1 }}>{label}</span>
              {soon && (
                <span style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }}>
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user + sign out */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--color-gold)", color: "#1A1714", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>
          EC
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#F3E9D2" }}>Eman Channel</div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>Admin</div>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" title="Sign out" style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "2px" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 4h3a1 1 0 011 1v14a1 1 0 01-1 1h-3M10 17l5-5-5-5M15 12H3"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: "var(--color-bg)" }}>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 sticky top-0 h-screen"
        style={{ width: "222px", background: "#1A1714" }}
      >
        <SidebarContents />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="relative z-10 flex flex-col h-full"
            style={{ width: "260px", background: "#1A1714" }}
          >
            <SidebarContents onNav={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{ background: "#1A1714", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 -ml-1 rounded-lg"
            style={{ color: "rgba(255,255,255,0.5)" }}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6"  x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <Image src="/assets/logo-gold.png" alt="LUL" width={28} height={28} className="h-7 w-auto object-contain" />
          <span className="text-[12px] font-semibold" style={{ color: "var(--color-gold)" }}>VolunteerHub</span>
          <span className="text-[11px] ml-auto" style={{ color: "rgba(255,255,255,0.4)" }}>Admin</span>
        </header>

        <main className="flex-1 flex flex-col overflow-auto">{children}</main>
      </div>
    </div>
  );
}
