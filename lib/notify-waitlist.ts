import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";
import { wrapEmailHtml, renderTemplate } from "./email-wrapper";

type GenderRestriction = "any" | "male" | "female" | string;

function genderMatches(restriction: GenderRestriction, volunteerGender: string | null): boolean {
  if (restriction === "any") return true;
  if (!volunteerGender) return false;
  return restriction === volunteerGender;
}

export async function notifyWaitlist(roleId: string): Promise<void> {
  const service = createServiceClient();

  // Get role + event details
  const { data: role } = await service
    .from("event_roles")
    .select("id, role_name, capacity, gender_restriction, event_id, events(id, name)")
    .eq("id", roleId)
    .single();

  if (!role) return;

  // Count confirmed spots taken for this role
  const { count: confirmedCount } = await service
    .from("event_applications")
    .select("id", { count: "exact", head: true })
    .eq("role_id", roleId)
    .eq("status", "confirmed");

  // If still full, no point notifying
  if ((confirmedCount ?? 0) >= role.capacity) return;

  // Get all waitlisted volunteers for this role, with their gender for eligibility check
  const { data: waitlisted } = await service
    .from("event_applications")
    .select("id, volunteers(id, first_name, email, gender)")
    .eq("role_id", roleId)
    .eq("status", "waitlisted");

  if (!waitlisted || waitlisted.length === 0) return;

  const { data: tpl } = await service
    .from("email_templates")
    .select("subject, body_html")
    .eq("key", "waitlist_spot_available")
    .single();

  if (!tpl) return;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const eventName = (role.events as { name: string } | null)?.name ?? "the event";

  await Promise.all(
    waitlisted
      .filter((app) => {
        const vol = app.volunteers as { gender?: string | null } | null;
        return genderMatches(role.gender_restriction, vol?.gender ?? null);
      })
      .map(async (app) => {
        const vol = app.volunteers as { first_name: string; email: string } | null;
        if (!vol?.email) return;
        const vars = {
          first_name: vol.first_name,
          event_name: eventName,
          role_name:  role.role_name,
        };
        try {
          await resend.emails.send({
            from:    process.env.RESEND_FROM_EMAIL!,
            to:      vol.email,
            subject: renderTemplate(tpl.subject, vars),
            html:    wrapEmailHtml(renderTemplate(tpl.body_html, vars)),
          });
        } catch {
          // Don't fail the whole batch if one email errors
        }
      }),
  );
}
