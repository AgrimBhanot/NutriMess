import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session - IMPORTANT: do not remove this
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes that don't require auth
  const publicRoutes = ["/login", "/register", "/auth/callback"];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const response = NextResponse.redirect(url);
    // Keep any refreshed auth cookies on the redirect
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  // If user is not authenticated and trying to access protected routes
  if (!user && !isPublicRoute) {
    return redirectTo("/login");
  }

  // Signed-in users skip login/register; "/" routes them by role
  if (user && isPublicRoute && !pathname.startsWith("/auth/callback")) {
    return redirectTo("/");
  }

  if (user && !isPublicRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, bhawan_id")
      .eq("id", user.id)
      .maybeSingle();

    // Google OAuth sign-ups (or a failed profile trigger) have no bhawan yet
    const needsOnboarding = !profile?.bhawan_id;
    if (needsOnboarding && pathname !== "/onboarding") {
      return redirectTo("/onboarding");
    }
    if (!needsOnboarding && pathname === "/onboarding") {
      return redirectTo("/");
    }

    const isSecretary =
      profile?.role === "secretary" || profile?.role === "admin";

    // Route "/" here rather than in a page that only calls redirect():
    // that pattern trips Next 16's dev-mode "negative time stamp" error.
    if (pathname === "/" && !needsOnboarding) {
      return redirectTo(isSecretary ? "/secretary/dashboard" : "/dashboard");
    }
    if (pathname.startsWith("/secretary") && !isSecretary) {
      return redirectTo("/dashboard");
    }
  }

  return supabaseResponse;
}
