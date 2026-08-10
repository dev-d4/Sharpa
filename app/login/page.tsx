"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { MAGIC_LINK_ENABLED } from "@/lib/features";
import { authErrorMessage } from "@/lib/auth-errors";
import Image from "next/image";
import Link from "next/link";
import { track } from "@vercel/analytics";

const LOGIN_MARKER = "sharpa_login_started";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const supabase = createClient();

  function getCallbackUrl(next: string) {
    const callbackUrl = new URL("/auth/callback", location.origin);
    callbackUrl.searchParams.set("next", next);
    if (searchParams.get("skip_onboarding") === "1") {
      callbackUrl.searchParams.set("skip_onboarding", "1");
    }
    return callbackUrl.toString();
  }

  async function handleGoogle() {
    const next = searchParams.get("next") ?? "/portfolios";
    localStorage.setItem(LOGIN_MARKER, searchParams.get("intent") ?? "general");
    track("login_started", { method: "google", intent: searchParams.get("intent") ?? "general" });
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getCallbackUrl(next),
        queryParams: { prompt: "select_account" },
      },
    });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!MAGIC_LINK_ENABLED) return;
    setError(null);
    setLoading(true);
    const next = searchParams.get("next") ?? "/portfolios";
    localStorage.setItem(LOGIN_MARKER, searchParams.get("intent") ?? "general");
    track("login_started", { method: "magic_link", intent: searchParams.get("intent") ?? "general" });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getCallbackUrl(next) },
    });
    if (error) setError(authErrorMessage(error));
    else setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo — nedtonad märkesyta, titeln bär vyn */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/">
            <Image src="/logo.svg" alt="Sharpa" width={28} height={28} />
          </Link>
          <h1 className="mt-5 font-display text-[26px] leading-tight text-ink sm:text-[30px]">
            {searchParams.get("intent") === "save" ? "Spara din analys och portfölj" : "Logga in eller skapa konto"}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            {searchParams.get("intent") === "save"
              ? "Logga in för att behålla resultatet. Du kommer tillbaka direkt efteråt."
              : "Inget konto? Vi skapar ett åt dig automatiskt."}
          </p>
        </div>

        <div className="space-y-4 rounded-md border border-line bg-white p-6">
          {sent && MAGIC_LINK_ENABLED ? (
            <div className="space-y-2 py-4 text-center">
              <p className="text-base font-medium text-ink">Kolla din e-post</p>
              <p className="text-sm text-ink-2">
                Vi har skickat en inloggningslänk till{" "}
                <span className="text-ink">{email}</span>.
              </p>
            </div>
          ) : (
            <>
              {/* Google */}
              <button
                onClick={handleGoogle}
                className="flex h-11 w-full items-center justify-center gap-3 rounded-xs border border-line-strong bg-white text-sm font-medium text-ink transition-colors duration-150 hover:bg-section"
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Fortsätt med Google
              </button>

              {MAGIC_LINK_ENABLED && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-line" />
                    <span className="text-xs text-ink-3">eller</span>
                    <div className="h-px flex-1 bg-line" />
                  </div>

                  {/* Magic link */}
                  <form onSubmit={handleMagicLink} className="space-y-3">
                    <input
                      type="email"
                      required
                      placeholder="din@email.se"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 w-full rounded-xs border border-line-strong bg-white px-4 text-sm text-ink placeholder:text-ink-3 focus:border-accent"
                    />
                    {error && <p className="text-xs text-neg">{error}</p>}
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex h-11 w-full items-center justify-center rounded-xs bg-accent text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover active:bg-accent-press disabled:opacity-50"
                    >
                      {loading ? "Skickar…" : "Skicka inloggningslänk"}
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-ink-3">
          Genom att logga in godkänner du våra{" "}
          <Link href="/villkor" className="text-accent underline decoration-line-strong underline-offset-2 transition-colors duration-150 hover:decoration-accent">användarvillkor</Link>
          {" "}och{" "}
          <Link href="/integritetspolicy" className="text-accent underline decoration-line-strong underline-offset-2 transition-colors duration-150 hover:decoration-accent">integritetspolicy</Link>.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
