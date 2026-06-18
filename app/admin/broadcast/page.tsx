"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type Scope      = "global" | "event";
type Gender     = "all" | "male" | "female";
type Event      = { id: string; name: string; event_start: string };
type Step       = "compose" | "confirm" | "done";
type Attachment = { filename: string; content: string; size: string };

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Replace tags with example values for preview
function applyTags(text: string) {
  return text.replace(/\{\{first_name\}\}/g, "Ahmed").replace(/\{\{last_name\}\}/g, "Hassan");
}

const TAGS = [
  { label: "First name", tag: "{{first_name}}" },
  { label: "Last name",  tag: "{{last_name}}" },
];

const GENDER_OPTS: { value: Gender; label: string }[] = [
  { value: "all",    label: "Everyone" },
  { value: "male",   label: "Brothers only" },
  { value: "female", label: "Sisters only" },
];

export default function BroadcastPage() {
  const [scope,        setScope]        = useState<Scope>("global");
  const [gender,       setGender]       = useState<Gender>("all");
  const [eventId,      setEventId]      = useState("");
  const [events,       setEvents]       = useState<Event[]>([]);
  const [count,        setCount]        = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  const [subject,     setSubject]     = useState("");
  const [message,     setMessage]     = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending,     setSending]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [step,        setStep]        = useState<Step>("compose");
  const [sentCount,   setSentCount]   = useState(0);
  const [dragging,    setDragging]    = useState(false);

  const subjectRef    = useRef<HTMLInputElement>(null);
  const messageRef    = useRef<HTMLTextAreaElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const lastFocused   = useRef<"subject" | "message">("message");

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

  // Insert personalisation tag at cursor
  function insertTag(tag: string) {
    const isSubj = lastFocused.current === "subject";
    const el     = isSubj ? subjectRef.current : messageRef.current;
    const val    = isSubj ? subject : message;
    const setter = isSubj ? setSubject : setMessage;
    const start  = el?.selectionStart ?? val.length;
    const end    = el?.selectionEnd   ?? val.length;
    const next   = val.slice(0, start) + tag + val.slice(end);
    setter(next);
    requestAnimationFrame(() => {
      if (el) { el.selectionStart = el.selectionEnd = start + tag.length; el.focus(); }
    });
  }

  // Read uploaded files as base64
  async function handleFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      await new Promise<void>(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
          const result  = e.target?.result as string;
          const content = result.split(",")[1]; // strip data URL prefix
          setAttachments(a => [...a, { filename: file.name, content, size: fmtBytes(file.size) }]);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
  }

  async function handleSend() {
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ scope, gender, event_id: eventId || null, subject, message, attachments: attachments.map(a => ({ filename: a.filename, content: a.content })) }),
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
    setSubject(""); setMessage(""); setAttachments([]); setError(null);
    setStep("compose"); setSentCount(0);
  }

  const canSend       = subject.trim() && message.trim() && (count ?? 0) > 0 && (scope === "global" || eventId);
  const selectedEvent = events.find(e => e.id === eventId);

  // ── Shared styles ─────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "var(--color-card)", border: "1px solid var(--color-card-border)",
    borderRadius: "12px", padding: "28px",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "11px", fontWeight: 600, textTransform: "uppercase",
    letterSpacing: ".06em", color: "var(--color-text-muted)", display: "block",
  };
  const fieldStyle: React.CSSProperties = {
    width: "100%", border: "1px solid var(--color-input-border)", borderRadius: "8px",
    padding: "10px 13px", fontSize: "14px", background: "var(--color-input-bg)",
    color: "var(--color-text-primary)", marginTop: "6px", marginBottom: "18px", outline: "none",
  };

  // ── Done ─────────────────────────────────────────────────────────────────
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
          <button onClick={reset} style={{ border: "1px solid var(--color-card-border)", color: "var(--color-text-secondary)", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, background: "transparent", cursor: "pointer" }}>
            Send another
          </button>
        </div>
      </div>
    );
  }

  // ── Confirm ───────────────────────────────────────────────────────────────
  if (step === "confirm") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]" style={card}>
          <h2 className="text-[16px] font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>Confirm broadcast</h2>
          <p className="text-[13px] mb-5" style={{ color: "var(--color-text-secondary)" }}>
            This will send an email to <strong>{count}</strong> {(count ?? 0) === 1 ? "volunteer" : "volunteers"}. This cannot be undone.
          </p>
          <div className="rounded-xl p-4 mb-5 space-y-2.5" style={{ background: "var(--color-bg)", border: "1px solid var(--color-card-border)" }}>
            <div>
              <p style={{ ...labelStyle, marginBottom: "2px" }}>To</p>
              <p className="text-[13px]" style={{ color: "var(--color-text-primary)" }}>{count} volunteers{selectedEvent ? ` — ${selectedEvent.name}` : ""}</p>
            </div>
            <div>
              <p style={{ ...labelStyle, marginBottom: "2px" }}>Subject</p>
              <p className="text-[13px]" style={{ color: "var(--color-text-primary)" }}>{subject}</p>
            </div>
            {attachments.length > 0 && (
              <div>
                <p style={{ ...labelStyle, marginBottom: "4px" }}>Attachments</p>
                <p className="text-[13px]" style={{ color: "var(--color-text-primary)" }}>{attachments.length} file{attachments.length !== 1 ? "s" : ""}</p>
              </div>
            )}
          </div>
          {error && <p className="text-[12px] rounded-lg px-3 py-2.5 mb-4" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStep("compose")} style={{ flex: 1, border: "1px solid var(--color-card-border)", color: "var(--color-text-secondary)", borderRadius: "8px", padding: "11px 20px", fontSize: "14px", fontWeight: 600, background: "transparent", cursor: "pointer" }}>Back</button>
            <button onClick={handleSend} disabled={sending} style={{ flex: 1, background: "var(--color-gold)", color: "#1A1714", border: "none", borderRadius: "8px", padding: "11px 20px", fontSize: "14px", fontWeight: 600, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1 }}>
              {sending ? "Sending…" : `Send to ${count}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Compose ───────────────────────────────────────────────────────────────
  const previewSubject = applyTags(subject);
  const previewMessage = applyTags(message);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
      <div className="mb-6">
        <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>Broadcast Email</h1>
        <p className="text-[14px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Compose and send a message to your volunteers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5 items-start">

        {/* ── Left: compose ── */}
        <div style={card}>

          {/* Audience */}
          <label style={labelStyle}>Audience</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", margin: "5px 0 16px", padding: "4px", background: "var(--color-bg)", borderRadius: "8px" }}>
            {(["global", "event"] as const).map(s => (
              <button key={s} onClick={() => { setScope(s); if (s === "global") setEventId(""); }}
                style={{ padding: "8px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all .15s", background: scope === s ? "var(--color-card)" : "transparent", color: scope === s ? "var(--color-text-primary)" : "var(--color-text-muted)", border: scope === s ? "1px solid var(--color-card-border)" : "1px solid transparent" }}>
                {s === "global" ? "All volunteers" : "By event"}
              </button>
            ))}
          </div>

          {scope === "event" && (
            <>
              <label style={labelStyle}>Event</label>
              <select value={eventId} onChange={e => setEventId(e.target.value)} style={{ ...fieldStyle, appearance: "none" }}>
                <option value="">Select event…</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.name} — {fmtDate(e.event_start)}</option>)}
              </select>
            </>
          )}

          {/* Gender */}
          <label style={labelStyle}>Gender filter</label>
          <div style={{ display: "flex", gap: "6px", margin: "5px 0 16px" }}>
            {GENDER_OPTS.map(opt => (
              <button key={opt.value} onClick={() => setGender(opt.value)}
                style={{ flex: 1, padding: "8px 6px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: gender === opt.value ? "var(--color-gold-subtle)" : "transparent", color: gender === opt.value ? "var(--color-gold)" : "var(--color-text-muted)", border: `1px solid ${gender === opt.value ? "var(--color-gold)" : "var(--color-card-border)"}` }}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Personalisation tags */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--color-text-muted)" }}>Insert tag</span>
            {TAGS.map(t => (
              <button key={t.tag} onClick={() => insertTag(t.tag)}
                style={{ fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "5px", cursor: "pointer", background: "var(--color-gold-subtle)", color: "var(--color-gold)", border: "1px solid var(--color-gold)", fontFamily: "monospace" }}>
                {t.tag}
              </button>
            ))}
          </div>

          {/* Subject */}
          <label style={labelStyle}>Subject line</label>
          <input
            ref={subjectRef}
            value={subject}
            onChange={e => setSubject(e.target.value)}
            onFocus={() => { lastFocused.current = "subject"; }}
            placeholder="e.g. Hi {{first_name}}, here's your briefing"
            style={fieldStyle}
          />

          {/* Body */}
          <label style={labelStyle}>Body <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>· plain text</span></label>
          <textarea
            ref={messageRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onFocus={() => { lastFocused.current = "message"; }}
            placeholder={"Dear {{first_name}},\n\nYour message here…"}
            rows={7}
            style={{ ...fieldStyle, resize: "vertical", lineHeight: "1.5", minHeight: "160px" }}
          />

          {/* Attachments */}
          <label style={{ ...labelStyle, marginBottom: "6px" }}>Attachments</label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            style={{ display: "none" }}
            onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); }}
            style={{
              border: `2px dashed ${dragging ? "var(--color-gold)" : "var(--color-card-border)"}`,
              borderRadius: "10px", padding: "16px", textAlign: "center", cursor: "pointer",
              background: dragging ? "var(--color-gold-subtle)" : "var(--color-bg)",
              transition: "all .15s", marginBottom: "10px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-muted)", margin: "0 auto 6px", display: "block" }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Drop files here or <span style={{ color: "var(--color-gold)", fontWeight: 600 }}>click to upload</span></span>
          </div>

          {attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
              {attachments.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--color-bg)", border: "1px solid var(--color-card-border)", borderRadius: "6px", padding: "5px 8px" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-muted)", flexShrink: 0 }}>
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-primary)", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.filename}</span>
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{a.size}</span>
                  <button onClick={() => setAttachments(att => att.filter((_, j) => j !== i))} style={{ color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "0 2px", fontSize: "13px", lineHeight: 1 }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {error && <p style={{ fontSize: "12px", color: "var(--color-error)", background: "var(--color-error-bg)", borderRadius: "8px", padding: "10px 12px", marginBottom: "14px" }}>{error}</p>}

          <button
            onClick={() => { setError(null); setStep("confirm"); }}
            disabled={!canSend}
            style={{ background: "var(--color-gold)", color: "#1A1714", border: "none", borderRadius: "8px", padding: "11px 20px", fontSize: "14px", fontWeight: 600, cursor: canSend ? "pointer" : "not-allowed", opacity: canSend ? 1 : 0.5, display: "flex", alignItems: "center", gap: "8px" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Send now
          </button>
        </div>

        {/* ── Right: preview ── */}
        <div style={card}>
          <h3 style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--color-text-muted)", fontWeight: 700, margin: "0 0 14px" }}>Preview</h3>

          <div style={{ border: "1px solid var(--color-card-border)", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ background: "#1A1714", padding: "12px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "24px", height: "24px", background: "var(--color-gold)", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1714" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-gold)", letterSpacing: ".06em", textTransform: "uppercase" }}>Eman Channel</span>
            </div>
            <div style={{ padding: "16px" }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "10px" }}>
                {previewSubject || <span style={{ color: "var(--color-text-muted)", fontWeight: 400, fontStyle: "italic" }}>Subject preview</span>}
              </div>
              <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", lineHeight: "1.6", whiteSpace: "pre-wrap", minHeight: "80px" }}>
                {previewMessage || <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>Your email body will appear here…</span>}
              </div>
              {attachments.length > 0 && (
                <div style={{ borderTop: "1px solid var(--color-card-border)", marginTop: "12px", paddingTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {attachments.map((a, i) => (
                    <span key={i} style={{ fontSize: "11px", color: "var(--color-text-muted)", background: "var(--color-bg)", border: "1px solid var(--color-card-border)", borderRadius: "4px", padding: "2px 7px" }}>📎 {a.filename}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ background: "var(--color-bg)", borderRadius: "8px", padding: "11px 13px", marginTop: "14px", fontSize: "12.5px", color: "var(--color-text-secondary)" }}>
            Sending to:{" "}
            <strong style={{ color: countLoading ? "var(--color-text-muted)" : (count ?? 0) > 0 ? "var(--color-gold)" : "var(--color-text-muted)" }}>
              {countLoading ? "counting…" : count === null ? "select an event" : `${count} volunteer${count === 1 ? "" : "s"}`}
            </strong>
            {selectedEvent && <span> — {selectedEvent.name}</span>}
          </div>

          {/* Tag hint */}
          <div style={{ marginTop: "12px", padding: "10px 12px", background: "var(--color-bg)", borderRadius: "8px", border: "1px solid var(--color-card-border)" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "4px" }}>Tags available</p>
            <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", lineHeight: "1.6" }}>
              Use <code style={{ color: "var(--color-gold)", background: "var(--color-gold-subtle)", padding: "1px 4px", borderRadius: "3px" }}>{"{{first_name}}"}</code> and <code style={{ color: "var(--color-gold)", background: "var(--color-gold-subtle)", padding: "1px 4px", borderRadius: "3px" }}>{"{{last_name}}"}</code> in the subject or body — they are replaced per recipient.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
