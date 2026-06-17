import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";
import { createHash, randomInt } from "crypto";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const service = createServiceClient();
    const normalEmail = email.toLowerCase().trim();

    // Check the admin record exists and is active
    const { data: admin } = await service
      .from("admins")
      .select("id, is_active, first_name")
      .eq("email", normalEmail)
      .single();

    // Generic error prevents email enumeration
    if (!admin || !admin.is_active) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Verify password using a stateless client (no cookies, no session persisted)
    const tempClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
    );

    const { data: authData, error: authError } = await tempClient.auth.signInWithPassword({
      email: normalEmail,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const authUserId = authData.user.id;

    // Generate a cryptographically secure 6-digit OTP
    const otp = randomInt(100000, 1000000).toString();
    const otpHash = createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // One challenge per email — upsert replaces any existing challenge
    await service.from("admin_otp_challenges").upsert(
      { admin_email: normalEmail, auth_user_id: authUserId, otp_hash: otpHash, expires_at: expiresAt },
      { onConflict: "admin_email" },
    );

    // Send OTP via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: email,
      subject: "Your VolunteerHub login code",
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="background: #1A1714; padding: 28px 32px; text-align: center; border-radius: 16px 16px 0 0;">
            <span style="color: #A8854A; font-size: 18px; font-weight: 600; letter-spacing: 0.08em;">VOLUNTEERHUB</span>
          </div>
          <div style="background: #F7F4EE; padding: 36px 32px; border-radius: 0 0 16px 16px;">
            <h2 style="margin: 0 0 8px; font-size: 22px; color: #1A1714;">Your login code</h2>
            <p style="margin: 0 0 28px; color: #6B6259; font-size: 15px; line-height: 1.5;">
              Hi ${admin.first_name}, enter this code to complete your admin sign in. It expires in <strong>5 minutes</strong>.
            </p>
            <div style="background: #fff; border: 2px solid #E5DDD3; border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 28px;">
              <span style="font-size: 44px; font-weight: 700; letter-spacing: 0.35em; color: #1A1714; font-variant-numeric: tabular-nums;">${otp}</span>
            </div>
            <p style="color: #9E9690; font-size: 13px; margin: 0; line-height: 1.5;">
              If you didn't request this code, someone may be attempting to access your account. You can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ status: "otp_required" });
  } catch (err) {
    console.error("[admin/login]", err);
    return NextResponse.json({ error: "Sign in failed" }, { status: 500 });
  }
}
