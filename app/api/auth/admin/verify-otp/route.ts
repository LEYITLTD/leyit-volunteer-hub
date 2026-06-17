import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { createHash } from "crypto";

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const service = createServiceClient();
    const normalEmail = email.toLowerCase().trim();

    // Fetch the active challenge
    const { data: challenge } = await service
      .from("admin_otp_challenges")
      .select("auth_user_id, otp_hash, expires_at")
      .eq("admin_email", normalEmail)
      .single();

    if (!challenge) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
    }

    if (new Date(challenge.expires_at) < new Date()) {
      await service.from("admin_otp_challenges").delete().eq("admin_email", normalEmail);
      return NextResponse.json(
        { error: "Code has expired. Please sign in again." },
        { status: 401 },
      );
    }

    const providedHash = createHash("sha256").update(otp.trim()).digest("hex");

    if (providedHash !== challenge.otp_hash) {
      return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 401 });
    }

    // OTP verified — consume the challenge
    await service.from("admin_otp_challenges").delete().eq("admin_email", normalEmail);

    // Stamp app_metadata.role so middleware can gate admin routes via JWT
    await service.auth.admin.updateUserById(challenge.auth_user_id, {
      app_metadata: { role: "admin" },
    });

    // Generate a magic link token and immediately exchange it for a session.
    // This avoids storing passwords or session tokens — the link is consumed server-side.
    const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
      type: "magiclink",
      email: normalEmail,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("[admin/verify-otp] generateLink error:", linkError);
      return NextResponse.json({ error: "Session creation failed" }, { status: 500 });
    }

    // Exchange the magic link token for a real session and set cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: normalEmail,
      token: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (verifyError) {
      console.error("[admin/verify-otp] verifyOtp error:", verifyError);
      return NextResponse.json({ error: "Session creation failed" }, { status: 500 });
    }

    // Stamp last_login on the admin record
    await service
      .from("admins")
      .update({ last_login: new Date().toISOString() })
      .eq("email", normalEmail);

    return NextResponse.json({ redirect: "/admin/overview" });
  } catch (err) {
    console.error("[admin/verify-otp]", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
