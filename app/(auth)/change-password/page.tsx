"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [done,     setDone]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm)  { setError("Passwords do not match."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update password");
      setDone(true);
      setTimeout(() => router.push("/admin/overview"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update password");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[400px] flex flex-col items-center">
      <Image
        src="/assets/logo-gold.png"
        alt="LUL Global Volunteers"
        width={100}
        height={80}
        className="mb-6 h-16 w-auto object-contain"
        priority
      />

      <div className="w-full rounded-xl border p-6 space-y-5" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
        <div className="text-center">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--color-gold-subtle)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="text-[20px] font-bold tracking-tight mb-1" style={{ color: "var(--color-text-primary)" }}>
            Set your password
          </h1>
          <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            Choose a secure password for your admin account.
          </p>
        </div>

        {done ? (
          <div className="text-center py-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "#1A2E1A" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7DE882" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Password updated</p>
            <p className="text-[12px] mt-1" style={{ color: "var(--color-text-muted)" }}>Taking you to the dashboard…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
            <Input
              label="Confirm password"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
            />

            {error && (
              <p className="text-[12px] rounded-lg px-3 py-2.5" style={{ color: "var(--color-error)", background: "var(--color-error-bg)" }}>
                {error}
              </p>
            )}

            <Button variant="gold" fullWidth disabled={loading}>
              {loading ? "Updating…" : "Set password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
