"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/**
 * Reusable "contact us" form. Public — works with or without an account.
 * Posts to /api/contact. Pass defaultName/defaultEmail (and lockIdentity) when
 * the user is known (e.g. a logged-in volunteer awaiting approval).
 */
export function ContactForm({
  defaultName = "",
  defaultEmail = "",
  lockIdentity = false,
  onSent,
}: {
  defaultName?: string;
  defaultEmail?: string;
  lockIdentity?: boolean;
  onSent?: () => void;
}) {
  const [name, setName]       = useState(defaultName);
  const [email, setEmail]     = useState(defaultEmail);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [sent, setSent]       = useState(false);

  async function submit() {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError("Please fill in every field.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim(), company }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setSent(true);
      onSent?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--color-success-bg)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <p className="text-[15px] font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>Message sent</p>
        <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>Thanks for getting in touch — our team will reply by email as soon as we can.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {/* Honeypot — visually hidden, off-screen; bots fill it, humans don't */}
      <input
        type="text" tabIndex={-1} autoComplete="off" value={company}
        onChange={e => setCompany(e.target.value)}
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Input label="Your name" value={name} onChange={e => setName(e.target.value)} disabled={lockIdentity && !!defaultName} placeholder="Full name" />
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={lockIdentity && !!defaultEmail} placeholder="you@email.com" />
      </div>
      <Input label="Subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="What's this about?" />
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">Message</label>
        <textarea
          value={message} onChange={e => setMessage(e.target.value)} rows={5}
          placeholder="How can we help?"
          className="w-full border border-input-border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] bg-[var(--color-input-bg)] text-text-primary resize-none leading-relaxed"
        />
      </div>

      {error && <p className="text-[12.5px] rounded-lg px-3 py-2.5" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>{error}</p>}

      <Button variant="gold" fullWidth onClick={submit} disabled={sending}>
        {sending ? "Sending…" : "Send message"}
      </Button>
    </div>
  );
}
