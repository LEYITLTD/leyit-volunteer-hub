"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Scope  = "global" | "event";
type Gender = "all" | "male" | "female";
type Event  = { id: string; name: string; event_start: string };
type Step   = "compose" | "confirm" | "done";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "all",    label: "Everyone" },
  { value: "male",   label: "Male only" },
  { value: "female", label: "Female only" },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function BroadcastPage() {
  const [scope,      setScope]      = useState<Scope>("global");
  const [gender,     setGender]     = useState<Gender>("all");
  const [eventId,    setEventId]    = useState("");
  const [events,     setEvents]     = useState<Event[]>([]);
  const [count,      setCount]      = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  const [subject,    setSubject]    = useState("");
  const [message,    setMessage]    = useState("");
  const [sending,    setSending]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [step,       setStep]       = useState<Step>("compose");
  const [sentCount,  setSentCount]  = useState(0);

  // Load events for the event picker
  useEffect(() => {
    fetch("/api/admin/events")
      .then(r => r.json())
      .then(d => setEvents(Array.isArray(d) ? d.map((e: { id: string; name: string; event_start: string }) => ({ id: e.id, name: e.name, event_start: e.event_start })) : []));
  }, []);

  // Fetch recipient count whenever audience changes
  const fetchCount = useCallback(() => {
    if (scope === "event" && !eventId) { setCount(null); return; }
    setCountLoading(true);
    const params = new URLSearchParams({ scope, gender });
    if (scope === "event" && eventId) params.set("event_id", eventId);
    fetch(`/api/admin/broadcast?${params}`)
      .then(r => r.json())
      .then(d => setCount(typeof d.count === "number" ? d.count : null))
      .finally(() => setCountLoading(false));
  }, [scope, gender, eventId]);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  async function handleSend() {
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, gender, event_id: eventId || null, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setSentCount(data.sent);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
      setStep("compose");
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setScope("global");
    setGender("all");
    setEventId("");
    setSubject("");
    setMessage("");
    setError(null);
    setStep("compose");
    setSentCount(0);
  }

  const canSend = subject.trim() && message.trim() && (count ?? 0) > 0 && (scope === "global" || eventId);

  const recipientLabel =
    countLoading ? "Counting…"
    : count === null ? "—"
    : count === 0 ? "No recipients"
    : `${count} ${count === 1 ? "volunteer" : "volunteers"}`;

  const selectStyle = {
    borderColor: "var(--color-input-border)",
    background:  "var(--color-input-bg)",
    color:       "var(--color-text-primary)",
  };

  // ── Done screen ──────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-[360px]">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#1A2E1A" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </div>
          <h2 className="font-display text-[22px] font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
            Email sent
          </h2>
          <p className="text-[14px] mb-6" style={{ color: "var(--color-text-secondary)" }}>
            Your message was delivered to <strong>{sentCount}</strong> {sentCount === 1 ? "volunteer" : "volunteers"}.
          </p>
          <Button variant="outline" onClick={reset}>Send another</Button>
        </div>
      </div>
    );
  }

  // ── Confirm screen ────────────────────────────────────────────────────────
  if (step === "confirm") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] rounded-2xl border p-6" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <h2 className="text-[16px] font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
            Confirm broadcast
          </h2>
          <p className="text-[13px] mb-5" style={{ color: "var(--color-text-secondary)" }}>
            This will send an email to <strong>{count}</strong> {(count ?? 0) === 1 ? "volunteer" : "volunteers"}. This cannot be undone.
          </p>

          <div className="rounded-xl p-4 mb-5 space-y-2" style={{ background: "#1C1916", border: "1px solid var(--color-card-border)" }}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-0.5" style={{ color: "var(--color-text-muted)" }}>To</p>
              <p className="text-[13px]" style={{ color: "var(--color-text-primary)" }}>{recipientLabel}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-0.5" style={{ color: "var(--color-text-muted)" }}>Subject</p>
              <p className="text-[13px]" style={{ color: "var(--color-text-primary)" }}>{subject}</p>
            </div>
          </div>

          {error && (
            <p className="text-[12px] rounded-lg px-3 py-2.5 mb-4" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("compose")}
              className="flex-1 text-[13px] font-semibold py-2.5 rounded-lg"
              style={{ border: "1px solid var(--color-card-border)", color: "var(--color-text-secondary)" }}
            >
              Back
            </button>
            <Button variant="gold" onClick={handleSend} disabled={sending} className="flex-1">
              {sending ? "Sending…" : `Send to ${count}`}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Compose screen ────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
      <div className="mb-6">
        <h1 className="font-display text-[24px] sm:text-[28px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Broadcast Email
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          Send a message to volunteers directly from the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">

        {/* Left: compose */}
        <div className="space-y-5">

          {/* Subject */}
          <div className="rounded-xl border p-5" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: "var(--color-text-muted)" }}>Subject</p>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Important update for volunteers"
            />
          </div>

          {/* Message */}
          <div className="rounded-xl border p-5" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: "var(--color-text-muted)" }}>Message</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your message here…"
              rows={10}
              className="w-full text-[14px] rounded-lg px-3 py-3 resize-y outline-none border transition-colors"
              style={{
                borderColor: "var(--color-input-border)",
                background:  "var(--color-input-bg)",
                color:       "var(--color-text-primary)",
                minHeight:   "200px",
              }}
            />
          </div>
        </div>

        {/* Right: audience + send */}
        <div className="space-y-4">

          {/* Audience card */}
          <div className="rounded-xl border p-5" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-4" style={{ color: "var(--color-text-muted)" }}>
              Recipients
            </p>

            {/* Scope toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-1 rounded-lg" style={{ background: "#1C1916" }}>
              {(["global", "event"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => { setScope(s); if (s === "global") setEventId(""); }}
                  className="py-2 rounded-md text-[12px] font-semibold transition-all"
                  style={{
                    background: scope === s ? "var(--color-card)" : "transparent",
                    color:      scope === s ? "var(--color-text-primary)" : "var(--color-text-muted)",
                    border:     scope === s ? "1px solid var(--color-card-border)" : "1px solid transparent",
                  }}
                >
                  {s === "global" ? "All volunteers" : "By event"}
                </button>
              ))}
            </div>

            {/* Event picker */}
            {scope === "event" && (
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Event</p>
                <select
                  value={eventId}
                  onChange={e => setEventId(e.target.value)}
                  className="w-full min-h-[44px] border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] appearance-none"
                  style={selectStyle}
                >
                  <option value="">Select an event…</option>
                  {events.map(e => (
                    <option key={e.id} value={e.id}>{e.name} — {fmtDate(e.event_start)}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Gender filter */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "var(--color-text-secondary)" }}>Gender</p>
              <div className="flex flex-col gap-1.5">
                {GENDER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setGender(opt.value)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-[13px] transition-all"
                    style={{
                      background:   gender === opt.value ? "var(--color-gold-subtle)" : "transparent",
                      color:        gender === opt.value ? "var(--color-gold)" : "var(--color-text-secondary)",
                      border:       `1px solid ${gender === opt.value ? "var(--color-gold)" : "var(--color-card-border)"}`,
                    }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                      style={{ borderColor: gender === opt.value ? "var(--color-gold)" : "var(--color-text-muted)" }}
                    >
                      {gender === opt.value && (
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-gold)" }} />
                      )}
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient count */}
            <div
              className="mt-4 rounded-lg px-3 py-2.5 flex items-center justify-between"
              style={{ background: "#1C1916", border: "1px solid var(--color-card-border)" }}
            >
              <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>Recipients</span>
              <span
                className="text-[13px] font-semibold tabular-nums"
                style={{ color: (count ?? 0) > 0 ? "var(--color-gold)" : "var(--color-text-muted)" }}
              >
                {recipientLabel}
              </span>
            </div>
          </div>

          {/* Send button */}
          {error && (
            <p className="text-[12px] rounded-lg px-3 py-2.5" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>
              {error}
            </p>
          )}

          <Button
            variant="gold"
            fullWidth
            disabled={!canSend}
            onClick={() => { setError(null); setStep("confirm"); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            {canSend ? `Send to ${count} ${(count ?? 0) === 1 ? "volunteer" : "volunteers"}` : "Select recipients & write message"}
          </Button>
        </div>
      </div>
    </div>
  );
}
