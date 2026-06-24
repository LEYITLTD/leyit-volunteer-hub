import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

/* ──────────────────────────────────────────────────────────────────────────
   Phone helpers — a single source of truth for turning the free-text numbers
   volunteers enter (07…, +44…, 44…, with spaces/brackets) into the formats we
   need: E.164 for storage, and bare international digits for Voodoo SMS.
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Canonical E.164 form for storage, e.g. "+447700900123".
 * Returns null if the input is not a valid number for the region.
 */
export function toE164(raw: string | null | undefined, region: CountryCode = "GB"): string | null {
  if (!raw) return null;
  const parsed = parsePhoneNumberFromString(raw.trim(), region);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number; // E.164, includes leading "+"
}

/**
 * Bare international digits for Voodoo SMS (no "+"), e.g. "447700900123".
 * Returns null if not a valid number.
 */
export function toMsisdn(raw: string | null | undefined, region: CountryCode = "GB"): string | null {
  const e164 = toE164(raw, region);
  return e164 ? e164.replace(/^\+/, "") : null;
}

/**
 * Valid AND a mobile number (so we don't text landlines). Returns E.164 or null.
 * Falls back to plain validity when the type can't be determined.
 */
export function toMobileE164(raw: string | null | undefined, region: CountryCode = "GB"): string | null {
  if (!raw) return null;
  const parsed = parsePhoneNumberFromString(raw.trim(), region);
  if (!parsed || !parsed.isValid()) return null;
  const type = parsed.getType();
  if (type && type !== "MOBILE" && type !== "FIXED_LINE_OR_MOBILE") return null;
  return parsed.number;
}
