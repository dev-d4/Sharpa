"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

function ArrowForward() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      className="w-4 h-4 shrink-0 text-slate-300 group-hover:text-blue-400 transition-colors duration-200"
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

const ACTIONS = [
  {
    title: "Bygg en ny portfölj",
    subtitle: "Besvara 6 frågor — vi sätter ihop allt åt dig på 2 minuter",
    href: "/bygg-portfolj",
  },
  {
    title: "Analysera min befintliga portfölj",
    subtitle: "Klistra in dina fonder och hitta förbättringar direkt",
    href: "/analyze",
  },
];


export default function OnboardingClient() {
  const [step, setStep] = useState(1);
  const [userName, setUserName] = useState("");
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const returnTo = nextParam ?? "/portfolios";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        router.replace("/login");
        return;
      }
      const name =
        data.session.user.user_metadata?.full_name?.split(" ")[0] ??
        data.session.user.email?.split("@")[0] ??
        "";
      setUserName(name);
      setReady(true);
    });
  }, [router]);

  async function complete(destination: string) {
    const supabase = createClient();
    await supabase.auth.updateUser({ data: { onboarding_completed: true } });
    router.push(destination);
  }

  if (!ready) return null;

  // ── Step 1: Risk profile pitch ────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="fixed inset-0 z-[200] bg-white overflow-y-auto flex items-center justify-center px-6">
        <div className="w-full max-w-xl relative z-10 py-12 sm:py-16">
          <h1
            className="text-[36px] sm:text-[56px] leading-[1.05] tracking-[-0.025em] text-slate-900 mb-5 sm:mb-7 animate-fade-in-up"
            style={{ fontFamily: "var(--font-dm-serif), Georgia, serif" }}
          >
            {userName ? <>{userName},<br /></> : null}
            <span className="hero-accent">låt oss börja rätt.</span>
          </h1>

          <p
            className="text-base sm:text-lg text-slate-500 leading-relaxed max-w-[480px] mb-8 sm:mb-10 animate-fade-in-up"
            style={{ animationDelay: "0.07s" }}
          >
            Innan vi fortsätter vill vi förstå din risknivå. Det tar under 2 minuter och säkerställer att du får fondförslag som är anpassade just efter dig.
          </p>

          {/* Stats — dölj på mobil för att hålla fokus på CTA */}
          <div
            className="hidden sm:flex items-center gap-6 mb-12 animate-fade-in-up"
            style={{ animationDelay: "0.12s" }}
          >
            <div>
              <p className="text-[17px] font-bold text-slate-900 leading-tight">4 frågor</p>
              <p className="text-xs text-slate-400 mt-0.5">tar under 2 minuter</p>
            </div>
            <div className="w-px h-9 bg-slate-200" />
            <div>
              <p className="text-[17px] font-bold text-slate-900 leading-tight">Bättre match</p>
              <p className="text-xs text-slate-400 mt-0.5">anpassade fondförslag</p>
            </div>
            <div className="w-px h-9 bg-slate-200" />
            <div>
              <p className="text-[17px] font-bold text-slate-900 leading-tight">Sparas</p>
              <p className="text-xs text-slate-400 mt-0.5">behöver göras en gång</p>
            </div>
          </div>

          <div
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 animate-fade-in-up"
            style={{ animationDelay: "0.17s" }}
          >
            <button
              onClick={() => complete(`/risk-profile?next=${encodeURIComponent(returnTo)}`)}
              className="inline-flex items-center justify-center gap-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-4 rounded-2xl text-sm transition-all duration-200 shadow-lg shadow-blue-500/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/30 active:translate-y-0"
            >
              Besvara riskfrågorna
              <ArrowForward />
            </button>

            <button
              onClick={() => nextParam ? complete(returnTo) : setStep(2)}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors py-2 text-center sm:text-left"
            >
              Hoppa över för nu →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Choose first action ───────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] bg-white overflow-y-auto flex items-center justify-center px-6">
      <div className="w-full max-w-lg relative z-10 py-12 sm:py-16">
        <div className="mb-7 sm:mb-9 animate-fade-in-down">
          <h2
            className="text-[34px] sm:text-[46px] leading-[1.08] tracking-[-0.025em] text-slate-900"
            style={{ fontFamily: "var(--font-dm-serif), Georgia, serif" }}
          >
            Vad vill du<br />
            <span className="hero-accent">börja med?</span>
          </h2>
        </div>

        <div className="space-y-3">
          {ACTIONS.map((action, i) => (
            <button
              key={action.href}
              onClick={() => complete(action.href)}
              className="group w-full text-left bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-200 rounded-2xl px-5 sm:px-6 py-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-100/50 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors duration-200 text-[15px]">
                    {action.title}
                  </p>
                  <p className="text-sm text-slate-400 mt-0.5 leading-snug">{action.subtitle}</p>
                </div>
                <ChevronRight />
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setStep(1)}
          className="mt-7 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          ← Tillbaka
        </button>
      </div>
    </div>
  );
}
