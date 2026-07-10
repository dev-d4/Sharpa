import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function getSafeInternalPath(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/portfolios";

  try {
    const parsed = new URL(path, "http://local");
    const destination = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return destination.startsWith("/") && !destination.startsWith("//")
      ? destination
      : "/portfolios";
  } catch {
    return "/portfolios";
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeInternalPath(searchParams.get("next"));
  const skipOnboarding = searchParams.get("skip_onboarding") === "1";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      const isFirstLogin = !user?.user_metadata?.onboarding_completed;
      if (isFirstLogin && skipOnboarding) {
        await supabase.auth.updateUser({ data: { onboarding_completed: true } });
      }
      const destination = isFirstLogin
        ? skipOnboarding
          ? next
          : `/valkomst?next=${encodeURIComponent(next)}`
        : next;
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
