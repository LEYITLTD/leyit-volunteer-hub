import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { issueVerificationEmail, originFromRequest } from "@/lib/verification";

const COOLDOWN_MS = 60 * 1000;       // 60s between sends
const WINDOW_MS   = 24 * 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;            // 5 sends / 24h

// Always returns a generic success (no email enumeration). Only actually sends
// when the address belongs to an unverified volunteer and passes throttling.
export async function POST(request: Request) {
  const { email } = await request.json() as { email?: string };
  const generic = NextResponse.json({ success: true });
  if (!email?.trim()) return generic;

  const service = createServiceClient();

  const { data: volunteer } = await service
    .from("volunteers")
    .select("id, first_name, email, email_verified")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (!volunteer || volunteer.email_verified) return generic;

  const { data: existing } = await service
    .from("email_verifications")
    .select("created_at, sent_count, window_start")
    .eq("volunteer_id", volunteer.id)
    .maybeSingle();

  const now = Date.now();
  let sent_count = 1;
  let window_start = new Date(now).toISOString();

  if (existing) {
    // 60s cooldown
    if (now - new Date(existing.created_at).getTime() < COOLDOWN_MS) return generic;

    const windowAge = now - new Date(existing.window_start).getTime();
    if (windowAge < WINDOW_MS) {
      if (existing.sent_count >= MAX_PER_WINDOW) return generic; // daily cap hit
      sent_count   = existing.sent_count + 1;
      window_start = existing.window_start;
    }
    // else: window rolled over → reset (sent_count=1, window_start=now)
  }

  try {
    await issueVerificationEmail(
      service,
      { volunteer_id: volunteer.id, email: volunteer.email, first_name: volunteer.first_name },
      originFromRequest(request),
      { sent_count, window_start },
    );
  } catch {
    // swallow — never reveal send state
  }

  return generic;
}
