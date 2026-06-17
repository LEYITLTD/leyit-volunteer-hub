"use client";

import { useEffect, useState, useCallback } from "react";

type Scope  = "global" | "event";
type Gender = "all" | "male" | "female";
type Event  = { id: string; name: string; event_start: string };
type Step   = "compose" | "confirm" | "done";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function BroadcastPage() {
  const [scope,        setScope]        = useState<Scope>("global");
  const [gender,       setGender]       = useState<Gender>("all");
  const [eventId,      setEventId]      = useState("");
  const [events,       setEvents]       = useState<Event[]>([]);
  const [count,        setCount]        = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  const [subject,   setSubject]   = useState("");
  const [message,   setMessage]   = useState("");
  const [sending,   setSending]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [step,      setStep]      = useState<Step>("compose");
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/events")
      .then(r => r.json())
      .then(d => setEvents(Array.isArray(d) ? d.map((e: { id: string; name: string; event_start: string }) => ({ id: e.id, name: e.name, event_start: e.event_start })) : []));
  }, []);

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
    setScope("global"); setGender("all"); setEventId("");
    setSubject(""); setMessage(""); setError(null);
    setStep("compose"); setSentCount(0);
  }

  const canSend   = subject.trim() && message.trim() && (count ?? 0) > 0 && (scope === "global" || eventId);
  const sendLabel = countLoading ? "Counting…" : count === null ? "—" : count === 0 ? "No recipients" : `${count}`;

  const selectedEvent = events.find(e => e.id === eventId);

  const GENDER_OPTS: { value: Gender; label: string }[] = [
    { value: "all",    label: "Everyone" },
    { value: "male",   label: "Brothers only" },
    { value: "female", label: "Sisters only" },
  ];

  // Shared card style
  const card: React.CSSProperties = {
    background:   "var(--color-card)",
    border:       "1px solid var(--color-card-border)",
    borderRadius: "12px",
    padding:      "22px",
  };

  const labelStyle: React.CSSProperties = {
    fontSize:      "11px",
    fontWeight:    600,
    textTransform: "uppercase",
    letterSpacing: ".06em",
    color:         "var(--color-text-muted)",
    display:       "block",
  };

  const fieldStyle: React.CSSProperties = {
    width:        "100%",
    border:       "1px solid var(--color-input-border)",
    borderRadius: "8px",
    padding:      "9px 11px",
    fontSize:     "14px",
    background:   "var(--color-input-bg)",
    color:        "var(--color-text-primary)",
    marginTop:    "5px",
    marginBottom: "16px",
    outline:      "none",
  };

  // ── Done ────────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-[360px]">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#1A2E1A" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </div>
          <h2 className="font-display text-[22px] font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>Email sent</h2>
          <p className="text-[14px] mb-6" style={{ color: "var(--color-text-secondary)" }}>
            Your message was delivered to <strong>{sentCount}</strong> {sentCount === 1 ? "volunteer" : "volunteers"}.
          </p>
          <button
            onClick={reset}
            style={{ border: "1px solid var(--color-card-border)", color: "var(--color-text-secondary)", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, background: "transparent", cursor: "pointer" }}
          >
            Send another
          </button>
        </div>
      </div>
    );
  }

  // ── Confirm ──────────────────────────────────────────────────────────────────
  if (step === "confirm") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]" style={card}>
          <h2 className="text-[16px] font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>Confirm broadcast</h2>
          <p className="text-[13px] mb-5" style={{ color: "var(--color-text-secondary)" }}>
            This will send an email to <strong>{count}</strong> {(count ?? 0) === 1 ? "volunteer" : "volunteers"}. This cannot be undone.
          </p>
          <div className="rounded-xl p-4 mb-5 space-y-2" style={{ background: "var(--color-bg)", border: "1px solid var(--color-card-border)" }}>
            <div>
              <p style={{ ...labelStyle, marginBottom: "2px" }}>To</p>
              <p className="text-[13px]" style={{ color: "var(--color-text-primary)" }}>{count} volunteers{selectedEvent ? ` — ${selectedEvent.name}` : ""}</p>
            </div>
            <div>
              <p style={{ ...labelStyle, marginBottom: "2px" }}>Subject</p>
              <p className="text-[13px]" style={{ color: "var(--color-text-primary)" }}>{subject}</p>
            </div>
          </div>
          {error && (
            <p className="text-[12px] rounded-lg px-3 py-2.5 mb-4" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>{error}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setStep("compose")}
              style={{ flex: 1, border: "1px solid var(--color-card-border)", color: "var(--color-text-secondary)", borderRadius: "8px", padding: "11px 20px", fontSize: "14px", fontWeight: 600, background: "transparent", cursor: "pointer" }}
            >
              Back
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              style={{ flex: 1, background: "var(--color-gold)", color: "#1A1714", border: "none", borderRadius: "8px", padding: "11px 20px", fontSize: "14px", fontWeight: 600, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1 }}
            >
              {sending ? "Sending…" : `Send to ${count}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Compose ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
      <div className="mb-6">
        <h1 className="font-display text-[24px] sm:text-[28px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Broadcast Email</h1>
        <p className="text-[14px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          Compose and send a message to your volunteers.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "18px", alignItems: "start" }}>

        {/* Left: compose */}
        <div style={card}>

          {/* Audience scope */}
          <label style={labelStyle}>Audience</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", margin: "5px 0 16px", padding: "4px", background: "var(--color-bg)", borderRadius: "8px" }}>
            {(["global", "event"] as const).map(s => (
              <button
                key={s}
                onClick={() => { setScope(s); if (s === "global") setEventId(""); }}
                style={{
                  padding:      "8px 0",
                  borderRadius: "6px",
                  fontSize:     "12px",
                  fontWeight:   600,
                  cursor:       "pointer",
                  transition:   "all .15s",
                  background:   scope === s ? "var(--color-card)" : "transparent",
                  color:        scope === s ? "var(--color-text-primary)" : "var(--color-text-muted)",
                  border:       scope === s ? "1px solid var(--color-card-border)" : "1px solid transparent",
                }}
              >
                {s === "global" ? "All volunteers" : "By event"}
              </button>
            ))}
          </div>

          {/* Event picker */}
          {scope === "event" && (
            <>
              <label style={labelStyle}>Event</label>
              <select
                value={eventId}
                onChange={e => setEventId(e.target.value)}
                style={{ ...fieldStyle, appearance: "none" }}
              >
                <option value="">Select event…</option>
                {events.map(e => (
                  <option key={e.id} value={e.id}>{e.name} — {fmtDate(e.event_start)}</option>
                ))}
              </select>
            </>
          )}

          {/* Gender */}
          <label style={labelStyle}>Gender filter</label>
          <div style={{ display: "flex", gap: "6px", margin: "5px 0 16px" }}>
            {GENDER_OPTS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setGender(opt.value)}
                style={{
                  flex:         1,
                  padding:      "8px 6px",
                  borderRadius: "8px",
                  fontSize:     "12px",
                  fontWeight:   600,
                  cursor:       "pointer",
                  background:   gender === opt.value ? "var(--color-gold-subtle)" : "transparent",
                  color:        gender === opt.value ? "var(--color-gold)" : "var(--color-text-muted)",
                  border:       `1px solid ${gender === opt.value ? "var(--color-gold)" : "var(--color-card-border)"}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Subject */}
          <label style={labelStyle}>Subject line</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Final briefing & arrival times"
            style={fieldStyle}
          />

          {/* Body */}
          <label style={labelStyle}>
            Body{" "}
            <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--color-text-muted)", fontWeight: 500 }}>· supports plain text</span>
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Dear volunteer, …"
            rows={7}
            style={{ ...fieldStyle, resize: "vertical", lineHeight: "1.5", minHeight: "160px" }}
          />

          {error && (
            <p style={{ fontSize: "12px", color: "var(--color-error)", background: "var(--color-error-bg)", borderRadius: "8px", padding: "10px 12px", marginBottom: "14px" }}>
              {error}
            </p>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => { setError(null); setStep("confirm"); }}
              disabled={!canSend}
              style={{
                background:   "var(--color-gold)",
                color:        "#1A1714",
                border:       "none",
                borderRadius: "8px",
                padding:      "11px 20px",
                fontSize:     "14px",
                fontWeight:   600,
                cursor:       canSend ? "pointer" : "not-allowed",
                opacity:      canSend ? 1 : 0.5,
                display:      "flex",
                alignItems:   "center",
                gap:          "8px",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Send now
            </button>
          </div>
        </div>

        {/* Right: preview */}
        <div style={card}>
          <h3 style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--color-text-muted)", fontWeight: 700, margin: "0 0 14px" }}>
            Preview
          </h3>

          {/* Email preview frame */}
          <div style={{ border: "1px solid var(--color-card-border)", borderRadius: "10px", overflow: "hidden" }}>
            {/* Email header bar */}
            <div style={{ background: "#1A1714", padding: "12px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "24px", height: "24px", background: "var(--color-gold)", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1714" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-gold)", letterSpacing: ".06em", textTransform: "uppercase" }}>Eman Channel</span>
            </div>
            {/* Email body */}
            <div style={{ padding: "16px" }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "10px" }}>
                {subject || <span style={{ color: "var(--color-text-muted)", fontWeight: 400, fontStyle: "italic" }}>Subject preview</span>}
              </div>
              <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", lineHeight: "1.6", whiteSpace: "pre-wrap", minHeight: "80px" }}>
                {message || <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>Your email body will appear here as you type…</span>}
              </div>
            </div>
          </div>

          {/* Sending to */}
          <div style={{ background: "var(--color-bg)", borderRadius: "8px", padding: "11px 13px", marginTop: "14px", fontSize: "12.5px", color: "var(--color-text-secondary)" }}>
            Sending to:{" "}
            <strong style={{ color: countLoading ? "var(--color-text-muted)" : (count ?? 0) > 0 ? "var(--color-gold)" : "var(--color-text-muted)" }}>
              {countLoading ? "counting…" : count === null ? "select an event" : `${count} volunteer${count === 1 ? "" : "s"}`}
            </strong>
            {selectedEvent && <span> — {selectedEvent.name}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
