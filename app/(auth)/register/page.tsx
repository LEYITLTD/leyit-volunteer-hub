"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Step = 1 | 2 | 3;

const STEP_LABELS = ["Personal details", "Emergency & medical", "DBS certificate"];

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(1);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
    phone: "", dateOfBirth: "", nationality: "United Kingdom", address: "",
    emergencyName: "", emergencyPhone: "",
    dietary: "", medical: "",
    ageConfirmed: false, privacyAccepted: false,
  });

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
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
          <div
            className="w-[60px] h-[60px] rounded-full bg-success-bg text-success flex items-center justify-center text-[28px] mx-auto mb-5 animate-pop"
          >
            ✓
          </div>
          <h2 className="font-display text-[26px] font-semibold mb-2">Registration submitted</h2>
          <p className="text-[14px] text-text-secondary max-w-[380px] mx-auto mb-6">
            We'll review your DBS certificate and be in touch shortly. Welcome to the family.
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

      <div className="bg-card border border-card-border rounded-xl p-8" style={{ boxShadow: "var(--shadow-card)" }}>
        {/* Stepper */}
        <div className="flex items-center gap-2 mb-7">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex-1 h-1 rounded-full" style={{ background: barBg(s) }} />
          ))}
        </div>

        <div className="text-[11px] uppercase tracking-[0.1em] text-gold font-bold mb-1">
          Step {step} of 3
        </div>
        <h2 className="font-display text-[24px] font-semibold mb-5">{STEP_LABELS[step - 1]}</h2>

        {step === 1 && (
          <div className="grid grid-cols-2 gap-3.5">
            <Input label="First name" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
            <Input label="Last name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
            <Input label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            <Input label="Phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
            <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">Nationality</label>
              <select
                value={form.nationality}
                onChange={(e) => set("nationality", e.target.value)}
                className="border border-input-border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] bg-[var(--color-input-bg)] text-text-primary"
              >
                <option>United Kingdom</option>
                <option>Other</option>
              </select>
            </div>
            <Input label="Password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} hint="Min 8 characters" required className="col-span-2" />
            <Input label="Confirm password" type="password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} required className="col-span-2" />
            <Input label="Address" value={form.address} onChange={(e) => set("address", e.target.value)} required className="col-span-2" />
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-2 gap-3.5">
            <Input label="Emergency contact name" value={form.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} required />
            <Input label="Emergency contact phone" type="tel" value={form.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} required />
            <Input label="Dietary requirements" value={form.dietary} onChange={(e) => set("dietary", e.target.value)} className="col-span-2" />
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                Medical information{" "}
                <span className="normal-case tracking-normal font-semibold text-gold">· Admin-visible only</span>
              </label>
              <textarea
                value={form.medical}
                onChange={(e) => set("medical", e.target.value)}
                rows={3}
                className="border border-input-border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] bg-[var(--color-input-bg)] resize-y"
              />
            </div>
            <label className="col-span-2 flex items-start gap-2.5 text-[13px] text-text-primary cursor-pointer">
              <input type="checkbox" checked={form.ageConfirmed} onChange={(e) => set("ageConfirmed", e.target.checked)} className="mt-0.5" />
              I confirm I am 16 years of age or older.
            </label>
            <label className="col-span-2 flex items-start gap-2.5 text-[13px] text-text-primary cursor-pointer">
              <input type="checkbox" checked={form.privacyAccepted} onChange={(e) => set("privacyAccepted", e.target.checked)} className="mt-0.5" />
              I have read and accept the privacy policy.
            </label>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="border-2 border-dashed border-input-border rounded-xl p-10 text-center bg-surface">
              <div className="w-[46px] h-[46px] rounded-xl bg-gold-light text-gold flex items-center justify-center mx-auto mb-3 text-[22px]">
                ⬆
              </div>
              <div className="text-[14px] font-semibold text-text-primary">Drop your DBS certificate here</div>
              <div className="text-[13px] text-text-secondary mt-1">PDF or image · or click to browse</div>
            </div>
            <p className="text-[13px] text-text-secondary mt-3.5 text-center">
              You can also upload this later from your profile.{" "}
              <button onClick={submit} className="text-gold font-semibold cursor-pointer hover:underline">
                Skip for now
              </button>
            </p>
          </div>
        )}

        {error && (
          <p className="text-[13px] text-error bg-error-bg rounded-[var(--radius-md)] px-3 py-2 mt-4">
            {error}
          </p>
        )}

        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep((s) => (s - 1) as Step)}>
              ← Back
            </Button>
          ) : (
            <div />
          )}
          {step < 3 ? (
            <Button onClick={() => setStep((s) => (s + 1) as Step)}>Continue →</Button>
          ) : (
            <Button variant="gold" onClick={submit} disabled={loading}>
              {loading ? "Submitting…" : "Complete registration"}
            </Button>
          )}
        </div>
      </div>

      <p className="text-center mt-5">
        <Link href="/login" className="text-[13px] text-text-muted hover:text-text-secondary">
          ← Back to login
        </Link>
      </p>
    </div>
  );
}
