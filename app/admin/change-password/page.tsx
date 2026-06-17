"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleSubmit() {
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
      router.push("/admin/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update password");
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--color-gold-subtle)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="font-display text-[22px] font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
            Set your password
          </h1>
          <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            Choose a new password to access your account.
          </p>
        </div>

        <div className="rounded-xl border p-5 space-y-4" style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
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

          <Button variant="gold" fullWidth onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating…" : "Set password"}
          </Button>
        </div>
      </div>
    </div>
  );
}
