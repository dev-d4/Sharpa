"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import type { SavedPortfolio } from "@/lib/portfolio";
import { RISK_LABELS, RISK_EQUITY, type RiskLevel } from "@/lib/risk";

const CUSTODIANS = [
  { value: "avanza", label: "Avanza" },
  { value: "nordnet", label: "Nordnet" }
];

const PREF_KEY = "fondanalys_preferred_custodian";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [preferredCustodian, setPreferredCustodian] = useState<string>("");
  const [portfolios, setPortfolios] = useState<SavedPortfolio[]>([]);
const [riskProfile, setRiskProfile] = useState<{ score: RiskLevel; label: string } | null | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      setLoading(false);
      if (!u) { router.replace("/login"); return; }
      fetch("/api/portfolios")
        .then((r) => r.ok ? r.json() : [])
        .then(setPortfolios)
        .catch(() => {});
      fetch("/api/risk-profile")
        .then((r) => r.ok ? r.json() : null)
        .then((p) => setRiskProfile(p ? { score: p.score as RiskLevel, label: p.label } : null))
        .catch(() => setRiskProfile(null));
    });
    setPreferredCustodian(localStorage.getItem(PREF_KEY) ?? "");
  }, [router]);

  function handleCustodianChange(value: string) {
    setPreferredCustodian(value);
    if (value) localStorage.setItem(PREF_KEY, value);
    else localStorage.removeItem(PREF_KEY);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const provider = user.app_metadata?.provider;
  const providerLabel = provider === "google" ? "Google" : "E-post";
  const providerIcon = provider === "google" ? (
    <svg width="16" height="16" viewBox="0 0 18 18" className="shrink-0">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  ) : (
    <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10"><div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mitt konto</h1>
        <p className="text-sm text-slate-500 mt-1">Hantera dina inställningar</p>
      </div>

      {/* Account info */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Kontoinformation</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500 shrink-0">E-post</span>
              <span className="text-sm font-medium text-slate-900 truncate text-right">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Inloggningsmetod</span>
              <div className="flex items-center gap-1.5">
                {providerIcon}
                <span className="text-sm font-medium text-slate-900">{providerLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Inställningar</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Föredraget depåinstitut</p>
              <p className="text-xs text-slate-400 mt-0.5">Förvalts automatiskt vid analys</p>
            </div>
            <select
              value={preferredCustodian}
              onChange={(e) => handleCustodianChange(e.target.value)}
              className="w-full sm:w-auto border border-slate-200 rounded-xl px-3 py-3 text-base sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Inget valt</option>
              {CUSTODIANS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Risk profile */}
      <section className="space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Din riskprofil</p>
        {riskProfile === undefined ? null : riskProfile === null ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900 text-sm">Du har ingen riskprofil ännu</p>
              <p className="text-xs text-slate-400 mt-0.5">Svara på 4 frågor för att se om dina portföljer matchar din risknivå.</p>
            </div>
            <button
              onClick={() => router.push("/risk-profile")}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-3 rounded-xl transition-colors"
            >
              Kom igång →
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-slate-900">{riskProfile.label}</p>
                <p className="text-sm text-slate-500">{RISK_EQUITY[riskProfile.score]}</p>
              </div>
              <button
                onClick={() => router.push("/risk-profile")}
                className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
              >
                Uppdatera
              </button>
            </div>
            <div className="flex gap-1.5">
              {([1, 2, 3, 4, 5] as RiskLevel[]).map((lvl) => (
                <div key={lvl} className="flex-1 space-y-1">
                  <div className={`h-2 rounded-full ${lvl <= riskProfile.score ? "bg-blue-500" : "bg-slate-100"}`} />
                  <p className={`hidden sm:block text-xs text-center truncate ${lvl === riskProfile.score ? "text-blue-600 font-semibold" : "text-slate-400"}`}>
                    {RISK_LABELS[lvl]}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-blue-600 font-semibold sm:hidden">{RISK_LABELS[riskProfile.score]}</p>
          </div>
        )}
      </section>

      {/* Portfolios link */}
      <section>
        <button
          onClick={() => router.push("/portfolios")}
          className="w-full text-left bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">Mina portföljer</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {portfolios.length === 0 ? "Inga sparade portföljer än" : `${portfolios.length} sparade portföljer`}
            </p>
          </div>
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </section>

      {/* Sign out */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Logga ut</p>
            <p className="text-xs text-slate-400 mt-0.5">Du loggas ut från alla enheter</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl px-4 py-2 transition-colors"
          >
            Logga ut
          </button>
        </div>
      </section>
    </div></div>
  );
}
