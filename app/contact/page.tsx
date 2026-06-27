import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "@/components/ui/ContactForm";

export const metadata = {
  title: "Contact us — LUL Global Volunteers",
};

export default function ContactPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EE", display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 20px 80px" }}>
      <Image src="/assets/logo-gold.png" alt="LUL" width={110} height={88} className="h-20 w-auto object-contain" style={{ marginBottom: 28 }} />

      <div style={{ width: "100%", maxWidth: 520, background: "#fff", border: "1px solid #EAE6DD", borderRadius: 16, padding: "32px 28px", boxShadow: "var(--shadow-card)" }}>
        <p className="font-display" style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A8854A", marginBottom: 8 }}>
          LUL Global Volunteers
        </p>
        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 600, color: "#1C1917", margin: "0 0 8px" }}>
          Get in touch
        </h1>
        <p style={{ fontSize: 14, color: "#78716C", lineHeight: 1.6, margin: "0 0 22px" }}>
          Have a question — about volunteering, your application, or anything else? Send us a message and we&apos;ll reply by email. You don&apos;t need an account.
        </p>

        <ContactForm />

        <p style={{ textAlign: "center", marginTop: 20 }}>
          <Link href="/login" style={{ fontSize: 13, color: "#A8854A", fontWeight: 600, textDecoration: "none" }}>← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
