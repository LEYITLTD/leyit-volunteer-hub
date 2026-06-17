"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";

const OTP_LENGTH = 6;

function AdminVerifyForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSent, setResendSent] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusAt = useCallback((index: number) => {
    inputRefs.current[Math.min(Math.max(index, 0), OTP_LENGTH - 1)]?.focus();
  }, []);

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit) focusAt(index + 1);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else {
        focusAt(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      focusAt(index - 1);
    } else if (e.key === "ArrowRight") {
      focusAt(index + 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const raw = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!raw) return;
    const next = [...digits];
    raw.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    focusAt(Math.min(raw.length, OTP_LENGTH - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const otp = digits.join("");
    if (otp.length < OTP_LENGTH) {
      setError("Please enter all 6 digits");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      window.location.href = data.redirect ?? "/admin/overview";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email) return;
    setResending(true);
    setError(null);
    setResendSent(false);
    try {
      // Re-use admin login without password — UX: send user back to login to re-enter password
      window.location.href = `/admin-login`;
    } finally {
      setResending(false);
    }
  }

  const filled = digits.filter(Boolean).length;

  return (
    <div className="w-full max-w-[420px] flex flex-col items-center">
      <Image
        src="/assets/logo-gold.png"
        alt="Light Upon Light Global"
        width={120}
        height={96}
        className="mb-6 sm:mb-8 h-20 sm:h-24 w-auto object-contain"
        priority
      />

      <div
        className="w-full bg-card border border-card-border rounded-xl p-5 sm:p-8"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-gold-subtle flex items-center justify-center mb-5 text-[22px]">
          ✉️
        </div>

        <h1 className="font-display text-[26px] font-semibold text-text-primary mb-1">
          Check your email
        </h1>
        <p className="text-[14px] text-text-secondary mb-1">
          We sent a 6-digit code to
        </p>
        <p className="text-[14px] font-semibold text-text-primary mb-6 break-all">
          {email || "your email"}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* 6-digit OTP boxes */}
          <div
            className="flex gap-2 sm:gap-3 justify-between"
            onPaste={handlePaste}
          >
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                autoComplete={i === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
                className="
                  flex-1 min-w-0 aspect-square
                  text-center text-[22px] sm:text-[28px] font-semibold
                  border-2 rounded-[var(--radius-md)]
                  bg-[var(--color-input-bg)] text-text-primary
                  transition-[border-color,box-shadow]
                  focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20
                "
                style={{
                  borderColor: digit ? "var(--color-gold)" : "var(--color-input-border)",
                }}
              />
            ))}
          </div>

          {error && (
            <p className="text-[13px] text-error bg-error-bg rounded-[var(--radius-md)] px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="gold"
            fullWidth
            disabled={loading || filled < OTP_LENGTH}
          >
            {loading ? "Verifying…" : "Verify code"}
          </Button>
        </form>

        <div className="text-center mt-5 text-[13px] text-text-secondary">
          Didn't receive a code?{" "}
          <Link
            href="/admin-login"
            className="text-gold font-semibold hover:underline"
          >
            Try again
          </Link>
        </div>

        <p className="text-center mt-2 text-[12px] text-text-muted">
          Code expires in 5 minutes
        </p>
      </div>

      <p className="text-center mt-5">
        <Link href="/admin-login" className="text-[13px] text-text-muted hover:text-text-secondary">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function AdminVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-[420px] flex flex-col items-center">
          <div className="w-full bg-card border border-card-border rounded-xl p-8 text-center">
            <p className="text-text-muted text-[14px]">Loading…</p>
          </div>
        </div>
      }
    >
      <AdminVerifyForm />
    </Suspense>
  );
}
