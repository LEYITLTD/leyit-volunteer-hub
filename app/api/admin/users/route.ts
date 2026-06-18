import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { randomBytes } from "crypto";
import { Resend } from "resend";

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

  // Insert into admins table (linked by email)
  const nameParts  = full_name.trim().split(" ");
  const firstName  = nameParts[0];
  const lastName   = nameParts.slice(1).join(" ") || "";
  await service.from("admins").insert({ first_name: firstName, last_name: lastName, email, role: "admin", is_active: true });

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from:    process.env.RESEND_FROM_EMAIL!,
    to:      email,
    subject: "Your Eman Channel admin account is ready",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E8E3DC;">
        <div style="background:#1A1714;padding:16px 24px;">
          <span style="font-size:13px;font-weight:700;color:#A8854A;letter-spacing:0.08em;text-transform:uppercase;">LUL Global Volunteers</span>
        </div>
        <div style="padding:32px 24px;color:#1A1714;">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;">Welcome, ${full_name}</h2>
        <p style="font-size:14px;color:#5C5550;margin:0 0 24px;line-height:1.6;">
          An admin account has been created for you on LUL Global Volunteers.
          Use the credentials below to sign in — you'll be asked to set a new password straight away.
        </p>
        <div style="background:#F5F2EE;border-radius:10px;padding:20px 20px 16px;margin-bottom:24px;">
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9E9690;margin:0 0 4px;">Email</p>
          <p style="font-size:14px;font-family:monospace;margin:0 0 16px;color:#1A1714;">${email}</p>
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9E9690;margin:0 0 4px;">Temporary password</p>
          <p style="font-size:16px;font-family:monospace;font-weight:700;margin:0;color:#B8861B;letter-spacing:0.04em;">${password}</p>
        </div>
        <a href="https://volunteer-hub-leyitltds-projects.vercel.app/admin-login"
           style="display:inline-block;background:#B8861B;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;margin-bottom:24px;">
          Sign in to your account →
        </a>
        <p style="font-size:12px;color:#9E9690;margin:0;">
          If you weren't expecting this email, contact <a href="mailto:admin@emanchannel.tv" style="color:#B8861B;">admin@emanchannel.tv</a>.
        </p>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ id: data.user.id, email, full_name });
}
