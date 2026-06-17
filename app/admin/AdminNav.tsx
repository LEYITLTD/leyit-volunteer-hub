"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/overview",        label: "Overview" },
  { href: "/admin/volunteers",      label: "Volunteers" },
  { href: "/admin/email-templates", label: "Email Templates" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav
      className="flex items-center gap-1 px-5 border-b overflow-x-auto"
      style={{ background: "var(--color-chrome)", borderColor: "#2C2825" }}
    >
      {links.map(({ href, label }) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className="text-[13px] px-3 py-3 border-b-2 transition-colors whitespace-nowrap"
            style={{
              borderColor:  active ? "var(--color-gold)"    : "transparent",
              color:        active ? "var(--color-gold)"    : "#9E9690",
              fontWeight:   active ? "600" : "400",
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
