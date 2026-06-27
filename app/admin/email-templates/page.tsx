"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Template = {
  key:        string;
  name:       string;
  subject:    string;
  body_html:  string;
  updated_at: string | null;
};

/* ─── Toolbar button ─────────────────────────────────────────────────────── */

function ToolBtn({
  active, disabled, onClick, title, children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 30, height: 30, borderRadius: 6, border: "none", cursor: disabled ? "default" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? "#F3EFE6" : "transparent",
        color: active ? "#A8854A" : "#44403C",
        opacity: disabled ? 0.35 : 1,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 20, background: "#E5E1DA", margin: "0 2px", flexShrink: 0 }} />;
}

/* ─── Toolbar ────────────────────────────────────────────────────────────── */

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url  = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
      padding: "8px 10px", borderBottom: "1px solid #EAE6DD",
      background: "#FAF7F1", borderRadius: "10px 10px 0 0",
    }}>
      {/* History */}
      <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M3 13C6.6 8.5 11 7 16 9s6 5 5 9"/></svg>
      </ToolBtn>
      <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M21 13C17.4 8.5 13 7 8 9S2 14 3 18"/></svg>
      </ToolBtn>

      <Divider />

      {/* Text style */}
      <ToolBtn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
      </ToolBtn>
      <ToolBtn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
      </ToolBtn>
      <ToolBtn title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
      </ToolBtn>
      <ToolBtn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"/><path d="M17.5 5.5C16.5 4 14.5 3 12 3c-3.3 0-5.5 1.9-5.5 4.5C6.5 9 7 10 8 11"/><path d="M6.5 18.5C7.5 20 9.5 21 12 21c3.3 0 5.5-1.9 5.5-4.5 0-1-.5-2-1.5-3"/></svg>
      </ToolBtn>

      <Divider />

      {/* Headings */}
      <ToolBtn title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <span style={{ fontSize: 11, fontWeight: 700 }}>H1</span>
      </ToolBtn>
      <ToolBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <span style={{ fontSize: 11, fontWeight: 700 }}>H2</span>
      </ToolBtn>
      <ToolBtn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <span style={{ fontSize: 11, fontWeight: 700 }}>H3</span>
      </ToolBtn>

      <Divider />

      {/* Lists */}
      <ToolBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>
      </ToolBtn>
      <ToolBtn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1.5"/></svg>
      </ToolBtn>
      <ToolBtn title="Block quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
      </ToolBtn>

      <Divider />

      {/* Alignment */}
      <ToolBtn title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
      </ToolBtn>
      <ToolBtn title="Align centre" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
      </ToolBtn>
      <ToolBtn title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
      </ToolBtn>

      <Divider />

      {/* Link */}
      <ToolBtn title="Insert/edit link" active={editor.isActive("link")} onClick={setLink}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </ToolBtn>
      <ToolBtn title="Remove link" disabled={!editor.isActive("link")} onClick={() => editor.chain().focus().unsetLink().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="4" y1="4" x2="20" y2="20"/></svg>
      </ToolBtn>

      <Divider />

      {/* Horizontal rule */}
      <ToolBtn title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/></svg>
      </ToolBtn>
    </div>
  );
}

/* ─── Rich text editor ───────────────────────────────────────────────────── */

