"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* ─── Nav structure ─────────────────────────────────────────────────────── */

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
      {
        href: "/admin/volunteers",
        label: "Volunteers",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Configuration",
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
    ],
  },
];

/* ─── Sidebar contents (reused for desktop + mobile) ────────────────────── */

function SidebarContents({ onNav }: { onNav?: () => void }) {
  const path = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 py-5 border-b flex-shrink-0"
        style={{ borderColor: "#2C2825" }}
      >
        <Image
          src="/assets/logo-gold.png"
          alt="Light Upon Light Global"
          width={32}
          height={32}
          className="h-8 w-auto object-contain flex-shrink-0"
        />
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] block" style={{ color: "var(--color-gold)" }}>
            VolunteerHub
          </span>
          <span className="text-[10px]" style={{ color: "#6B6259" }}>
            Admin Portal
          </span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2.5 py-4 overflow-y-auto">
        {NAV.map(({ section, links }) => (
          <div key={section} className="mb-5">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.08em] px-2 mb-1.5"
              style={{ color: "#6B6259" }}
            >
              {section}
            </p>
            {links.map(({ href, label, icon }) => {
              const active = path === href || path.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNav}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] mb-0.5 transition-colors"
                  style={{
                    background: active ? "var(--color-gold-subtle)" : "transparent",
                    color:      active ? "var(--color-gold)"        : "#9E9690",
                    fontWeight: active ? "600" : "400",
                  }}
                >
                  <span
                    className="w-[15px] h-[15px] flex-shrink-0"
                    style={{ opacity: active ? 1 : 0.6 }}
                  >
                    {icon}
                  </span>
                  {label}
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
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] w-full text-left transition-colors"
            style={{ color: "#6B6259" }}
          >
            <svg
              className="w-[15px] h-[15px] flex-shrink-0"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
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

/* ─── Shell ──────────────────────────────────────────────────────────────── */

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: "var(--color-bg)" }}>

      {/* ── Desktop sidebar (lg+) ── */}
      <aside
        className="hidden lg:flex flex-col w-[220px] flex-shrink-0 sticky top-0 h-screen border-r"
        style={{ background: "var(--color-chrome)", borderColor: "#2C2825" }}
      >
        <SidebarContents />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside
            className="relative z-10 flex flex-col w-[260px] h-full border-r"
            style={{ background: "var(--color-chrome)", borderColor: "#2C2825" }}
          >
            <SidebarContents onNav={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar (hidden on lg+) */}
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
          <Image
            src="/assets/logo-gold.png"
            alt="LUL"
            width={28}
            height={28}
            className="h-7 w-auto object-contain"
          />
          <span className="text-[12px] font-semibold" style={{ color: "var(--color-gold)" }}>
            VolunteerHub
          </span>
        </header>

        <main className="flex-1 flex flex-col overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
