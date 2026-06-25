import type { SupabaseClient } from "@supabase/supabase-js";

/* Append a row to the per-volunteer communications log. Fire-and-forget:
   logging must never break the actual send. */
export async function logCommunication(
  service: SupabaseClient,
  entry: {
    volunteer_id: string;
    channel: "email" | "sms";
    category?: "system" | "direct";
    subject?: string | null;
    body?: string | null;
    status?: "sent" | "delivered" | "failed";
    provider_message_id?: string | null;
    error_message?: string | null;
    sent_by?: string | null;
  },
): Promise<void> {
  try {
    await service.from("communications").insert({
      volunteer_id:        entry.volunteer_id,
      channel:             entry.channel,
      category:            entry.category ?? "direct",
      subject:             entry.subject ?? null,
      body:                entry.body ?? null,
      status:              entry.status ?? "sent",
      provider_message_id: entry.provider_message_id ?? null,
      error_message:       entry.error_message ?? null,
      sent_by:             entry.sent_by ?? null,
    });
  } catch {
    // never throw from logging
  }
}

/** Look up a volunteer id from an email (helper for system-notification logging). */
export async function volunteerIdByEmail(service: SupabaseClient, email: string): Promise<string | null> {
  const { data } = await service.from("volunteers").select("id").eq("email", email).maybeSingle();
  return data?.id ?? null;
}
