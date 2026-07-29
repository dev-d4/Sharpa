"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

function CheckMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

function PlusMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5V19M5 12H19" />
    </svg>
  );
}

type Choice = {
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  icon: typeof CheckMark;
  // Ikonplattans ton — blått för analys, grönt för bygg (ekar brandens två klotfärger)
  iconClass: string;
  // CTA-länkens färg matchar ikontonen
  ctaClass: string;
};

const CHOICES: Choice[] = [
  {
    title: "Analysera mina fonder",
    subtitle: "Har du redan fonder? Se avgifter, risk och bättre alternativ åt dig.",
    cta: "Kom igång",
    href: "/analyze",
    icon: CheckMark,
    iconClass: "bg-[#E9F2F7] text-accent",
    ctaClass: "text-accent",
  },
  {
    title: "Bygg en ny portfölj",
    subtitle: "Börjar du från noll? Svara på 4 frågor så tar vi fram ett förslag.",
    cta: "Kom igång",
    href: "/bygg-portfolj",
    icon: PlusMark,
    iconClass: "bg-[#E6F5EE] text-[#17864B]",
    ctaClass: "text-[#17864B]",
  },
];

const cardEase = [0.22, 1, 0.36, 1] as const;
const TOOL_PATHS = new Set(["/analyze", "/bygg-portfolj"]);

function getSafeInternalPath(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;

  try {
    const parsed = new URL(path, "http://local");
    const destination = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return destination.startsWith("/") && !destination.startsWith("//")
      ? destination
      : null;
  } catch {
    return null;
  }
}

export default function OnboardingClient() {
  const [userName, setUserName] = useState("");
  const [ready, setReady] = useState(false);
  const [loadingDestination, setLoadingDestination] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const returnTo = getSafeInternalPath(nextParam) ?? "/portfolios";
  const returnToPath = (() => {
    try {
      return new URL(returnTo, "http://local").pathname;
    } catch {
      return returnTo;
    }
  })();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        router.replace("/login");
        return;
      }
      if (TOOL_PATHS.has(returnToPath)) {
        supabase.auth.updateUser({ data: { onboarding_completed: true } }).finally(() => {
          router.replace(returnTo);
        });
        return;
      }
      const name =
        data.session.user.user_metadata?.full_name?.split(" ")[0] ??
        data.session.user.email?.split("@")[0] ??
        "";
      setUserName(name);
      setReady(true);
    });
  }, [returnTo, returnToPath, router]);

  async function complete(destination: string) {
    setLoadingDestination(destination);
    const supabase = createClient();
    if (TOOL_PATHS.has(returnToPath)) {
      await supabase.auth.updateUser({ data: { onboarding_completed: true } });
      router.replace(returnTo);
      return;
    }

    await supabase.auth.updateUser({ data: { onboarding_completed: true } });
    router.push(destination);
  }

  if (!ready) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col overflow-y-auto bg-canvas text-ink">
      <div className="relative z-10 flex min-h-dvh flex-col items-center px-6 py-12 sm:px-10 sm:py-16">
        <div className="animate-fade-in-up my-auto w-full max-w-[860px]">
          {/* ── Rubrik ─────────────────────────────────────────────────── */}
          <div className="mx-auto max-w-[600px] text-center">
            <p className="mb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-accent">
              Ditt konto är redo
            </p>

            <h1 className="font-heading text-[32px] font-extrabold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[42px]">
              {userName ? `${userName}, vart vill du börja?` : "Vart vill du börja?"}
            </h1>

            <p className="mx-auto mt-4 max-w-[460px] text-[15px] font-medium leading-6 text-[#334250]">
              Välj det som passar dig. Du kan alltid göra det andra sen.
            </p>
          </div>

          {/* ── Två likvärdiga val ─────────────────────────────────────── */}
          <div className="mt-8 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-5">
            {CHOICES.map((choice, index) => {
              const Icon = choice.icon;

              return (
                <motion.button
                  key={choice.href}
                  type="button"
                  onClick={() => complete(choice.href)}
                  disabled={loadingDestination !== null}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: cardEase, delay: 0.08 + index * 0.08 }}
                  whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                  className="group relative flex flex-col overflow-hidden rounded-lg border border-[rgba(23,33,43,0.1)] bg-white/85 p-4 text-left shadow-[0_10px_30px_rgba(23,33,43,0.06)] backdrop-blur-sm transition-[box-shadow,border-color] duration-300 hover:border-accent/60 hover:shadow-[0_20px_44px_rgba(11,110,153,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-70 sm:p-7"
                >
                  <span
                    className={[
                      "relative flex h-11 w-11 items-center justify-center rounded-md transition-transform duration-300 group-hover:scale-105 sm:h-14 sm:w-14 sm:rounded-lg",
                      choice.iconClass,
                    ].join(" ")}
                  >
                    <Icon className="h-[22px] w-[22px] sm:h-[26px] sm:w-[26px]" />
                  </span>

                  <span className="relative mt-4 block font-heading text-lg font-bold leading-6 text-ink sm:mt-5 sm:text-xl">
                    {choice.title}
                  </span>
                  <span className="relative mt-1.5 block text-[13px] leading-5 text-[#5b6672] sm:mt-2 sm:text-sm sm:leading-6">
                    {choice.subtitle}
                  </span>

                  <span
                    className={[
                      "relative mt-4 flex items-center gap-1.5 text-sm font-bold sm:mt-6",
                      choice.ctaClass,
                    ].join(" ")}
                  >
                    {choice.cta}
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* ── Hoppa över ─────────────────────────────────────────────── */}
          <div className="mt-8 text-center sm:mt-10">
            <button
              onClick={() => complete(returnTo)}
              disabled={loadingDestination !== null}
              className="inline-flex items-center gap-2 text-[13px] font-bold text-[#455766] transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-70"
            >
              Hoppa över för nu
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
