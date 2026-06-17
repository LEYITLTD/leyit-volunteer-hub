"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#1A1714" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          {/* Logo */}
          <img
            src="/assets/logo-gold.png"
            alt="Light Upon Light Global"
            style={{ width: 48, height: 48, objectFit: "contain", marginBottom: 20 }}
          />

          <div style={{ maxWidth: "380px", width: "100%", textAlign: "center" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "#2E1A1A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#E57373" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h1
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: "#F3E9D2",
                margin: "0 0 10px",
                fontFamily: "'Georgia', serif",
              }}
            >
              Something went wrong
            </h1>
            <p style={{ fontSize: 14, color: "#9E9690", lineHeight: 1.7, margin: "0 0 6px" }}>
              Please try again later.
            </p>
            <p style={{ fontSize: 14, color: "#9E9690", lineHeight: 1.7, margin: 0 }}>
              If the problem persists, contact{" "}
              <a
                href="mailto:admin@emanchannel.tv"
                style={{ color: "#A8854A", textDecoration: "none" }}
              >
                admin@emanchannel.tv
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