function RichEditor({
  content,
  onChange,
}: {
  content:  string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Write your email body here…" }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        style: "outline:none; min-height:260px; padding:16px 18px; font-size:14px; line-height:1.75; color:#1C1917; font-family:inherit;",
      },
    },
  }, []);

  // Sync external content changes (switching templates)
  const prevContent = useRef(content);
  useEffect(() => {
    if (!editor) return;
    if (content !== prevContent.current && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
    prevContent.current = content;
  }, [content, editor]);

  return (
    <div style={{ border: "1px solid #EAE6DD", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

/* ─── Tags ───────────────────────────────────────────────────────────────── */

const ALL_TAGS = [
  { tag: "{{first_name}}",  label: "First name" },
  { tag: "{{last_name}}",   label: "Last name" },
  { tag: "{{event_name}}",  label: "Event name" },
  { tag: "{{event_date}}",  label: "Event date" },
  { tag: "{{event_time}}",  label: "Event time" },
  { tag: "{{city}}",        label: "City" },
  { tag: "{{role_name}}",   label: "Role name" },
  { tag: "{{status_note}}", label: "Status note" },
  { tag: "{{reason}}",      label: "Reason" },
  { tag: "{{email}}",       label: "Email address" },
  { tag: "{{password}}",    label: "Temp password" },
];

function applyPreviewTags(html: string) {
  return html
    .replaceAll("{{first_name}}",  "Ahmed")
    .replaceAll("{{last_name}}",   "Hassan")
    .replaceAll("{{event_name}}",  "Eman Channel Live 2025")
    .replaceAll("{{event_date}}",  "Saturday, 14 June 2025")
    .replaceAll("{{event_time}}",  "09:00 – 17:00")
    .replaceAll("{{city}}",        "London")
    .replaceAll("{{role_name}}",   "Registration Desk")
    .replaceAll("{{status_note}}", "Your spot is confirmed — we look forward to seeing you there!")
    .replaceAll("{{reason}}",      "The certificate you uploaded has expired.")
    .replaceAll("{{email}}",       "a.hassan@example.com")
    .replaceAll("{{password}}",    "Xk7mP9wQ2!");
}

/* ─── Template categories ────────────────────────────────────────────────── */

const TEMPLATE_CATEGORIES: { label: string; keys: string[] }[] = [
  { label: "Registration",   keys: ["email_verification", "registration_dbs_uploaded", "registration_dbs_required"] },
  { label: "Events",         keys: ["event_application_received", "application_approved"] },
  { label: "Waitlist",       keys: ["waitlist_spot_available", "volunteer_cancelled"] },
  { label: "Compliance",     keys: ["volunteer_rejected", "dbs_rejected"] },
  { label: "Certificates",   keys: ["certificate_sent"] },
  { label: "Admin",          keys: ["admin_account_created"] },
];

/* ─── Main page ──────────────────────────────────────────────────────────── */

export default function EmailTemplatesPage() {
  const [templates,    setTemplates]    = useState<Template[]>([]);
  const [selected,     setSelected]     = useState<Template | null>(null);
  const [subject,      setSubject]      = useState("");
  const [bodyHtml,     setBodyHtml]     = useState("");
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState<string | null>(null);
  const [testing,      setTesting]      = useState(false);
  const [testMsg,      setTestMsg]      = useState<string | null>(null);
  const [tab,          setTab]          = useState<"edit" | "preview">("edit");
  const [loading,      setLoading]      = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/email-templates");
    const data: Template[] = await res.json();
    setTemplates(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function select(t: Template) {
    setSelected(t);
    setSubject(t.subject);
    setBodyHtml(t.body_html);
    setSaveMsg(null);
    setTestMsg(null);
    setTab("edit");
  }

  async function save() {
    if (!selected) return;
    setSaving(true); setSaveMsg(null);
    try {
      const res = await fetch(`/api/admin/email-templates/${selected.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body_html: bodyHtml }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSaveMsg("Saved");
      setTemplates(prev => prev.map(t => t.key === selected.key ? { ...t, subject, body_html: bodyHtml, updated_at: data.updated_at } : t));
      setSelected(s => s ? { ...s, subject, body_html: bodyHtml } : s);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); setTimeout(() => setSaveMsg(null), 3000); }
  }

  async function sendTest() {
    if (!selected) return;
    setTesting(true); setTestMsg(null);
    try {
      const res = await fetch("/api/admin/email-templates/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body_html: bodyHtml }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTestMsg("Test email sent to your inbox");
    } catch (e) {
      setTestMsg(e instanceof Error ? e.message : "Failed to send");
    } finally { setTesting(false); setTimeout(() => setTestMsg(null), 4000); }
  }

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0, flex: 1 }}>

      {/* ── Template list sidebar ── */}
      <div style={{
        width: 260, flexShrink: 0, borderRight: "1px solid #EAE6DD",
        overflowY: "auto", padding: "20px 12px",
        background: "#FAF7F1",
      }}>
        <p style={{
          fontSize: 10.5, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.08em", color: "#A8A29E", marginBottom: 10, paddingLeft: 4,
        }}>
          Templates
        </p>
        {loading ? (
          <p style={{ fontSize: 13, color: "#A8A29E", paddingLeft: 4 }}>Loading…</p>
        ) : (() => {
          const byKey = Object.fromEntries(templates.map(t => [t.key, t]));
          const categorised = new Set<string>();

          return (
            <>
              {TEMPLATE_CATEGORIES.map(cat => {
                const catTemplates = cat.keys.map(k => byKey[k]).filter(Boolean);
                if (catTemplates.length === 0) return null;
                catTemplates.forEach(t => categorised.add(t.key));
                return (
                  <div key={cat.label} style={{ marginBottom: 12 }}>
                    <p style={{
                      fontSize: 9.5, fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.1em", color: "#C4BCAF", marginBottom: 4, paddingLeft: 4,
                    }}>
                      {cat.label}
                    </p>
                    {catTemplates.map(t => (
                      <button
                        key={t.key}
                        onClick={() => select(t)}
                        style={{
                          width: "100%", textAlign: "left", padding: "10px 12px",
                          borderRadius: 9, border: "none", cursor: "pointer", marginBottom: 2,
                          background: selected?.key === t.key ? "#fff" : "transparent",
                          boxShadow: selected?.key === t.key ? "0 1px 3px rgba(0,0,0,0.07)" : "none",
                          outline: selected?.key === t.key ? "1px solid #EAE6DD" : "none",
                        }}
                      >
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1C1917", lineHeight: 1.3 }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: "#A8A29E", marginTop: 1 }}>
                          {t.updated_at ? `Updated ${new Date(t.updated_at).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}` : "Not yet saved"}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}

              {/* Uncategorised (safety net) */}
              {templates.filter(t => !categorised.has(t.key)).map(t => (
                <button
                  key={t.key}
                  onClick={() => select(t)}
                  style={{
                    width: "100%", textAlign: "left", padding: "10px 12px",
                    borderRadius: 9, border: "none", cursor: "pointer", marginBottom: 2,
                    background: selected?.key === t.key ? "#fff" : "transparent",
                    boxShadow: selected?.key === t.key ? "0 1px 3px rgba(0,0,0,0.07)" : "none",
                    outline: selected?.key === t.key ? "1px solid #EAE6DD" : "none",
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1C1917", lineHeight: 1.3 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "#A8A29E", marginTop: 1 }}>
                    {t.updated_at ? `Updated ${new Date(t.updated_at).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}` : "Not yet saved"}
                  </div>
                </button>
              ))}
            </>
          );
        })()}
      </div>

      {/* ── Editor pane ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", minWidth: 0 }}>
        {!selected ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: "#A8A29E" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>
            </svg>
            <p style={{ fontSize: 14, fontWeight: 500 }}>Select a template to edit</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1C1917", margin: 0, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
                  {selected.name}
                </h1>
                <p style={{ fontSize: 13, color: "#78716C", marginTop: 4 }}>
                  Key: <code style={{ background: "#F3EFE6", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>{selected.key}</code>
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                {/* Test email */}
                <button
                  onClick={sendTest}
                  disabled={testing}
                  style={{
                    border: "1px solid #D9D2C5", background: "#fff", color: "#44403C",
                    borderRadius: 9, padding: "9px 16px", fontSize: 13,
                    fontWeight: 600, cursor: testing ? "default" : "pointer",
                    opacity: testing ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  {testing ? "Sending…" : "Send test"}
                </button>
                {/* Save */}
                <button
                  onClick={save}
                  disabled={saving}
                  style={{
                    background: "#1A1714", color: "#fff", border: "none",
                    borderRadius: 9, padding: "9px 20px", fontSize: 13,
                    fontWeight: 600, cursor: saving ? "default" : "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            {/* Status messages */}
            {saveMsg && (
              <div style={{
                marginBottom: 14, padding: "9px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: saveMsg === "Saved" ? "#DCFCE7" : "#FEE2E2",
                color:      saveMsg === "Saved" ? "#15803D"  : "#DC2626",
              }}>
                {saveMsg}
              </div>
            )}
            {testMsg && (
              <div style={{
                marginBottom: 14, padding: "9px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: testMsg.startsWith("Test email") ? "#DBEAFE" : "#FEE2E2",
                color:      testMsg.startsWith("Test email") ? "#1D4ED8" : "#DC2626",
              }}>
                {testMsg}
              </div>
            )}

            {/* Subject */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.07em", color: "#78716C", marginBottom: 6,
              }}>
                Subject line
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                style={{
                  width: "100%", border: "1px solid #D9D2C5", borderRadius: 9,
                  padding: "10px 13px", fontSize: 14, color: "#1C1917",
                  background: "#fff", boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            {/* Edit / Preview tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {(["edit", "preview"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "6px 16px", borderRadius: 7, border: "none", cursor: "pointer",
                    background: tab === t ? "#1A1714" : "transparent",
                    color:      tab === t ? "#fff"    : "#78716C",
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  {t === "edit" ? "Edit" : "Preview"}
                </button>
              ))}
            </div>

            {/* Editor */}
            {tab === "edit" && (
              <>
                <RichEditor content={bodyHtml} onChange={setBodyHtml} />

                {/* Template tags */}
                <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#A8A29E", marginBottom: 8 }}>
                    Insert variable tag
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {ALL_TAGS.map(({ tag, label }) => (
                      <button
                        key={tag}
                        onClick={() => {
                          // Insert tag at cursor position via direct HTML concat if no selection
                          // TipTap insertContent handles this properly
                          const el = document.querySelector(".ProseMirror") as HTMLElement | null;
                          if (el) el.focus();
                          // We trigger onChange by appending the tag into current body
                          setBodyHtml(h => h + tag);
                        }}
                        style={{
                          border: "1px solid #D9D2C5", background: "#FAF7F1",
                          color: "#7A6A4A", borderRadius: 6, padding: "4px 10px",
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                          fontFamily: "monospace",
                        }}
                      >
                        {tag}
                        <span style={{ fontFamily: "inherit", color: "#A8A29E", marginLeft: 5, fontWeight: 400 }}>— {label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Preview */}
            {tab === "preview" && (
              <div style={{ border: "1px solid #EAE6DD", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #EAE6DD", background: "#FAF7F1", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#A8A29E" }}>Preview</span>
                  <span style={{ fontSize: 12, color: "#78716C" }}>— sample values: Ahmed Hassan, Eman Channel Live</span>
                </div>
                <iframe
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;font-size:14px;line-height:1.7;color:#1C1917;padding:20px 28px;max-width:580px;margin:0 auto}a{color:#A8854A}h1,h2,h3{font-family:'Georgia',serif}hr{border:none;border-top:1px solid #EAE6DD;margin:20px 0}</style></head><body>${applyPreviewTags(bodyHtml)}</body></html>`}
                  style={{ width: "100%", border: "none", minHeight: 400 }}
                  title="Email preview"
                  onLoad={e => {
                    const iframe = e.target as HTMLIFrameElement;
                    if (iframe.contentDocument?.body) {
                      iframe.style.height = iframe.contentDocument.body.scrollHeight + 40 + "px";
                    }
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
