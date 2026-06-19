"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";

type Volunteer = {
  id:         string;
  first_name: string;
  last_name:  string;
};

const BASE_URL = "https://volunteer-hub-nine.vercel.app";

export default function QrCodePage() {
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/volunteer/me")
      .then(r => r.json())
      .then(d => setVolunteer(d?.volunteer ?? null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!volunteer) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>Unable to load your profile.</p>
      </div>
    );
  }

  const checkInUrl = `${BASE_URL}/checkin/${volunteer.id}`;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
      <div className="mb-6">
        <h1 className="font-display text-[24px] sm:text-[28px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
          My QR Code
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          Show this to the event coordinator to check in
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 max-w-sm mx-auto">
        {/* QR card */}
        <div
          className="w-full rounded-2xl border p-6 sm:p-8 flex flex-col items-center gap-6"
          style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}
        >
          {/* Name */}
          <div className="text-center">
            <p className="text-[20px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {volunteer.first_name} {volunteer.last_name}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              LUL Global Volunteer
            </p>
          </div>

          {/* QR code */}
          <div
            className="p-5 rounded-2xl"
            style={{ background: "#FFFFFF" }}
          >
            <QRCode
              value={checkInUrl}
              size={220}
              bgColor="#FFFFFF"
              fgColor="#1A1714"
              level="M"
            />
          </div>

          {/* Gold divider + label */}
          <div className="w-full flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--color-card-border)" }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--color-gold)" }}>
              Volunteer ID
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--color-card-border)" }} />
          </div>

          {/* ID string */}
          <div
            className="w-full rounded-xl px-4 py-3 text-center"
            style={{ background: "var(--color-bg)", border: "1px solid var(--color-card-border)" }}
          >
            <p className="text-[11px] font-mono tracking-wider break-all" style={{ color: "var(--color-text-secondary)" }}>
              {volunteer.id}
            </p>
          </div>
        </div>

        {/* Instruction */}
        <div
          className="w-full rounded-xl p-4 text-center text-[13px] leading-relaxed"
          style={{ background: "var(--color-gold-subtle)", border: "1px solid var(--color-gold)", color: "var(--color-gold)" }}
        >
          Have this ready at the event entrance. The coordinator will scan it to record your attendance.
        </div>
      </div>
    </div>
  );
}
