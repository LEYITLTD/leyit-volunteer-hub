import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions — LUL Volunteer Hub",
};

const SECTIONS = [
  {
    number: "1",
    title: "Eligibility",
    body: "Volunteers must be at least 16 years old. Volunteers under 18 may require parental consent. All applicants are subject to approval and may be required to undergo DBS and/or LSEG background checks where appropriate.",
  },
  {
    number: "2",
    title: "Application and Approval",
    body: "Submission of a volunteer application does not guarantee acceptance. LUL reserves the right to accept or decline any application at its discretion. Approval may take up to 48 hours and is subject to compliance checks.",
  },
  {
    number: "3",
    title: "Code of Conduct",
    body: "Volunteers are expected to conduct themselves in a professional, respectful, and Islamic manner; treat attendees, speakers, fellow volunteers, and staff with courtesy and kindness; follow instructions given by team leaders and event management; and refrain from abusive, discriminatory, or inappropriate behaviour.",
  },
  {
    number: "4",
    title: "Attendance and Commitment",
    body: "Volunteers must attend their allocated shifts punctually. If unable to attend, volunteers should notify the team as soon as possible. Repeated absences or late cancellations may affect eligibility for future volunteering opportunities.",
  },
  {
    number: "5",
    title: "Event Roles",
    body: "Role allocations are made according to operational requirements and may be changed at any time. Volunteers may be reassigned to different duties if necessary.",
  },
  {
    number: "6",
    title: "Health and Safety",
    body: "Volunteers must comply with all health and safety instructions. Any accidents, injuries, or concerns should be reported immediately to a team leader. Volunteers participate at their own risk and should ensure they are medically fit to carry out their assigned duties.",
  },
  {
    number: "7",
    title: "Safeguarding",
    body: "Volunteers must adhere to all safeguarding policies and procedures. Any concerns relating to vulnerable individuals, children, or safeguarding matters must be reported immediately.",
  },
  {
    number: "8",
    title: "Photography and Media",
    body: "Photographs and videos may be taken during events for promotional and archival purposes. By volunteering, you consent to the use of your image, voice, or likeness in LUL media unless you notify the team otherwise.",
  },
  {
    number: "9",
    title: "Data Protection",
    body: "Personal information provided during registration will be stored securely and used solely for volunteer management and communication purposes. Information will be handled in accordance with applicable data protection laws.",
  },
  {
    number: "10",
    title: "WhatsApp and Communications",
    body: "Volunteers may be added to official WhatsApp groups or channels for event-related communication. Volunteers are expected to maintain appropriate conduct within these groups.",
  },
  {
    number: "11",
    title: "Rewards and Recognition",
    body: "Points, certificates, rewards, and leadership opportunities are discretionary and may be amended or withdrawn without prior notice. Rewards do not constitute employment or financial compensation.",
  },
  {
    number: "12",
    title: "Expenses",
    body: "Unless expressly agreed beforehand, volunteers are responsible for their own travel, valuables, and personal expenses.",
  },
  {
    number: "13",
    title: "Confidentiality",
    body: "Volunteers must not disclose confidential or sensitive information relating to attendees, speakers, staff, or event operations.",
  },
  {
    number: "14",
    title: "Removal from Volunteering",
    body: "LUL reserves the right to suspend or remove a volunteer from an event or future opportunities for breach of these terms, misconduct or inappropriate behaviour, failure to follow instructions, safeguarding concerns, or providing false information during registration.",
  },
  {
    number: "15",
    title: "Non-Employment",
    body: "Volunteering with Light Upon Light (LUL) does not create an employment relationship. Volunteers are not employees and are not entitled to wages or employee benefits.",
  },
  {
    number: "16",
    title: "Amendments",
    body: "Light Upon Light reserves the right to update these Terms & Conditions at any time. Continued participation constitutes acceptance of any revised terms.",
  },
  {
    number: "17",
    title: "Communications",
    body: "By registering as a volunteer, you consent to Light Upon Light (LUL) contacting you regarding volunteer opportunities, event information, training sessions, updates, and other relevant communications via email, SMS, telephone, WhatsApp, or other communication channels.",
  },
];

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EE" }}>
      {/* Header bar */}
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
            Terms &amp; Conditions
          </h1>
          <p style={{ fontSize: 14, color: "#78716C", lineHeight: 1.7 }}>
            By registering as a volunteer for a Light Upon Light (LUL) event, you agree to the following terms and conditions. Please read them carefully before completing your registration.
          </p>
          <div style={{
            marginTop: 20, padding: "12px 16px", borderRadius: 10,
            background: "#FEF9C3", border: "1px solid #FDE68A",
            fontSize: 13, color: "#92400E",
          }}>
            By registering as a volunteer, you acknowledge that you have read, understood, and agree to these Terms &amp; Conditions.
          </div>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {SECTIONS.map((s, i) => (
            <div
              key={s.number}
              style={{
                padding: "24px 0",
                borderTop: i > 0 ? "1px solid #EAE6DD" : "none",
                display: "grid",
                gridTemplateColumns: "44px 1fr",
                gap: "0 20px",
                alignItems: "start",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, #C9A227, #A8854A)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "#fff",
                flexShrink: 0, marginTop: 2,
              }}>
                {s.number}
              </div>
              <div>
                <h2 style={{
                  fontSize: 16, fontWeight: 700, color: "#1C1917",
                  margin: "0 0 8px", lineHeight: 1.3,
                }}>
                  {s.title}
                </h2>
                <p style={{ fontSize: 14, color: "#57534E", lineHeight: 1.75, margin: 0 }}>
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{
          marginTop: 48, padding: "24px 28px", borderRadius: 14,
          background: "#fff", border: "1px solid #EAE6DD",
          textAlign: "center",
        }}>
          <p style={{ fontSize: 14, color: "#57534E", lineHeight: 1.7, margin: 0 }}>
            Have questions about these terms?{" "}
            <Link href="/faq" style={{ color: "#A8854A", fontWeight: 600, textDecoration: "none" }}>
              Read our FAQ
            </Link>{" "}
            or contact the volunteer team through the portal.
          </p>
        </div>

      </div>
    </div>
  );
}
