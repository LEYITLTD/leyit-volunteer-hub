export function ComingSoon({ feature }: { feature: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "var(--color-gold-subtle)" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <div>
        <h2 className="font-display text-[22px] font-semibold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
          {feature}
        </h2>
        <p className="text-[14px] max-w-[340px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          This section is being built. Check back soon.
        </p>
      </div>
      <span
        className="text-[11px] font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full"
        style={{ background: "var(--color-gold-subtle)", color: "var(--color-gold)", border: "1px solid var(--color-gold)" }}
      >
        Coming Soon
      </span>
    </div>
  );
}
