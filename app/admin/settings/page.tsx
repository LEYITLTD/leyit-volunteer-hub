"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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

function fmtDate(d: string | null) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
}

export default function SettingsPage() {
  const [admins,     setAdmins]     = useState<AdminUser[]>([]);
  const [teamLoad,   setTeamLoad]   = useState(true);
  const [modal,      setModal]      = useState(false);
  const [fullName,   setFullName]   = useState("");
  const [email,      setEmail]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState<string | null>(null);
  const [creds,      setCreds]      = useState<Creds | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then(r => r.json())
      .then(d => setAdmins(Array.isArray(d) ? d : []))
      .finally(() => setTeamLoad(false));
  }, []);

  function openModal()  { setFullName(""); setEmail(""); setFormError(null); setCreds(null); setModal(true); }
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

  return (
    <>
      <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
        <div className="mb-6">
          <h1 className="font-display text-[24px] sm:text-[28px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Settings</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Manage admin accounts and platform configuration.</p>
        </div>

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
      </div>

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
