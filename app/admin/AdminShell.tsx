"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    section: "Platform",
    links: [
      {
        href: "/admin/overview",
        label: "Overview",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Volunteers",
    links: [
      {
        href: "/admin/volunteers",
        label: "All Volunteers",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        href: "/admin/compliance",
        label: "Compliance",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        ),
        soon: true,
      },
    ],
  },
  {
    section: "Events",
    links: [
      {
        href: "/admin/events",
        label: "Manage Events",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        ),
      },
      {
        href: "/admin/checkin",
        label: "QR Check-in",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2h-2M20 14v2" />
          </svg>
        ),
        soon: true,
      },
    ],
  },
  {
    section: "Communications",
    links: [
      {
        href: "/admin/email-templates",
        label: "Email Templates",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        ),
      },
      {
        href: "/admin/broadcast",
        label: "Broadcast Email",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        ),
        soon: true,
      },
    ],
  },
  {
    section: "Points & Rewards",
    links: [
      {
        href: "/admin/points",
        label: "Leaderboard",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ),
        soon: true,
      },
    ],
  },
  {
    section: "Reports",
    links: [
      {
        href: "/admin/reports",
        label: "Reports",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        ),
        soon: true,
      },
    ],
  },
  {
    section: "Settings",
    links: [
      {
        href: "/admin/settings",
        label: "Settings",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
        soon: true,
      },
    ],
  },
];

function SidebarContents({ onNav }: { onNav?: () => void }) {
  const path = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b flex-shrink-0" style={{ borderColor: "#2C2825" }}>
        <Image src="/assets/logo-gold.png" alt="LUL" width={32} height={32} className="h-8 w-auto object-contain flex-shrink-0" />
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] block" style={{ color: "var(--color-gold)" }}>
            VolunteerHub
          </span>
          <span className="text-[10px]" style={{ color: "#6B6259" }}>Admin Portal</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        {NAV.map(({ section, links }) => (
          <div key={section} className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] px-2 mb-1" style={{ color: "#6B6259" }}>
              {section}
            </p>
            {links.map(({ href, label, icon, soon }) => {
              const active = path === href || path.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={soon ? undefined : onNav}
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
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ background: "#2C2825", color: "#6B6259" }}
                    >
                      Soon
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div className="flex-shrink-0 px-2.5 py-4 border-t" style={{ borderColor: "#2C2825" }}>
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

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: "var(--color-bg)" }}>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-[220px] flex-shrink-0 sticky top-0 h-screen border-r"
        style={{ background: "var(--color-chrome)", borderColor: "#2C2825" }}
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
            className="relative z-10 flex flex-col w-[260px] h-full border-r"
            style={{ background: "var(--color-chrome)", borderColor: "#2C2825" }}
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
          style={{ background: "var(--color-chrome)", borderColor: "#2C2825" }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 -ml-1 rounded-lg"
            style={{ color: "#9E9690" }}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6"  x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Image src="/assets/logo-gold.png" alt="LUL" width={28} height={28} className="h-7 w-auto object-contain" />
          <span className="text-[12px] font-semibold" style={{ color: "var(--color-gold)" }}>VolunteerHub</span>
          <span className="text-[11px] ml-auto" style={{ color: "#6B6259" }}>Admin</span>
        </header>

        <main className="flex-1 flex flex-col overflow-auto">{children}</main>
      </div>
    </div>
  );
}
