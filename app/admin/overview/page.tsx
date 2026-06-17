export default function AdminOverviewPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        {/* Gold icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--color-gold-subtle)", border: "1px solid var(--color-card-border)" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>

        <div
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full mb-4"
          style={{ background: "var(--color-gold-subtle)", color: "var(--color-gold)" }}
        >
          Admin Dashboard
        </div>

        <h1
          className="text-[32px] font-semibold leading-tight mb-3"
          style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-display, serif)" }}
        >
          Coming Soon
        </h1>

        <p className="text-[15px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          The admin dashboard is under active development. Volunteer management, event scheduling, compliance tracking, and reporting tools will appear here.
        </p>

        <div
          className="mt-8 p-4 rounded-xl text-left"
          style={{ background: "var(--color-card)", border: "1px solid var(--color-card-border)" }}
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] mb-3" style={{ color: "var(--color-text-muted)" }}>
            Planned modules
          </p>
          <ul className="space-y-2">
            {[
              "Volunteer profiles & compliance",
              "Event creation & role management",
              "QR check-in & attendance",
              "Points & reward redemptions",
              "Email campaigns",
              "Activity audit log",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--color-gold)" }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
