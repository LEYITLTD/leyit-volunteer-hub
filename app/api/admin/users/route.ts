import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { randomBytes } from "crypto";

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
  const { data: { users }, error: listErr } = await service.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const admins = users
    .filter(u => u.app_metadata?.role === "admin")
    .map(u => ({
      id:              u.id,
      email:           u.email,
      full_name:       u.user_metadata?.full_name ?? null,
      created_at:      u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }));

  return NextResponse.json(admins);
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

  return NextResponse.json({ id: data.user.id, email, full_name, password });
}
