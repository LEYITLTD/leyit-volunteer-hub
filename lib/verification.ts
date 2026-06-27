import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { wrapEmailHtml, renderTemplate } from "@/lib/email-wrapper";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Cryptographically-random link token; only its hash is ever stored. */
export function createVerificationToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

/**
 * Mint a fresh verification token for a volunteer, store ONLY its hash (one row
 * per volunteer ⇒ any previous link is invalidated), and email the branded link.
 * `origin` is the public site origin used to build the link.
 */
export async function issueVerificationEmail(
  service: SupabaseClient,
  v: { volunteer_id: string; email: string; first_name: string },
  origin: string,
  counters?: { sent_count: number; window_start: string },
): Promise<void> {
  const { raw, hash } = createVerificationToken();
  const now = new Date();

  await service.from("email_verifications").upsert({
    volunteer_id: v.volunteer_id,
    token_hash:   hash,
    expires_at:   new Date(now.getTime() + TOKEN_TTL_MS).toISOString(),
    created_at:   now.toISOString(),
    sent_count:   counters?.sent_count ?? 1,
    window_start: counters?.window_start ?? now.toISOString(),
  }, { onConflict: "volunteer_id" });

  const verifyUrl = `${origin}/verify-email?token=${encodeURIComponent(raw)}`;

  const { data: tpl } = await service
    .from("email_templates")
    .select("subject, body_html")
    .eq("key", "email_verification")
    .single();
  if (!tpl) return;

  const vars = { first_name: v.first_name, verify_url: verifyUrl };
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from:    process.env.RESEND_FROM_EMAIL!,
    to:      v.email,
    subject: renderTemplate(tpl.subject, vars),
    html:    wrapEmailHtml(renderTemplate(tpl.body_html, vars)),
  });
}

/** Best-effort public origin for building links from a server route. */
export function originFromRequest(request: Request): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const host = request.headers.get("host");
  return host ? `https://${host}` : "";
}
