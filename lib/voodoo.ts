/* ──────────────────────────────────────────────────────────────────────────
   Voodoo SMS REST client. Docs: https://www.voodoosms.com/api/rest
   - Send:   POST https://api.voodoosms.com/sendsms  (Authorization: Bearer key)
   - Report: GET  https://api.voodoosms.com/report?message_id=…
   - Delivery webhook payload: { message_id, status, external_reference, ... }
   ────────────────────────────────────────────────────────────────────────── */

const BASE = "https://api.voodoosms.com";

export type SmsStatus = "sent" | "delivered" | "failed";

export type SendSmsResult = {
  ok: boolean;
  messageId: string | null;
  /** Raw provider status, e.g. "PENDING_SENT". */
  providerStatus: string | null;
  error: string | null;
};

/** Send a single SMS. `to` must be bare international digits (e.g. 447700900123). */
export async function sendSms(params: {
  to: string;
  from: string;
  msg: string;
  externalReference?: string;
}): Promise<SendSmsResult> {
  const key = process.env.VOODOO_API_KEY;
  if (!key) return { ok: false, messageId: null, providerStatus: null, error: "VOODOO_API_KEY not configured" };

  try {
    const res = await fetch(`${BASE}/sendsms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        to: params.to,
        from: params.from,
        msg: params.msg,
        ...(params.externalReference ? { external_reference: params.externalReference } : {}),
      }),
    });

    const data = await res.json().catch(() => null) as
      | { messages?: { id: string; status: string }[]; error?: { code: number; msg: string } }
      | null;

    if (!res.ok || data?.error) {
      return { ok: false, messageId: null, providerStatus: null, error: data?.error?.msg ?? `HTTP ${res.status}` };
    }

    const m = data?.messages?.[0];
    return { ok: true, messageId: m?.id ?? null, providerStatus: m?.status ?? null, error: null };
  } catch (e) {
    return { ok: false, messageId: null, providerStatus: null, error: e instanceof Error ? e.message : "Network error" };
  }
}

export type VoodooReportRow = { message_id: string; to: string; status: string; delivered_at?: string };

/** Poll delivery status for one or more message ids. */
export async function getReports(messageIds: string[]): Promise<VoodooReportRow[]> {
  const key = process.env.VOODOO_API_KEY;
  if (!key || messageIds.length === 0) return [];

  const out: VoodooReportRow[] = [];
  // The report endpoint takes a single message_id; query per id (bounded set).
  await Promise.all(messageIds.map(async (id) => {
    try {
      const res = await fetch(`${BASE}/report?message_id=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) return;
      const data = await res.json().catch(() => null) as { report?: VoodooReportRow[] } | null;
      for (const row of data?.report ?? []) out.push(row);
    } catch { /* ignore individual failures */ }
  }));
  return out;
}

/** Map any Voodoo status string (send/report/webhook) to our internal status. */
export function mapVoodooStatus(raw: string | null | undefined): SmsStatus {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("deliver") && !s.includes("undeliver") && !s.includes("not deliver")) return "delivered";
  if (s.includes("undeliver") || s.includes("not deliver") || s.includes("expired") || s.includes("reject") || s.includes("fail")) return "failed";
  return "sent"; // PENDING_SENT, "Sent - Awaiting Delivery", etc.
}
