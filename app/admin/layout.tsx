import Image from "next/image";
import Link from "next/link";
import { AdminNav } from "./AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b"
        style={{ background: "var(--color-chrome)", borderColor: "#2C2825" }}
      >
        <div className="flex items-center gap-3">
          <Image
            src="/assets/logo-gold.png"
            alt="Light Upon Light Global"
            width={36}
            height={36}
            className="h-9 w-auto object-contain"
          />
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] block" style={{ color: "var(--color-gold)" }}>
              VolunteerHub
            </span>
            <span className="text-[11px]" style={{ color: "#6B6259" }}>
              Admin Portal
            </span>
          </div>
        </div>

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-[13px] px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "#9E9690" }}
          >
            Sign out
          </button>
        </form>
      </header>

      <AdminNav />

      {/* Page content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
