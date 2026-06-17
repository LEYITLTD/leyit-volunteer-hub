"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

type Suggestion = { address: string; url: string };

export function AddressAutocomplete({ label, value, onChange, required, className }: Props) {
  const [query, setQuery]           = useState(value);
  const [suggestions, setSuggs]     = useState<Suggestion[]>([]);
  const [loading, setLoading]       = useState(false);
  const [open, setOpen]             = useState(false);
  const [highlighted, setHL]        = useState(-1);
  const containerRef                = useRef<HTMLDivElement>(null);
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function handleInput(val: string) {
    setQuery(val);
    onChange(val);
    setHL(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 3) { setSuggs([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/address-search?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setSuggs(data.suggestions ?? []);
        setOpen((data.suggestions?.length ?? 0) > 0);
      } catch {
        setSuggs([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function select(address: string) {
    setQuery(address);
    onChange(address);
    setSuggs([]);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown")  { e.preventDefault(); setHL((h) => Math.min(h + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setHL((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" && highlighted >= 0) { e.preventDefault(); select(suggestions[highlighted].address); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <div ref={containerRef} className={`relative flex flex-col gap-1.5 ${className ?? ""}`}>
      {label && (
        <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          {label}{required && <span className="ml-0.5" style={{ color: "var(--color-gold)" }}>*</span>}
        </label>
      )}

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          autoComplete="off"
          placeholder="Start typing your address or postcode…"
          className="w-full min-h-[44px] border border-input-border rounded-[var(--radius-md)] px-3 py-3 pr-9 text-[14px] bg-[var(--color-input-bg)] text-text-primary transition-[border-color,box-shadow]"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-muted)" }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border overflow-hidden shadow-xl"
          style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}
        >
          {suggestions.slice(0, 8).map((s, i) => (
            <li key={s.url ?? i}>
              <button
                type="button"
                onMouseDown={() => select(s.address)}
                onMouseEnter={() => setHL(i)}
                className="w-full text-left px-4 py-2.5 text-[13px] transition-colors"
                style={{
                  background: highlighted === i ? "var(--color-gold-subtle)" : "transparent",
                  color:      highlighted === i ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  borderTop:  i > 0 ? "1px solid var(--color-card-border)" : undefined,
                }}
              >
                {s.address}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
