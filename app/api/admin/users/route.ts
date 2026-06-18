import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { randomBytes } from "crypto";
import { Resend } from "resend";
import { wrapEmailHtml, renderTemplate } from "@/lib/email-wrapper";

function generatePassword(): string {
  const upper  = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower  = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const all    = upper + lower + digits;
  const bytes  = randomBytes(12);
  const body   = Array.from(bytes.slice(0, 10)).map(b => all[b % all.length]).join("");
  const u = upper[bytes[10] % upper.length];
  const d = digits[bytes[11] % digits.length];
  return `${u}${body}${d}!`;
}

export async function GET() {
  const { error } = await requireAdminUser();
  if (error) return error;

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("admins")
    .select("id, first_name, last_name, email, role, created_at, last_login")
    .eq("is_active", true)
    .order("created_at");

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const body = await request.json();
  const { email, full_name } = body;

  if (!email || !full_name) {
    return NextResponse.json({ error: "email and full_name are required" }, { status: 400 });
  }

  const password = generatePassword();
  const service  = createServiceClient();

  const { data, error: createErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata:  { full_name, must_change_password: true },
    app_metadata:   { role: "admin" },
  });

  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 });

  // Supabase admin createUser can leave token columns NULL which breaks signInWithPassword
  // ("converting NULL to string is unsupported"). Re-setting the password via updateUserById
  // forces Supabase to normalise all auth fields on the row.
  await service.auth.admin.updateUserById(data.user.id, { password }).catch(() => null);

  // Insert into admins table (linked by email)
  const nameParts  = full_name.trim().split(" ");
  const firstName  = nameParts[0];
  const lastName   = nameParts.slice(1).join(" ") || "";
  await service.from("admins").insert({ first_name: firstName, last_name: lastName, email, role: "admin", is_active: true });

  const { data: tpl } = await service
    .from("email_templates")
    .select("subject, body_html")
    .eq("key", "admin_account_created")
    .single();

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from:    process.env.RESEND_FROM_EMAIL!,
    to:      email,
    subject: tpl ? renderTemplate(tpl.subject, { first_name: firstName, email, password }) : "Your Eman Channel admin account is ready",
    html:    tpl
      ? wrapEmailHtml(renderTemplate(tpl.body_html, { first_name: firstName, email, password }))
      : wrapEmailHtml(`<p>Hi ${firstName},</p><p>Your admin account has been created. Email: ${email} / Password: ${password}</p>`),
  });

  return NextResponse.json({ id: data.user.id, email, full_name });
}
