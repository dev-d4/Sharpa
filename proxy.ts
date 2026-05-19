import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SITE_COOKIE  = "integration_auth";
const LOGIN_PAGE   = "/integration/login";
const LOGIN_API    = "/api/integration/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Site-wide password gate ───────────────────────────────────────────────
  const isGateExempt =
    pathname === LOGIN_PAGE ||
    pathname.startsWith(LOGIN_API) ||
    pathname === "/auth/callback";
  if (!isGateExempt) {
    const token    = request.cookies.get(SITE_COOKIE)?.value;
    const expected = process.env.INTEGRATION_PASSWORD;
    if (expected && token !== expected) {
      return NextResponse.redirect(new URL(LOGIN_PAGE, request.url));
    }
  }

  // ── Supabase session refresh for API routes ───────────────────────────────
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg).*)"],
};
