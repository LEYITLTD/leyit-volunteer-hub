"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type Template = {
  key: string;
  name: string;
  subject: string;
  body_html: string;
  updated_at: string;
};

const VARIABLE_HINTS: Record<string, string[]> = {
  registration_dbs_uploaded: ["{{first_name}}"],
  registration_dbs_required: ["{{first_name}}"],
  dbs_rejected:              ["{{first_name}}", "{{reason}}"],
  application_approved:      ["{{first_name}}"],
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing]     = useState<string | null>(null);
  const [drafts, setDrafts]       = useState<Record<string, { subject: string; body_html: string }>>({});
  const [saving, setSaving]       = useState<string | null>(null);
  const [saved, setSaved]         = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [preview, setPreview]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/email-templates")
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data);
        const d: Record<string, { subject: string; body_html: string }> = {};
        data.forEach((t: Template) => { d[t.key] = { subject: t.subject, body_html: t.body_html }; });
        setDrafts(d);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(key: string) {
    setSaving(key);
    setError(null);
    try {
      const res = await fetch(`/api/admin/email-templates/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(drafts[key]),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTemplates((ts) => ts.map((t) => t.key === key ? { ...t, ...data } : t));
      setSaved(key);
      setTimeout(() => setSaved(null), 2500);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  function cancel(key: string) {
    const original = templates.find((t) => t.key === key);
    if (original) setDrafts((d) => ({ ...d, [key]: { subject: original.subject, body_html: original.body_html } }));
    setEditing(null);
    setError(null);
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center flex-1">
        <p className="text-text-secondary text-[14px]">Loading templates…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-[26px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Email templates</h1>
        <p className="text-[14px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Edit the subject and HTML body of each transactional email. Use the variable hints to insert dynamic content.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-[13px]" style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {templates.map((t) => {
          const isEditing = editing === t.key;
          const isSaving  = saving  === t.key;
          const wasSaved  = saved   === t.key;
          const draft     = drafts[t.key] ?? { subject: t.subject, body_html: t.body_html };
          const hints     = VARIABLE_HINTS[t.key] ?? [];

          return (
            <div
              key={t.key}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: "var(--color-card-border)", background: "var(--color-card)" }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ background: "var(--color-card-header-bg)", borderBottom: `1px solid var(--color-card-border)` }}
              >
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>{t.name}</p>
                  <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--color-text-muted)" }}>{t.key}</p>
                </div>
                <div className="flex items-center gap-2">
                  {wasSaved && (
                    <span className="text-[12px] font-medium" style={{ color: "var(--color-success)" }}>Saved ✓</span>
                  )}
                  {!isEditing && (
                    <>
                      <button
                        onClick={() => setPreview(preview === t.key ? null : t.key)}
                        className="text-[13px] px-3 py-1.5 rounded-lg border transition-colors"
                        style={{ borderColor: "var(--color-card-border)", color: "var(--color-text-secondary)" }}
                      >
                        {preview === t.key ? "Hide preview" : "Preview"}
                      </button>
                      <button
                        onClick={() => setEditing(t.key)}
                        className="text-[13px] px-3 py-1.5 rounded-lg border transition-colors"
                        style={{ borderColor: "var(--color-gold)", color: "var(--color-gold)", background: "var(--color-gold-subtle)" }}
                      >
                        Edit
                      </button>
                    </>
                  )}
                  {isEditing && (
                    <>
                      <button onClick={() => cancel(t.key)} className="text-[13px] px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--color-card-border)", color: "var(--color-text-secondary)" }}>
                        Cancel
                      </button>
                      <Button variant="gold" onClick={() => save(t.key)} disabled={isSaving}>
                        {isSaving ? "Saving…" : "Save"}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex flex-col gap-4">
                {/* Variable hints */}
                {hints.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {hints.map((h) => (
                      <span key={h} className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: "var(--color-gold-subtle)", color: "var(--color-gold)" }}>
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                {/* Subject */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--color-text-secondary)" }}>
                    Subject
                  </label>
                  {isEditing ? (
                    <input
                      value={draft.subject}
                      onChange={(e) => setDrafts((d) => ({ ...d, [t.key]: { ...d[t.key], subject: e.target.value } }))}
                      className="border rounded-[var(--radius-md)] px-3 py-2 text-[14px]"
                      style={{ borderColor: "var(--color-input-border)", background: "var(--color-input-bg)", color: "var(--color-text-primary)" }}
                    />
                  ) : (
                    <p className="text-[14px]" style={{ color: "var(--color-text-primary)" }}>{t.subject}</p>
                  )}
                </div>

                {/* Body HTML */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--color-text-secondary)" }}>
                    Body HTML
                  </label>
                  {isEditing ? (
                    <textarea
                      value={draft.body_html}
                      onChange={(e) => setDrafts((d) => ({ ...d, [t.key]: { ...d[t.key], body_html: e.target.value } }))}
                      rows={14}
                      className="border rounded-[var(--radius-md)] px-3 py-2.5 text-[12px] font-mono resize-y"
                      style={{ borderColor: "var(--color-input-border)", background: "var(--color-input-bg)", color: "var(--color-text-primary)" }}
                    />
                  ) : (
                    <p className="text-[12px] font-mono truncate" style={{ color: "var(--color-text-muted)" }}>
                      {t.body_html.slice(0, 120)}…
                    </p>
                  )}
                </div>

                {/* Preview panel */}
                {preview === t.key && !isEditing && (
                  <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-card-border)" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] px-4 py-2.5 border-b" style={{ color: "var(--color-text-muted)", borderColor: "var(--color-card-border)", background: "var(--color-card-header-bg)" }}>
                      Rendered preview
                    </p>
                    <iframe
                      srcDoc={t.body_html.replace("{{first_name}}", "Jane").replace("{{reason}}", "The certificate you uploaded has expired.")}
                      className="w-full border-0"
                      style={{ height: "340px" }}
                      title="Email preview"
                    />
                  </div>
                )}

                <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                  Last updated: {new Date(t.updated_at).toLocaleString("en-GB")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
