"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { RISK_LABELS, RISK_EQUITY, type RiskLevel } from "@/lib/risk";

const RISK_DESCRIPTION: Record<RiskLevel, string> = {
  1: "Du prioriterar trygghet framför avkastning. En portfölj med tyngdpunkt på räntefonder och en liten andel aktier passar dig bäst.",
  2: "Du föredrar stabilitet men är öppen för viss risk. En portfölj med övervikt mot räntor och en mindre aktieandel passar dig.",
  3: "Du söker balans mellan risk och avkastning. En mix av aktier och räntor ger dig tillväxtpotential utan för hög volatilitet.",
  4: "Du är bekväm med kurssvängningar och siktar på god avkastning. En aktiedominerad portfölj med viss diversifiering passar dig.",
  5: "Du maximerar avkastningspotentialen och accepterar hög volatilitet. Du investerar nästan uteslutande i aktier för långsiktig tillväxt.",
};

function ArrowForward() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

export default function RiskResultClient() {
  const [profile, setProfile] = useState<{ score: RiskLevel; label: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        router.replace("/login");
        return;
      }
      fetch("/api/risk-profile")
        .then((r) => r.ok ? r.json() : null)
        .then((p) => {
          if (!p) { router.replace("/risk-profile"); return; }
          setProfile({ score: p.score as RiskLevel, label: p.label });
          setLoading(false);
        })
        .catch(() => router.replace("/risk-profile"));
    });
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const score = profile.score;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">

      <div className="w-full max-w-xl relative z-10 py-16">

        {/* Eyebrow */}
        <p
          className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-5 animate-fade-in-down"
        >
          Din riskprofil är klar
        </p>

        {/* Heading */}
        <h1
          className="text-[50px] sm:text-[62px] leading-[1.05] tracking-[-0.025em] text-slate-900 mb-8 animate-fade-in-up"
          style={{ fontFamily: "var(--font-dm-serif), Georgia, serif" }}
        >
          Du är<br />
          <span className="hero-accent">{profile.label.toLowerCase()}.</span>
        </h1>

        {/* Risk level bar */}
        <div
          className="mb-6 animate-fade-in-up"
          style={{ animationDelay: "0.07s" }}
        >
          <div className="flex gap-2 mb-3">
            {([1, 2, 3, 4, 5] as RiskLevel[]).map((lvl) => (
              <div key={lvl} className="flex-1 space-y-1.5">
                <div
                  className={`h-2 rounded-full transition-all ${
                    lvl <= score ? "bg-blue-500" : "bg-slate-100"
                  } ${lvl === score ? "ring-2 ring-blue-300 ring-offset-1" : ""}`}
                />
                <p className={`text-xs text-center hidden sm:block ${lvl === score ? "text-blue-600 font-semibold" : "text-slate-300"}`}>
                  {RISK_LABELS[lvl]}
                </p>
              </div>
            ))}
          </div>
          <p className="text-sm font-semibold text-blue-600 sm:hidden">{RISK_LABELS[score]}</p>
        </div>

        {/* Equity split + description */}
        <div
          className="bg-white border border-slate-200 rounded-2xl px-6 py-5 mb-10 space-y-3 animate-fade-in-up"
          style={{ animationDelay: "0.12s" }}
        >
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{RISK_EQUITY[score]}</span>
            <span className="text-sm text-slate-400">rekommenderad aktieandel</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            {RISK_DESCRIPTION[score]}
          </p>
        </div>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row gap-3 animate-fade-in-up"
          style={{ animationDelay: "0.17s" }}
        >
          {nextParam ? (
            <Link
              href={nextParam}
              className="inline-flex items-center justify-center gap-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-4 rounded-2xl text-sm transition-all duration-200 shadow-lg shadow-blue-500/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/30 active:translate-y-0"
            >
              Fortsätt
              <ArrowForward />
            </Link>
          ) : (
            <>
              <Link
                href="/bygg-portfolj"
                className="inline-flex items-center justify-center gap-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-4 rounded-2xl text-sm transition-all duration-200 shadow-lg shadow-blue-500/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/30 active:translate-y-0"
              >
                Bygg min portfölj nu
                <ArrowForward />
              </Link>
              <Link
                href="/analyze"
                className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold px-8 py-4 rounded-2xl text-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:translate-y-0"
              >
                Analysera befintlig portfölj →
              </Link>
            </>
          )}
        </div>

        {/* Back link */}
        <div className="mt-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <Link href="/account" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            Gå till mitt konto →
          </Link>
        </div>

      </div>
    </div>
  );
}
