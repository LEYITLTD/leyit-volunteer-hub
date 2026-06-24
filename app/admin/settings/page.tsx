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
type Role  = { id: string; name: string; description: string | null };
type PointsConfig = {
  check_in_points: number; check_in_late_points: number;
  check_out_points: number; check_out_early_points: number; grace_minutes: number;
};
type Tier = { id: string; name: string; min_points: number };

const CONFIG_LABELS: { key: keyof PointsConfig; label: string; hint: string }[] = [
  { key: "check_in_points",        label: "Check-in (on time)",   hint: "Signing in before/at the event start" },
  { key: "check_in_late_points",   label: "Check-in (late)",      hint: "Signing in after the event start" },
  { key: "check_out_points",       label: "Check-out (full)",     hint: "Signing out at/after the event end" },
  { key: "check_out_early_points", label: "Check-out (early)",    hint: "Leaving before the event ends" },
  { key: "grace_minutes",          label: "Grace window (mins)",  hint: "Minutes either side that still count as on time" },
];

function fmtDate(d: string | null) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
}

export default function SettingsPage() {
  /* ── Admin team ───────────────────────────────────────── */
  const [admins,     setAdmins]     = useState<AdminUser[]>([]);
  const [teamLoad,   setTeamLoad]   = useState(true);
  const [modal,      setModal]      = useState(false);
  const [fullName,   setFullName]   = useState("");
  const [email,      setEmail]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState<string | null>(null);
  const [creds,      setCreds]      = useState<Creds | null>(null);

  /* ── Roles catalog ────────────────────────────────────── */
  const [roles,         setRoles]         = useState<Role[]>([]);
  const [rolesLoad,     setRolesLoad]     = useState(true);
  const [roleModal,     setRoleModal]     = useState(false);
  const [editingRole,   setEditingRole]   = useState<Role | null>(null);
  const [roleName,      setRoleName]      = useState("");
  const [roleDesc,      setRoleDesc]      = useState("");
  const [roleSubmitting,setRoleSubmitting]= useState(false);
  const [roleError,     setRoleError]     = useState<string | null>(null);

  /* ── Points engine ────────────────────────────────────── */
  const [cfg,         setCfg]         = useState<PointsConfig | null>(null);
  const [tiers,       setTiers]       = useState<Tier[]>([]);
  const [pointsLoad,  setPointsLoad]  = useState(true);
  const [pointsSaving,setPointsSaving]= useState(false);
  const [pointsMsg,   setPointsMsg]   = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/users").then(r => r.json()).then(d => setAdmins(Array.isArray(d) ? d : [])).finally(() => setTeamLoad(false));
    fetch("/api/admin/roles").then(r => r.json()).then(d => setRoles(Array.isArray(d) ? d : [])).finally(() => setRolesLoad(false));
    fetch("/api/admin/points-config").then(r => r.json()).then(d => { setCfg(d.config ?? null); setTiers(Array.isArray(d.tiers) ? d.tiers : []); }).finally(() => setPointsLoad(false));
  }, []);

  /* Admin handlers */
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

  /* Role handlers */
  function openRoleModal(role?: Role) {
    setEditingRole(role ?? null);
    setRoleName(role?.name ?? "");
    setRoleDesc(role?.description ?? "");
    setRoleError(null);
    setRoleModal(true);
  }
  async function saveRole() {
    if (!roleName.trim()) { setRoleError("Role name is required."); return; }
    setRoleError(null);
    setRoleSubmitting(true);
    try {
      const url    = editingRole ? `/api/admin/roles/${editingRole.id}` : "/api/admin/roles";
      const method = editingRole ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: roleName.trim(), description: roleDesc.trim() }) });
      const data   = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save role");
      setRoles(rs => editingRole ? rs.map(r => r.id === data.id ? data : r) : [...rs, data].sort((a, b) => a.name.localeCompare(b.name)));
      setRoleModal(false);
    } catch (e) {
      setRoleError(e instanceof Error ? e.message : "Failed to save role");
    } finally {
      setRoleSubmitting(false);
    }
  }
  async function deleteRole(role: Role) {
    if (!window.confirm(`Remove “${role.name}” from the role list? Existing events keep their roles.`)) return;
    setRoles(rs => rs.filter(r => r.id !== role.id));
    await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" }).catch(() => {});
  }

  /* Points handlers */
  function setCfgField(key: keyof PointsConfig, value: string) {
    setCfg(c => c ? { ...c, [key]: value === "" ? 0 : Math.max(0, parseInt(value) || 0) } : c);
  }
  function setTierMin(id: string, value: string) {
    setTiers(ts => ts.map(t => t.id === id ? { ...t, min_points: value === "" ? 0 : Math.max(0, parseInt(value) || 0) } : t));
  }
  async function savePoints() {
    if (!cfg) return;
    setPointsSaving(true);
    setPointsMsg(null);
    try {
      const res = await fetch("/api/admin/points-config", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: cfg, tiers: tiers.map(t => ({ id: t.id, min_points: t.min_points })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setCfg(data.config ?? cfg);
      setTiers(Array.isArray(data.tiers) ? data.tiers : tiers);
      setPointsMsg({ type: "ok", text: "Saved." });
    } catch (e) {
      setPointsMsg({ type: "err", text: e instanceof Error ? e.message : "Failed to save" });
    } finally {
      setPointsSaving(false);
    }
  }

  const numCls = "w-full min-h-[44px] border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2";
  const numSty = { borderColor: "var(--color-input-border)", background: "var(--color-input-bg)", color: "var(--color-text-primary)" };

  return (
    <>
      <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full space-y-6">
        <div>
          <h1 className="font-display text-[24px] sm:text-[28px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Settings</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Manage admin accounts, volunteer roles, and the points engine.</p>
        </div>

        {/* ── Admin team ─────────────────────────────────── */}
        <div className="rounded-xl border overflow-hidden" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--color-card-border)" }}>
            <div>
              <h2 className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Admin team</h2>
              {!teamLoad && <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{admins.length} admin{admins.length !== 1 ? "s" : ""}</p>}
            </div>
            <button onClick={openModal} className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-lg" style={{ background: "var(--color-gold)", color: "#1A1411" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add admin
            </button>
          </div>

          {teamLoad ? (
            <div className="flex items-center justify-center py-10"><div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} /></div>
          ) : admins.length === 0 ? (
            <div className="px-5 py-10 text-center"><p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>No admin accounts found.</p></div>
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

        {/* ── Volunteer roles ────────────────────────────── */}
        <div className="rounded-xl border overflow-hidden" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--color-card-border)" }}>
            <div>
              <h2 className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Volunteer roles</h2>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Roles &amp; explanations shown to volunteers when they apply.</p>
            </div>
            <button onClick={() => openRoleModal()} className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-lg" style={{ background: "var(--color-gold)", color: "#1A1411" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add role
            </button>
          </div>

          {rolesLoad ? (
            <div className="flex items-center justify-center py-10"><div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} /></div>
          ) : roles.length === 0 ? (
            <div className="px-5 py-10 text-center"><p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>No roles yet. Add one to use it when creating events.</p></div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--color-card-border)" }}>
              {roles.map(role => (
                <div key={role.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium" style={{ color: "var(--color-text-primary)" }}>{role.name}</p>
                    <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{role.description || "No explanation yet."}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openRoleModal(role)} className="text-[12px] font-semibold px-2.5 py-1.5 rounded-lg" style={{ color: "var(--color-gold)", background: "var(--color-gold-subtle)" }}>Edit</button>
                    <button onClick={() => deleteRole(role)} className="text-[12px] font-semibold px-2.5 py-1.5 rounded-lg" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Points & tiers ─────────────────────────────── */}
        <div className="rounded-xl border overflow-hidden" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-card-border)" }}>
            <h2 className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Points &amp; tiers</h2>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>How attendance points are earned and the tier thresholds.</p>
          </div>

          {pointsLoad || !cfg ? (
            <div className="flex items-center justify-center py-10"><div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} /></div>
          ) : (
            <div className="p-5 space-y-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: "var(--color-text-muted)" }}>Points awarded</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CONFIG_LABELS.map(({ key, label, hint }) => (
                    <div key={key} className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium" style={{ color: "var(--color-text-primary)" }}>{label}</label>
                      <input type="number" min="0" value={cfg[key]} onChange={e => setCfgField(key, e.target.value)} className={numCls} style={numSty} />
                      <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{hint}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: "var(--color-text-muted)" }}>Tier thresholds (minimum points)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {tiers.map(t => (
                    <div key={t.id} className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium" style={{ color: "var(--color-text-primary)" }}>{t.name}</label>
                      <input type="number" min="0" value={t.min_points} onChange={e => setTierMin(t.id, e.target.value)} className={numCls} style={numSty} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="gold" onClick={savePoints} disabled={pointsSaving}>{pointsSaving ? "Saving…" : "Save changes"}</Button>
                {pointsMsg && (
                  <span className="text-[12px] font-medium" style={{ color: pointsMsg.type === "ok" ? "var(--color-success)" : "var(--color-error)" }}>{pointsMsg.text}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add admin modal ──────────────────────────────── */}
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
                <p className="text-[11px] leading-relaxed mb-6" style={{ color: "var(--color-text-muted)" }}>They&apos;ll be asked to set a new password when they first sign in.</p>
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

      {/* ── Role modal ───────────────────────────────────── */}
      {roleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={e => { if (e.target === e.currentTarget) setRoleModal(false); }}>
          <div className="w-full max-w-[440px] rounded-2xl border p-6" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>{editingRole ? "Edit role" : "Add role"}</h2>
              <button onClick={() => setRoleModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "var(--color-text-secondary)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="space-y-4 mb-4">
              <Input label="Role name" value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="e.g. Welcome Team" />
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--color-text-secondary)" }}>Explanation <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(shown to volunteers)</span></label>
                <textarea value={roleDesc} onChange={e => setRoleDesc(e.target.value)} rows={4} placeholder="Describe what this role involves so volunteers know what they're signing up for…"
                  className="w-full border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] resize-none focus:outline-none focus:ring-2"
                  style={{ borderColor: "var(--color-input-border)", background: "var(--color-input-bg)", color: "var(--color-text-primary)", lineHeight: 1.6 }} />
              </div>
            </div>
            {roleError && <p className="text-[12px] rounded-lg px-3 py-2.5 mb-4" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>{roleError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setRoleModal(false)} className="flex-1 text-[13px] py-2.5 rounded-lg font-semibold" style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-card-border)" }}>Cancel</button>
              <Button variant="gold" onClick={saveRole} disabled={roleSubmitting} className="flex-1">{roleSubmitting ? "Saving…" : editingRole ? "Save role" : "Add role"}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
