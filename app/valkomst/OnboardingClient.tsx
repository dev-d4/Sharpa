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

const HORIZON_LABELS: Record<string, string> = {
  short:    "Under 3 år",
  medium:   "3–7 år",
  long:     "7–15 år",
  verylong: "Mer än 15 år",
};
const REACTION_LABELS: Record<string, string> = {
  sell: "Säljer allt",
  wait: "Avvaktar",
  buy:  "Köper mer",
};
const Q3_LABELS: Record<number, string> = {
  1: "Kan inte förlora något",
  2: "Kan förlora lite",
  3: "Accepterar viss förlust",
  4: "Accepterar stor förlust",
  5: "Spelar ingen roll",
};
const Q4_LABELS: Record<number, string> = {
  1: "Minimera risk",
  2: "Låg risk",
  3: "Balans risk/avkastning",
  4: "Hög avkastning",
  5: "Maximera avkastning",
};

const HORIZON_TO_Q1: Record<string, number> = { short: 2, medium: 3, long: 4, verylong: 5 };
const REACTION_TO_Q2: Record<string, number> = { sell: 1, wait: 3, buy: 5 };

type QuizAnswers = {
  horizon:  string | null;
  reaction: string | null;
  q3:       number | null;
  q4:       number | null;
  [key: string]: unknown;
};

export default function OnboardingClient() {
  const [step, setStep] = useState(1);
  const [userName, setUserName] = useState("");
  const [ready, setReady] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const returnTo = nextParam ?? "/portfolios";

  useEffect(() => {
    // Read quiz answers without consuming them — BuilderClient will clear them on mount
    try {
      const saved = sessionStorage.getItem("fondanalys_builder_quiz");
      if (saved) {
        const parsed = JSON.parse(saved);
        const a = parsed?.answers as QuizAnswers | undefined;
        if (a && (a.horizon || a.reaction || a.q3 != null || a.q4 != null)) {
          setQuizAnswers(a);
        }
      }
    } catch { /* ignore */ }

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

  async function saveRiskProfileAndContinue() {
    if (quizAnswers) {
      const q1 = quizAnswers.horizon  ? HORIZON_TO_Q1[quizAnswers.horizon]  : null;
      const q2 = quizAnswers.reaction ? REACTION_TO_Q2[quizAnswers.reaction] : null;
      const q3 = quizAnswers.q3;
      const q4 = quizAnswers.q4;
      if (q1 && q2 && q3 && q4) {
        try {
          await fetch("/api/risk-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ q1, q2, q3, q4 }),
          });
        } catch { /* ignore — user can update from account page later */ }
      }
    }
    complete(returnTo);
  }

  if (!ready) return null;

  // ── Step 1: Risk profile pitch ────────────────────────────────────────────
  if (step === 1) {

    // Variant: user arrived after completing the builder quiz
    if (quizAnswers) {
      const rows = [
        quizAnswers.horizon  && { label: "Tidshorisont",    value: HORIZON_LABELS[quizAnswers.horizon]   ?? quizAnswers.horizon },
        quizAnswers.reaction && { label: "Vid kursfall",    value: REACTION_LABELS[quizAnswers.reaction] ?? quizAnswers.reaction },
        quizAnswers.q3 != null && { label: "Investeringsvikt", value: Q3_LABELS[quizAnswers.q3] ?? String(quizAnswers.q3) },
        quizAnswers.q4 != null && { label: "Prioritet",        value: Q4_LABELS[quizAnswers.q4] ?? String(quizAnswers.q4) },
      ].filter(Boolean) as { label: string; value: string }[];

      return (
        <div className="fixed inset-0 z-[200] bg-white overflow-y-auto flex items-center justify-center px-6">
          <div className="w-full max-w-xl relative z-10 py-12 sm:py-16">
            <h1
              className="text-[36px] sm:text-[56px] leading-[1.05] tracking-[-0.025em] text-slate-900 mb-5 sm:mb-7 animate-fade-in-up"
              style={{ fontFamily: "var(--font-dm-serif), Georgia, serif" }}
            >
              {userName ? <>{userName},<br /></> : null}
              <span className="hero-accent">nästan klart.</span>
            </h1>

            <p
              className="text-base sm:text-lg text-slate-500 leading-relaxed max-w-[480px] mb-6 animate-fade-in-up"
              style={{ animationDelay: "0.07s" }}
            >
              Dina quizsvar är sparade. Vill du också komplettera med 2 korta riskfrågor för en personligare profil?
            </p>

            {/* Quiz answers summary */}
            {rows.length > 0 && (
              <div
                className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 mb-8 space-y-2.5 animate-fade-in-up"
                style={{ animationDelay: "0.1s" }}
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dina svar från quizet</p>
                {rows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-500">{r.label}</span>
                    <span className="text-xs font-semibold text-slate-800">{r.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 animate-fade-in-up"
              style={{ animationDelay: "0.15s" }}
            >
              <button
                onClick={saveRiskProfileAndContinue}
                className="inline-flex items-center justify-center gap-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-4 rounded-2xl text-sm transition-all duration-200 shadow-lg shadow-blue-500/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/30 active:translate-y-0"
              >
                Spara riskprofil och fortsätt
                <ArrowForward />
              </button>

              <button
                onClick={() => complete(returnTo)}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors py-2 text-center sm:text-left"
              >
                Hoppa över för nu →
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Default variant: user came from login/signup directly (no quiz data)
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
