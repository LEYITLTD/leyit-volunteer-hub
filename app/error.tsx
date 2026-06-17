"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F7F4EE" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div style={{ maxWidth: "400px", width: "100%", textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "#2E1A1A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E57373" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: "#1C1917",
                margin: "0 0 8px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
              }}
            >
              Something went wrong
            </h1>
            <p style={{ fontSize: 14, color: "#78716C", lineHeight: 1.6, margin: "0 0 24px" }}>
              An unexpected error occurred. Please try again — if it keeps happening, contact{" "}
              <a href="mailto:volunteers@leyit.dev" style={{ color: "#A8854A" }}>
                volunteers@leyit.dev
              </a>
            </p>
            <button
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 24px",
                borderRadius: 10,
                background: "#A8854A",
                color: "#1A1411",
                fontWeight: 600,
                fontSize: 13,
                border: "none",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
