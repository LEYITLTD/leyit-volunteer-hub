"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// ── Types ─────────────────────────────────────────────────────────────────────

type AdminUser = {
  id:         string;
  first_name: string;
  last_name:  string;
  email:      string;
  role:       string;
  created_at: string;
  last_login: string | null;
};

type Creds = { email: string };

type Template = {
  key:       string;
  name:      string;
  subject:   string;
  body_html: string;
  updated_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
}

const VARIABLE_HINTS: Record<string, string[]> = {
  registration_dbs_uploaded:  ["{{first_name}}"],
  registration_dbs_required:  ["{{first_name}}"],
  dbs_rejected:               ["{{first_name}}", "{{reason}}"],
  application_approved:       ["{{first_name}}"],
  event_application_received: ["{{first_name}}", "{{event_name}}", "{{event_date}}", "{{event_time}}", "{{city}}", "{{role_name}}", "{{status_note}}"],
};

type Tab = "team" | "templates";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("team");

  // — Team state —
  const [admins,     setAdmins]     = useState<AdminUser[]>([]);
  const [teamLoad,   setTeamLoad]   = useState(true);
  const [modal,      setModal]      = useState(false);
  const [fullName,   setFullName]   = useState("");
  const [email,      setEmail]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState<string | null>(null);
  const [creds,      setCreds]      = useState<Creds | null>(null);

  // — Templates state —
  const [templates,  setTemplates]  = useState<Template[]>([]);
  const [tmplLoad,   setTmplLoad]   = useState(false);
  const [tmplFetched,setTmplFetched]= useState(false);
  const [editing,    setEditing]    = useState<string | null>(null);
  const [drafts,     setDrafts]     = useState<Record<string, { subject: string; body_html: string }>>({});
  const [saving,     setSaving]     = useState<string | null>(null);
  const [savedKey,   setSavedKey]   = useState<string | null>(null);
  const [tmplError,  setTmplError]  = useState<string | null>(null);
  const [preview,    setPreview]    = useState<string | null>(null);

  // Load team on mount
  useEffect(() => {
    fetch("/api/admin/users")
      .then(r => r.json())
      .then(d => setAdmins(Array.isArray(d) ? d : []))
      .finally(() => setTeamLoad(false));
  }, []);

  // Load templates lazily when switching to that tab
  useEffect(() => {
    if (tab !== "templates" || tmplFetched) return;
    setTmplLoad(true);
    fetch("/api/admin/email-templates")
      .then(r => r.json())
      .then(data => {
        setTemplates(data);
        const d: Record<string, { subject: string; body_html: string }> = {};
        data.forEach((t: Template) => { d[t.key] = { subject: t.subject, body_html: t.body_html }; });
        setDrafts(d);
        setTmplFetched(true);
      })
      .finally(() => setTmplLoad(false));
  }, [tab, tmplFetched]);

  // — Team handlers —
  function openModal() { setFullName(""); setEmail(""); setFormError(null); setCreds(null); setModal(true); }
  function closeModal() { setModal(false); setCreds(null); }

  async function handleSubmit() {
    if (!fullName.trim()) { setFormError("Full name is required."); return; }
    if (!email.trim())    { setFormError("Email address is required."); return; }
    setFormError(null);
    setSubmitting(true);
    try {
      const res  = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), full_name: fullName.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create account");
      setCreds({ email: data.email });
      const parts = fullName.trim().split(" ");
      setAdmins(a => [...a, { id: data.id, first_name: parts[0], last_name: parts.slice(1).join(" ") || "", email: data.email, role: "admin", created_at: new Date().toISOString(), last_login: null }]);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  }

  // — Template handlers —
  async function saveTmpl(key: string) {
    setSaving(key); setTmplError(null);
    try {
      const res  = await fetch(`/api/admin/email-templates/${key}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(drafts[key]) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTemplates(ts => ts.map(t => t.key === key ? { ...t, ...data } : t));
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2500);
      setEditing(null);
    } catch (err) {
      setTmplError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  function cancelTmpl(key: string) {
    const orig = templates.find(t => t.key === key);
    if (orig) setDrafts(d => ({ ...d, [key]: { subject: orig.subject, body_html: orig.body_html } }));
    setEditing(null); setTmplError(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string }[] = [
    { id: "team",      label: "Team" },
    { id: "templates", label: "Email Templates" },
  ];

  return (
    <>
      <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-[24px] sm:text-[28px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Settings</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Manage admin accounts and platform configuration.</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: "var(--color-card)", border: "1px solid var(--color-card-border)" }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-md text-[13px] font-semibold transition-all"
              style={{
                background: tab === t.id ? "var(--color-gold-subtle)" : "transparent",
                color:      tab === t.id ? "var(--color-gold)" : "var(--color-text-muted)",
                border:     tab === t.id ? "1px solid var(--color-gold)" : "1px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Team tab ── */}
        {tab === "team" && (
          <div className="rounded-xl border overflow-hidden" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--color-card-border)" }}>
              <div>
                <h2 className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Admin team</h2>
                {!teamLoad && <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{admins.length} admin{admins.length !== 1 ? "s" : ""}</p>}
              </div>
              <button onClick={openModal} className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-lg" style={{ background: "var(--color-gold)", color: "#1A1411" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add admin
              </button>
            </div>

            {teamLoad ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
              </div>
            ) : admins.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>No admin accounts found.</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--color-card-border)" }}>
                {admins.map(admin => (
                  <div key={admin.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{admin.first_name} {admin.last_name}</p>
                      <p className="text-[12px] truncate" style={{ color: "var(--color-text-muted)" }}>{admin.email}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] uppercase tracking-[0.06em] mb-0.5" style={{ color: "var(--color-text-muted)" }}>Last sign in</p>
                      <p className="text-[11px] tabular-nums" style={{ color: "var(--color-text-secondary)" }}>{fmtDate(admin.last_login)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Email Templates tab ── */}
        {tab === "templates" && (
          <div>
            <p className="text-[14px] mb-5" style={{ color: "var(--color-text-secondary)" }}>
              Edit the subject and HTML body of each transactional email. Use the variable hints to insert dynamic content.
            </p>

            {tmplError && (
              <div className="mb-4 px-4 py-3 rounded-xl text-[13px]" style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}>{tmplError}</div>
            )}

            {tmplLoad ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {templates.map(t => {
                  const isEditing = editing  === t.key;
                  const isSaving  = saving   === t.key;
                  const wasSaved  = savedKey === t.key;
                  const draft     = drafts[t.key] ?? { subject: t.subject, body_html: t.body_html };
                  const hints     = VARIABLE_HINTS[t.key] ?? [];

                  return (
                    <div key={t.key} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-card-border)", background: "var(--color-card)" }}>
                      <div className="flex flex-col gap-2 px-4 sm:px-5 py-3 sm:py-4 sm:flex-row sm:items-center sm:justify-between" style={{ background: "var(--color-card-header-bg)", borderBottom: `1px solid var(--color-card-border)` }}>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>{t.name}</p>
                          <p className="text-[11px] font-mono mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>{t.key}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {wasSaved && <span className="text-[12px] font-medium" style={{ color: "var(--color-success)" }}>Saved ✓</span>}
                          {!isEditing && (
                            <>
                              <button onClick={() => setPreview(preview === t.key ? null : t.key)} className="text-[12px] sm:text-[13px] px-2.5 sm:px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--color-card-border)", color: "var(--color-text-secondary)" }}>
                                {preview === t.key ? "Hide" : "Preview"}
                              </button>
                              <button onClick={() => setEditing(t.key)} className="text-[12px] sm:text-[13px] px-2.5 sm:px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--color-gold)", color: "var(--color-gold)", background: "var(--color-gold-subtle)" }}>
                                Edit
                              </button>
                            </>
                          )}
                          {isEditing && (
                            <>
                              <button onClick={() => cancelTmpl(t.key)} className="text-[12px] sm:text-[13px] px-2.5 sm:px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--color-card-border)", color: "var(--color-text-secondary)" }}>Cancel</button>
                              <Button variant="gold" onClick={() => saveTmpl(t.key)} disabled={isSaving}>{isSaving ? "Saving…" : "Save"}</Button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 flex flex-col gap-4">
                        {hints.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {hints.map(h => <span key={h} className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: "var(--color-gold-subtle)", color: "var(--color-gold)" }}>{h}</span>)}
                          </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--color-text-secondary)" }}>Subject</label>
                          {isEditing ? (
                            <input value={draft.subject} onChange={e => setDrafts(d => ({ ...d, [t.key]: { ...d[t.key], subject: e.target.value } }))} className="border rounded-[var(--radius-md)] px-3 py-2 text-[14px]" style={{ borderColor: "var(--color-input-border)", background: "var(--color-input-bg)", color: "var(--color-text-primary)" }} />
                          ) : (
                            <p className="text-[14px]" style={{ color: "var(--color-text-primary)" }}>{t.subject}</p>
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--color-text-secondary)" }}>Body HTML</label>
                          {isEditing ? (
                            <textarea value={draft.body_html} onChange={e => setDrafts(d => ({ ...d, [t.key]: { ...d[t.key], body_html: e.target.value } }))} rows={14} className="border rounded-[var(--radius-md)] px-3 py-2.5 text-[12px] font-mono resize-y" style={{ borderColor: "var(--color-input-border)", background: "var(--color-input-bg)", color: "var(--color-text-primary)" }} />
                          ) : (
                            <p className="text-[12px] font-mono truncate" style={{ color: "var(--color-text-muted)" }}>{t.body_html.slice(0, 120)}…</p>
                          )}
                        </div>

                        {preview === t.key && !isEditing && (
                          <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-card-border)" }}>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] px-4 py-2.5 border-b" style={{ color: "var(--color-text-muted)", borderColor: "var(--color-card-border)", background: "var(--color-card-header-bg)" }}>Rendered preview</p>
                            <iframe srcDoc={t.body_html.replace("{{first_name}}", "Jane").replace("{{reason}}", "The certificate you uploaded has expired.")} className="w-full border-0" style={{ height: "340px" }} title="Email preview" />
                          </div>
                        )}

                        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Last updated: {new Date(t.updated_at).toLocaleString("en-GB", { timeZone: "Europe/London" })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add admin modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="w-full max-w-[400px] rounded-2xl border p-6" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
            {creds ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#1A2E1A" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7DE882" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h2 className="text-[16px] font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>Account created</h2>
                <p className="text-[13px] leading-relaxed mb-1" style={{ color: "var(--color-text-secondary)" }}>Login details have been emailed to</p>
                <p className="text-[13px] font-medium mb-5" style={{ color: "var(--color-gold)" }}>{creds.email}</p>
                <p className="text-[11px] leading-relaxed mb-6" style={{ color: "var(--color-text-muted)" }}>They'll be asked to set a new password when they first sign in.</p>
                <Button variant="gold" fullWidth onClick={closeModal}>Done</Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Add admin</h2>
                  <button onClick={closeModal} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "var(--color-text-secondary)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div className="space-y-4 mb-4">
                  <Input label="Full name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Khadijah Khan" />
                  <Input label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. k.khan@emanchannel.tv" />
                </div>
                {formError && <p className="text-[12px] rounded-lg px-3 py-2.5 mb-4" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>{formError}</p>}
                <p className="text-[11px] mb-4 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>A temporary password will be generated automatically. The user must change it on first login.</p>
                <div className="flex gap-3">
                  <button onClick={closeModal} className="flex-1 text-[13px] py-2.5 rounded-lg font-semibold" style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-card-border)" }}>Cancel</button>
                  <Button variant="gold" onClick={handleSubmit} disabled={submitting} className="flex-1">{submitting ? "Creating…" : "Create account"}</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
