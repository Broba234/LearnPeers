import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
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
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // API routes that must work without an authenticated session.
  // Everything else under /api requires a logged-in user (these routes use the
  // service-role key, which bypasses row-level security, so the session is the
  // only gate).
  const PUBLIC_API = [
    "/api/stripe/webhook", // Stripe server-to-server (no cookie); signature-verified
    "/api/stripe/connect/return", // browser redirect back from Stripe onboarding
    "/api/stripe/connect/refresh",
    "/api/profiles/create", // sign-up
    "/api/profiles/get", // login role lookup
    "/api/contacts", // public contact form
    "/api/education/verify-email/confirm", // email-link, token-verified
  ];

  if (pathname.startsWith("/api/")) {
    const isPublic = PUBLIC_API.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
    if (!isPublic && !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return response;
  }

  if (!user) {
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      return NextResponse.redirect(loginUrl);
    }
    if (pathname.startsWith("/home")) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
