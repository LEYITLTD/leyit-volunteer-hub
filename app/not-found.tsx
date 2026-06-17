import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#F7F4EE",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: "400px", width: "100%", textAlign: "center" }}>
        <p
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#EAE6DD",
            margin: "0 0 4px",
            lineHeight: 1,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
          }}
        >
          404
        </p>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "#1C1917",
            margin: "0 0 8px",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
          }}
        >
          Page not found
        </h1>
        <p style={{ fontSize: 14, color: "#78716C", lineHeight: 1.6, margin: "0 0 28px" }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
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
            textDecoration: "none",
          }}
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
