import Link from "next/link";

export const metadata = {
  title: "FAQ — LUL Volunteer Hub",
};

const FAQS = [
  {
    q: "How do I become a volunteer?",
    a: "Simply create an account on the Volunteer website and complete the registration form with your personal details. You can also upload your DBS certificate if you have one.",
  },
  {
    q: "How long does approval take?",
    a: "Applications are usually reviewed within 24–48 hours. During this time, DBS and background checks are completed.",
  },
  {
    q: "Can I access the Volunteer Website immediately?",
    a: "Yes. Once registered, you can log in, but some features will remain locked until your application has been approved.",
  },
  {
    q: "How will I know if I have been approved?",
    a: "You will receive an email notification confirming your approval. You will then be able to apply for events and access all Volunteer website features.",
  },
  {
    q: "What happens if my application is unsuccessful?",
    a: "You will receive an email informing you that your application was not approved.",
  },
  {
    q: "Is a DBS certificate required?",
    a: "A DBS certificate is not mandatory; however, it is strongly recommended, as having one may make you eligible for additional responsibilities and higher-level volunteer roles.",
  },
  {
    q: "How do I sign up for events?",
    a: "Once approved, you can browse available events from your dashboard and register for the ones you wish to attend.",
  },
  {
    q: "What if an event is full?",
    a: "If capacity has been reached, you will automatically join the waiting list. If a space becomes available, you will receive a notification — you must then log in and actively claim the spot. Places are not automatically reserved.",
  },
  {
    q: "How will I receive my event details?",
    a: "You will receive a confirmation email along with your QR check-in code. Reminder emails may also be sent before the event.",
  },
  {
    q: "How do I check in on event day?",
    a: "Present your QR code upon arrival. It will be scanned to record your attendance and time log automatically.",
  },
  {
    q: "What happens if I can no longer attend?",
    a: "Please cancel your place as early as possible so another volunteer on the waiting list can be offered the opportunity.",
  },
  {
    q: "Will there be any training before events?",
    a: "Yes. Pre-event webinars, information packs, and WhatsApp groups will help you understand your role and prepare for the event.",
  },
  {
    q: "Can I ask questions before the event?",
    a: "Absolutely. Group chats will be available to answer questions regarding roles and event information.",
  },
  {
    q: "How do points work?",
    a: "Points are awarded for participation and additional contributions such as event attendance, arriving early, packaging sessions, post-event cleanup, social media contributions, and extra tasks assigned by team leaders.",
  },
  {
    q: "When are points added to my account?",
    a: "Usually after attendance and activity records have been verified.",
  },
  {
    q: "What if I forget my QR code?",
    a: "Contact the registration desk on the day.",
  },
  {
    q: "Will I receive a certificate?",
    a: "Yes. Volunteers who check in and attend events may automatically receive a Certificate of Appreciation.",
  },
  {
    q: "How do leadership opportunities work?",
    a: "Active volunteers who consistently contribute and earn points may be recognised and invited to become team leaders and help manage future events.",
  },
  {
    q: "How will I know if I've been promoted from the waitlist?",
    a: "You will receive an email notification as soon as a spot opens up. You must then log into the portal and actively claim your place — it is not reserved automatically.",
  },
  {
    q: "How can I volunteer again?",
    a: "Log into your dashboard and apply for future events.",
  },
  {
    q: "How can I contact the team?",
    a: "You can use the contact form inside the Volunteer website or speak to Volunteer Admins through the official WhatsApp groups.",
  },
];

export default function FaqPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EE" }}>
      {/* Gold bar */}
      <div style={{
        background: "linear-gradient(135deg, #C9A227, #A8854A)",
        padding: "0 24px",
        height: 5,
      }} />

      <div style={{ maxWidth: 740, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Back link */}
        <Link
          href="/volunteer/dashboard"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 13, color: "#A8854A", fontWeight: 600, marginBottom: 36,
            textDecoration: "none",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to dashboard
        </Link>

        {/* Title block */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A8854A", marginBottom: 10 }}>
            Light Upon Light · LUL Global Volunteers
          </p>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', 'Georgia', serif",
            fontSize: 42, fontWeight: 600, color: "#1C1917",
            lineHeight: 1.15, margin: "0 0 16px",
          }}>
            Frequently Asked Questions
          </h1>
          <p style={{ fontSize: 14, color: "#78716C", lineHeight: 1.7 }}>
            Everything you need to know about volunteering with Light Upon Light. Can&apos;t find your answer? Reach out to the volunteer team through the portal.
          </p>
        </div>

        {/* FAQ list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {FAQS.map((item, i) => (
            <details
              key={i}
              style={{
                borderTop: "1px solid #EAE6DD",
                padding: "0",
              }}
            >
              <summary style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "20px 0",
                cursor: "pointer",
                listStyle: "none",
                gap: 16,
                userSelect: "none",
              }}>
                <span style={{
                  fontSize: 15, fontWeight: 600, color: "#1C1917",
                  lineHeight: 1.4, flex: 1,
                }}>
                  {item.q}
                </span>
                <span style={{
                  flexShrink: 0,
                  width: 28, height: 28, borderRadius: "50%",
                  background: "#F3EFE6", border: "1px solid #E8E0D0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#A8854A", fontSize: 18, lineHeight: 1,
                  fontWeight: 300,
                }}>
                  +
                </span>
              </summary>
              <p style={{
                fontSize: 14, color: "#57534E", lineHeight: 1.75,
                margin: "0 0 20px", paddingRight: 44,
              }}>
                {item.a}
              </p>
            </details>
          ))}
          <div style={{ borderTop: "1px solid #EAE6DD" }} />
        </div>

        {/* Footer CTA */}
        <div style={{
          marginTop: 48, padding: "28px 32px", borderRadius: 14,
          background: "#fff", border: "1px solid #EAE6DD",
          textAlign: "center",
        }}>
          <p style={{
            fontFamily: "'Cormorant Garamond', 'Georgia', serif",
            fontSize: 22, fontWeight: 600, color: "#1C1917",
            margin: "0 0 8px",
          }}>
            Still have a question?
          </p>
          <p style={{ fontSize: 14, color: "#78716C", margin: "0 0 20px", lineHeight: 1.6 }}>
            If you need any further assistance, please contact the Volunteer Team through the portal. We look forward to welcoming you and working together to serve the community, Insha Allah.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/volunteer/dashboard"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 22px", borderRadius: 10,
                background: "linear-gradient(135deg, #C9A227, #A8854A)",
                color: "#fff", fontWeight: 600, fontSize: 14,
                textDecoration: "none",
              }}
            >
              Go to portal
            </Link>
            <Link
              href="/terms"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 22px", borderRadius: 10,
                border: "1px solid #E8E0D0",
                color: "#78716C", fontWeight: 600, fontSize: 14,
                textDecoration: "none",
              }}
            >
              Terms &amp; Conditions
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
