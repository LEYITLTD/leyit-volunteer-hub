import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error || !data.user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Confirm this is a volunteer account
    const { data: volunteer } = await supabase
      .from("volunteers")
      .select("id, is_active, email_verified")
      .eq("auth_user_id", data.user.id)
      .single();

    if (!volunteer) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "No volunteer account found for this email" }, { status: 403 });
    }

    if (!volunteer.email_verified) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Please verify your email address first — check your inbox for the link.", code: "email_unverified", email: email.toLowerCase() },
        { status: 403 },
      );
    }

    if (!volunteer.is_active) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Your account has been deactivated. Please contact an administrator." },
        { status: 403 },
      );
    }

    return NextResponse.json({ redirect: "/volunteer/dashboard" });
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "Sign in failed" }, { status: 500 });
  }
}
