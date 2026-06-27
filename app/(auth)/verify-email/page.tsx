"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Status = "loading" | "verified" | "expired" | "invalid";

function VerifyInner() {
  const params = useSearchParams();
  const token  = params.get("token");

  const [status, setStatus] = useState<Status>(token ? "loading" : "invalid");
  const [email, setEmail]   = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/auth/verify-email", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(d => {
        setEmail(d.email ?? null);
        setStatus(d.status === "verified" ? "verified" : d.status === "expired" ? "expired" : "invalid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  async function resend() {
    setResendMsg(null);
    await fetch("/api/auth/resend-verification", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setResendMsg("If your email needs verifying, we've sent a fresh link.");
  }

  const icon = status === "verified"
    ? { bg: "var(--color-gold-subtle)", color: "var(--color-gold)", path: <polyline points="20 6 9 17 4 12" /> }
    : { bg: "var(--color-warning-bg)", color: "var(--color-warning)", path: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></> };

  return (
    <div className="w-full max-w-[440px] flex flex-col items-center">
      <Image src="/assets/logo-gold.png" alt="LUL" width={110} height={88} className="mb-6 h-20 w-auto object-contain" priority />
      <div className="w-full bg-card border border-card-border rounded-xl p-7 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        {status === "loading" ? (
          <div className="py-6 flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
            <p className="text-[13px] text-text-muted">Verifying your email…</p>
          </div>
        ) : (
          <>
            <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: icon.bg, color: icon.color }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{icon.path}</svg>
            </div>

            {status === "verified" && (
              <>
                <h1 className="font-display text-[24px] font-semibold mb-2">Email verified</h1>
                <p className="text-[14px] text-text-secondary mb-6">Thanks — your email address is confirmed. You can now sign in to your account.</p>
                <Link href="/login" className="inline-block w-full text-[14px] font-semibold rounded-lg px-4 py-3" style={{ background: "var(--color-gold)", color: "#1A1714" }}>
                  Go to login
                </Link>
              </>
            )}

            {status === "expired" && (
              <>
                <h1 className="font-display text-[24px] font-semibold mb-2">This link has expired</h1>
                <p className="text-[14px] text-text-secondary mb-6">Verification links are valid for 1 hour. Request a fresh one below{email ? <> — we&apos;ll send it to <strong className="text-text-primary">{email}</strong></> : null}.</p>
                {resendMsg
                  ? <p className="text-[13px] text-success mb-4">{resendMsg}</p>
                  : <button onClick={resend} className="w-full text-[14px] font-semibold rounded-lg px-4 py-3 mb-4" style={{ background: "var(--color-gold)", color: "#1A1714" }}>Resend verification email</button>}
                <Link href="/login" className="text-[13px] text-text-muted hover:text-text-secondary">← Back to login</Link>
              </>
            )}

            {status === "invalid" && (
              <>
                <h1 className="font-display text-[24px] font-semibold mb-2">Link not valid</h1>
                <p className="text-[14px] text-text-secondary mb-6">This verification link isn&apos;t valid. It may have already been used. Try signing in — if your email still needs verifying, you can resend the link from there.</p>
                <Link href="/login" className="inline-block w-full text-[14px] font-semibold rounded-lg px-4 py-3" style={{ background: "var(--color-gold)", color: "#1A1714" }}>
                  Go to login
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />}>
      <VerifyInner />
    </Suspense>
  );
}
