"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AddressAutocomplete, type AddressResult } from "@/components/ui/AddressAutocomplete";

type Step = 1 | 2 | 3;
const STEP_LABELS = ["Personal details", "Emergency & medical", "DBS certificate (optional)"];

const DIETARY_OPTIONS = [
  { value: "",                  label: "No requirements" },
  { value: "Vegetarian",        label: "Vegetarian" },
  { value: "Vegan",             label: "Vegan" },
  { value: "Gluten-free",       label: "Gluten-free" },
  { value: "Dairy-free",        label: "Dairy-free" },
  { value: "Nut allergy",       label: "Nut allergy" },
  { value: "Shellfish allergy", label: "Shellfish allergy" },
  { value: "Egg-free",          label: "Egg-free" },
  { value: "Other",             label: "Other" },
];

export default function RegisterPage() {
  const [step, setStep]     = useState<Step>(1);
  const [done, setDone]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
    phone: "", dateOfBirth: "", nationality: "United Kingdom",
    gender: "" as "male" | "female" | "",
    addressLine1: "", addressLine2: "", city: "", county: "", postcode: "",
    emergencyName: "", emergencyPhone: "",
    dietary: "", medical: "",
    ageConfirmed: false, privacyAccepted: false,
  });

  function fillAddress(result: AddressResult) {
    setForm((f) => ({
      ...f,
      addressLine1: result.line1,
      addressLine2: result.line2,
      city:         result.city,
      county:       result.county,
      postcode:     result.postcode,
    }));
  }

  const [dbsFile, setDbsFile]           = useState<File | null>(null);
  const [compressing, setCompressing]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function compressImage(file: File): Promise<File> {
    if (!file.type.startsWith("image/")) return file;
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX = 1800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const scale = MAX / Math.max(width, height);
          width  = Math.round(width  * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        const tryQuality = (qualities: number[]) => {
          const [q, ...rest] = qualities;
          canvas.toBlob(
            (blob) => {
              if (!blob) { resolve(file); return; }
              if (blob.size <= 2 * 1024 * 1024 || rest.length === 0) {
                resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
              } else {
                tryQuality(rest);
              }
            },
            "image/jpeg",
            q,
          );
        };
        tryQuality([0.85, 0.70, 0.55, 0.40]);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Please upload a PDF or image file (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10 MB.");
      return;
    }
    setError(null);
    if (file.type.startsWith("image/")) {
      setCompressing(true);
      const compressed = await compressImage(file);
      setCompressing(false);
      setDbsFile(compressed);
    } else {
      setDbsFile(file);
    }
  }

  function validateStep(): string | null {
    if (step === 1) {
      if (!form.firstName || !form.lastName)           return "Please enter your full name.";
      if (!form.email || !form.email.includes("@"))    return "Please enter a valid email address.";
      if (!form.phone)                                  return "Please enter a phone number.";
      if (!form.dateOfBirth)                            return "Please enter your date of birth.";
      const dob = new Date(form.dateOfBirth);
      const age = (new Date().getFullYear() - dob.getFullYear()) - (new Date() < new Date(new Date().getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      if (age < 16)                                     return "You must be 16 or older to register.";
      if (!form.gender)                                 return "Please select your gender.";
      if (!form.addressLine1)                            return "Please enter your address (line 1).";
      if (!form.city)                                    return "Please enter your city or town.";
      if (!form.postcode)                                return "Please enter your postcode.";
      if (!form.password || form.password.length < 8)  return "Password must be at least 8 characters.";
      if (form.password !== form.confirmPassword)       return "Passwords do not match.";
    }
    if (step === 2) {
      if (!form.emergencyName || !form.emergencyPhone) return "Please fill in emergency contact details.";
      if (!form.ageConfirmed)   return "You must confirm you are 16 or older.";
      if (!form.privacyAccepted) return "You must accept the privacy policy.";
    }
    // Step 3 (DBS) is optional — no validation required
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => (s + 1) as Step);
  }

  async function submit() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("firstName",       form.firstName);
      fd.append("lastName",        form.lastName);
      fd.append("email",           form.email);
      fd.append("password",        form.password);
      fd.append("confirmPassword", form.confirmPassword);
      fd.append("phone",           form.phone);
      fd.append("dateOfBirth",     form.dateOfBirth);
      fd.append("nationality",     form.nationality);
      fd.append("gender",           form.gender);
      fd.append("address", [form.addressLine1, form.addressLine2, form.city, form.county, form.postcode].filter(Boolean).join("\n"));
      fd.append("emergencyName",   form.emergencyName);
      fd.append("emergencyPhone",  form.emergencyPhone);
      fd.append("dietary",         form.dietary);
      fd.append("medical",         form.medical);
      fd.append("ageConfirmed",    String(form.ageConfirmed));
      fd.append("privacyAccepted", String(form.privacyAccepted));
      if (dbsFile) fd.append("dbsFile", dbsFile);

      const res = await fetch("/api/auth/register", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-[500px]">
        <div className="flex justify-center mb-6">
          <Image src="/assets/logo-gold.png" alt="LUL" width={100} height={70} className="h-[70px] w-auto" />
        </div>
        <div className="bg-card border border-card-border rounded-xl p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="w-[60px] h-[60px] rounded-full bg-success-bg flex items-center justify-center mx-auto mb-5" style={{ color: "var(--color-success)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="font-display text-[26px] font-semibold mb-2">Registration submitted</h2>
          <p className="text-[14px] text-text-secondary max-w-[380px] mx-auto mb-6">
            Your application is under review. We&apos;ll run a background check and be in touch once it&apos;s complete.
            {dbsFile && " Your DBS certificate has also been received."}
          </p>
          <Link href="/login" className="text-gold font-semibold text-[14px] hover:underline">
            ← Back to login
          </Link>
        </div>
      </div>
    );
  }

  const barBg = (s: Step) => step >= s ? "var(--color-gold)" : "var(--color-divider)";

  return (
    <div className="w-full max-w-[620px]">
      <div className="flex justify-center mb-6">
        <Image src="/assets/logo-gold.png" alt="LUL" width={100} height={70} className="h-[70px] w-auto" />
      </div>

      <div className="bg-card border border-card-border rounded-xl p-5 sm:p-8" style={{ boxShadow: "var(--shadow-card)" }}>
        {/* Stepper */}
        <div className="flex items-center gap-2 mb-7">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex-1 h-1 rounded-full transition-colors" style={{ background: barBg(s) }} />
          ))}
        </div>

        <div className="text-[11px] uppercase tracking-[0.1em] font-bold mb-1" style={{ color: "var(--color-gold)" }}>
          Step {step} of 3
        </div>
        <h2 className="font-display text-[24px] font-semibold mb-5">{STEP_LABELS[step - 1]}</h2>

        {/* ── Step 1: Personal details ── */}
        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input label="First name" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
            <Input label="Last name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
            <Input label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            <Input label="Phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
            <div className="flex flex-col gap-1">
              <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} required />
              {form.dateOfBirth && (() => {
                const dob = new Date(form.dateOfBirth);
                const age = (new Date().getFullYear() - dob.getFullYear()) - (new Date() < new Date(new Date().getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
                return age < 16 ? (
                  <p style={{ fontSize: 12, color: "var(--color-error)", fontWeight: 600, marginTop: 2 }}>
                    You must be 16 or older to register.
                  </p>
                ) : null;
              })()}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                Gender <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["male", "female"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => set("gender", g)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)] border text-[14px] font-medium transition-colors"
                    style={{
                      borderColor: form.gender === g ? "var(--color-gold)" : "var(--color-input-border)",
                      background:  form.gender === g ? "var(--color-gold-subtle)" : "var(--color-input-bg)",
                      color:       form.gender === g ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: form.gender === g ? "var(--color-gold)" : "var(--color-input-border)" }}
                    >
                      {form.gender === g && <span className="w-2 h-2 rounded-full" style={{ background: "var(--color-gold)" }} />}
                    </span>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">Nationality</label>
              <select
                value={form.nationality}
                onChange={(e) => set("nationality", e.target.value)}
                className="min-h-[44px] border rounded-[var(--radius-md)] px-3 py-3 text-[14px]"
                style={{ borderColor: "var(--color-input-border)", background: "var(--color-input-bg)", color: "var(--color-text-primary)" }}
              >
                <option>United Kingdom</option>
                <option>Other</option>
              </select>
            </div>
            <Input label="Password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} hint="Min 8 characters" required className="sm:col-span-2" />
            <Input label="Confirm password" type="password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} required className="sm:col-span-2" />

            {/* Address block */}
            <div className="sm:col-span-2 flex flex-col gap-3.5">
              <AddressAutocomplete onSelect={fillAddress} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Address line 1"
                  placeholder="House number & street"
                  value={form.addressLine1}
                  onChange={(e) => set("addressLine1", e.target.value)}
                  required
                  className="sm:col-span-2"
                />
                <Input
                  label="Address line 2"
                  placeholder="Flat, apartment, etc. (optional)"
                  value={form.addressLine2}
                  onChange={(e) => set("addressLine2", e.target.value)}
                  className="sm:col-span-2"
                />
                <Input
                  label="City / Town"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  required
                />
                <Input
                  label="County"
                  placeholder="Optional"
                  value={form.county}
                  onChange={(e) => set("county", e.target.value)}
                />
                <Input
                  label="Postcode"
                  value={form.postcode}
                  onChange={(e) => set("postcode", e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Emergency & medical ── */}
        {step === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input label="Emergency contact name" value={form.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} required />
            <Input label="Emergency contact phone" type="tel" value={form.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} required />
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                Dietary requirements
              </label>
              <select
                value={form.dietary}
                onChange={(e) => set("dietary", e.target.value)}
                className="min-h-[44px] border rounded-[var(--radius-md)] px-3 py-3 text-[14px]"
                style={{ borderColor: "var(--color-input-border)", background: "var(--color-input-bg)", color: "var(--color-text-primary)" }}
              >
                {DIETARY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                Medical information{" "}
                <span className="normal-case tracking-normal font-semibold" style={{ color: "var(--color-gold)" }}>· Admin-visible only</span>
              </label>
              <textarea
                value={form.medical}
                onChange={(e) => set("medical", e.target.value)}
                rows={3}
                className="border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] resize-y"
                style={{ borderColor: "var(--color-input-border)", background: "var(--color-input-bg)" }}
              />
            </div>
            <label className="sm:col-span-2 flex items-start gap-2.5 text-[13px] cursor-pointer" style={{ color: "var(--color-text-primary)" }}>
              <input type="checkbox" checked={form.ageConfirmed} onChange={(e) => set("ageConfirmed", e.target.checked)} className="mt-0.5 shrink-0" />
              I confirm I am 16 years of age or older.
            </label>
            <label className="sm:col-span-2 flex items-start gap-2.5 text-[13px] cursor-pointer" style={{ color: "var(--color-text-primary)" }}>
              <input type="checkbox" checked={form.privacyAccepted} onChange={(e) => set("privacyAccepted", e.target.checked)} className="mt-0.5 shrink-0" />
              <span>
                I have read and agree to the{" "}
                <a href="/terms" target="_blank" rel="noreferrer" style={{ color: "#A8854A", fontWeight: 600 }}>
                  Terms &amp; Conditions
                </a>
                {" "}and{" "}
                <a href="/faq" target="_blank" rel="noreferrer" style={{ color: "#A8854A", fontWeight: 600 }}>
                  FAQ
                </a>.
              </span>
            </label>
          </div>
        )}

        {/* ── Step 3: DBS certificate (optional) ── */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
              Uploading a DBS certificate is <strong style={{ color: "var(--color-text-primary)" }}>optional</strong> — you can do it now or any time after registering from your Documents section.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0] ?? null); }}
              className="w-full border-2 border-dashed rounded-xl p-8 text-center transition-colors"
              style={{
                borderColor: dbsFile ? "var(--color-gold)" : "var(--color-input-border)",
                background:  dbsFile ? "var(--color-gold-subtle)" : "var(--color-surface)",
              }}
            >
              {compressing ? (
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Compressing image…</p>
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Just a moment</p>
                </div>
              ) : dbsFile ? (
                <div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: "var(--color-gold-light)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>{dbsFile.name}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                    {dbsFile.size < 1024 * 1024
                      ? `${(dbsFile.size / 1024).toFixed(0)} KB`
                      : `${(dbsFile.size / (1024 * 1024)).toFixed(1)} MB`} · Click to change
                  </p>
                </div>
              ) : (
                <div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: "var(--color-gold-light)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Drop your DBS certificate here</p>
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>PDF or image · or click to browse</p>
                </div>
              )}
            </button>

            {dbsFile && (
              <button
                type="button"
                onClick={() => setDbsFile(null)}
                className="text-[12px] text-left"
                style={{ color: "var(--color-text-muted)" }}
              >
                × Remove file
              </button>
            )}
          </div>
        )}

        {error && (
          <p className="text-[13px] rounded-[var(--radius-md)] px-3 py-2 mt-4" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>
            {error}
          </p>
        )}

        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <Button variant="outline" onClick={() => { setError(null); setStep((s) => (s - 1) as Step); }}>
              ← Back
            </Button>
          ) : (
            <div />
          )}
          {step < 3 ? (
            <Button onClick={next}>Continue →</Button>
          ) : (
            <Button variant="gold" onClick={submit} disabled={loading || compressing}>
              {loading ? "Submitting…" : compressing ? "Compressing…" : "Complete registration"}
            </Button>
          )}
        </div>
      </div>

      <p className="text-center mt-5">
        <Link href="/login" className="text-[13px] hover:text-text-secondary" style={{ color: "var(--color-text-muted)" }}>
          ← Back to login
        </Link>
      </p>
    </div>
  );
}
