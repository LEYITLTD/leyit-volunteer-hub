import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session — essential for token rotation
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // --- Volunteer portal ---
  if (path.startsWith("/volunteer")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // --- Admin portal ---
  if (path.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin-login", request.url));
    }
    if (user.app_metadata?.role !== "admin") {
      // Signed in but not an admin — boot them out
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/admin-login", request.url));
    }
    // Force password change on first login
    if (user.user_metadata?.must_change_password && !path.startsWith("/admin/change-password")) {
      return NextResponse.redirect(new URL("/admin/change-password", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/volunteer/:path*", "/admin/:path*"],
};
