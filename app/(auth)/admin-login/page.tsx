"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sign in failed");
      if (data.status === "otp_required") {
        window.location.href = `/admin-verify?email=${encodeURIComponent(email)}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
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
        <div className="inline-flex items-center gap-1.5 bg-gold-subtle text-gold text-[11px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full mb-4">
          Admin portal
        </div>
        <h1 className="font-display text-[28px] font-semibold text-text-primary mb-1">
          Admin sign in
        </h1>
        <p className="text-[14px] text-text-secondary mb-6">
          A verification code will be sent to your email.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="you@lul.org"
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
            <p className="text-[13px] text-error bg-error-bg rounded-[var(--radius-md)] px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" variant="gold" fullWidth disabled={loading}>
            {loading ? "Sending code…" : "Continue →"}
          </Button>
        </form>
      </div>

      <p className="text-center mt-5">
        <Link href="/login" className="text-[13px] text-text-muted hover:text-text-secondary">
          ← Volunteer login
        </Link>
      </p>
    </div>
  );
}
