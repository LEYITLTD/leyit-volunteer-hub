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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sign in failed");
      window.location.href = data.redirect ?? "/volunteer/dashboard";
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
        className="mb-8 h-24 w-auto object-contain"
        priority
      />

      <div
        className="w-full bg-card border border-card-border rounded-xl p-7"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h1 className="font-display text-[28px] font-semibold text-text-primary mb-1">
          Welcome back
        </h1>
        <p className="text-[14px] text-text-secondary mb-6">
          Sign in to VolunteerHub
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
            <p className="text-[13px] text-error bg-error-bg rounded-[var(--radius-md)] px-3 py-2">
              {error}
            </p>
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
        <p className="text-center mt-2">
          <Link
            href="/admin/overview"
            className="text-[12px] text-text-muted hover:text-text-secondary"
          >
            Admin login
          </Link>
        </p>
      </div>
    </div>
  );
}
