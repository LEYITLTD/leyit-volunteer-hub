"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnverified(false);
    setResendMsg(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "email_unverified") { setUnverified(true); setError(data.error ?? "Please verify your email first."); return; }
        throw new Error(data.error ?? "Sign in failed");
      }
      window.location.href = data.redirect ?? "/volunteer/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setResendMsg(null);
    await fetch("/api/auth/resend-verification", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setResendMsg("If your email needs verifying, we've sent a fresh link to your inbox.");
  }

  return (
    <div className="w-full max-w-[400px] flex flex-col items-center">
      <Image
        src="/assets/logo-gold.png"
        alt="Light Upon Light Global"
        width={120}
        height={96}
        className="mb-6 sm:mb-8 h-20 sm:h-24 w-auto object-contain"
        priority
      />

      <div
        className="w-full bg-card border border-card-border rounded-xl p-5 sm:p-7"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h1 className="font-display text-[28px] font-semibold text-text-primary mb-1">
          Welcome back
        </h1>
        <p className="text-[14px] text-text-secondary mb-6">
          Sign in to LUL Global Volunteers
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <div className="text-[13px] rounded-[var(--radius-md)] px-3 py-2" style={{ color: unverified ? "var(--color-warning)" : "var(--color-error)", background: unverified ? "var(--color-warning-bg)" : "var(--color-error-bg)" }}>
              <p>{error}</p>
              {unverified && (
                resendMsg
                  ? <p className="mt-1.5 font-medium" style={{ color: "var(--color-success)" }}>{resendMsg}</p>
                  : <button type="button" onClick={resendVerification} className="mt-1.5 font-semibold underline" style={{ color: "var(--color-gold)" }}>
                      Resend verification email
                    </button>
              )}
            </div>
          )}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-center mt-5 text-[13px] text-text-secondary">
          New volunteer?{" "}
          <Link
            href="/register"
            className="text-gold font-semibold hover:underline"
          >
            Register here
          </Link>
        </p>
        <p className="text-center mt-2 flex items-center justify-center gap-3">
          <Link
            href="/contact"
            className="text-[12px] text-text-muted hover:text-text-secondary"
          >
            Contact us
          </Link>
          <span className="text-text-muted">·</span>
          <Link
            href="/admin-login"
            className="text-[12px] text-text-muted hover:text-text-secondary"
          >
            Admin login
          </Link>
        </p>
      </div>
    </div>
  );
}
