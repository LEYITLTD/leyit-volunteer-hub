"use client";

import { ContactForm } from "@/components/ui/ContactForm";

export function ContactModal({
  onClose,
  defaultName,
  defaultEmail,
  lockIdentity,
}: {
  onClose: () => void;
  defaultName?: string;
  defaultEmail?: string;
  lockIdentity?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-stretch justify-end sm:items-center sm:justify-center sm:p-6"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: "var(--color-card)", maxHeight: "92dvh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-card-border)" }}>
          <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Contact us</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "var(--color-text-secondary)" }} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          <ContactForm defaultName={defaultName} defaultEmail={defaultEmail} lockIdentity={lockIdentity} />
        </div>
      </div>
    </div>
  );
}
