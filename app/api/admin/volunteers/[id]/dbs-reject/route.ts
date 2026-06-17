import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { Resend } from "resend";

function renderTemplate(html: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (out, [k, v]) => out.replaceAll(`{{${k}}}`, v),
    html,
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user } = await requireAdminUser();
  if (error) return error;

  const { id } = await params;
  const { reason } = await request.json();

  if (!reason?.trim()) {
    return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: admin } = await service
    .from("admins")
    .select("id")
    .eq("email", user!.email!)
    .maybeSingle();

  const { error: updErr } = await service
    .from("volunteer_compliance")
    .update({
      dbs_status:           "rejected",
      dbs_rejection_reason: reason.trim(),
      dbs_reviewed_by:      admin?.id ?? null,
      dbs_reviewed_at:      new Date().toISOString(),
    })
    .eq("volunteer_id", id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  const { data: volunteer } = await service
    .from("volunteers")
    .select("email, first_name")
    .eq("id", id)
    .single();

  const { data: tpl } = await service
    .from("email_templates")
    .select("subject, body_html")
    .eq("key", "dbs_rejected")
    .single();

  if (volunteer && tpl) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL!,
      to:      volunteer.email,
      subject: tpl.subject,
      html:    renderTemplate(tpl.body_html, {
        first_name: volunteer.first_name,
        reason:     reason.trim(),
      }),
    });
  }

  return NextResponse.json({ success: true });
}
