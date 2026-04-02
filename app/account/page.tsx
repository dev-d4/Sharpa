"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import type { SavedPortfolio } from "@/lib/portfolio";

const CUSTODIANS = [
  { value: "avanza", label: "Avanza" },
];

const PREF_KEY = "fondanalys_preferred_custodian";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [preferredCustodian, setPreferredCustodian] = useState<string>("");
  const [portfolios, setPortfolios] = useState<SavedPortfolio[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
    });
    setPreferredCustodian(localStorage.getItem(PREF_KEY) ?? "");
  }, [router]);

  async function handleDeletePortfolio(id: string) {
    await fetch(`/api/portfolios/${id}`, { method: "DELETE" });
    setPortfolios((prev) => prev.filter((p) => p.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

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
    <div className="max-w-5xl mx-auto px-6 py-10"><div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mitt konto</h1>
        <p className="text-sm text-slate-500 mt-1">Hantera dina inställningar</p>
      </div>

      {/* Account info */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Kontoinformation</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">E-post</span>
              <span className="text-sm font-medium text-slate-900">{user.email}</span>
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Föredraget depåinstitut</p>
              <p className="text-xs text-slate-400 mt-0.5">Förvalts automatiskt vid analys</p>
            </div>
            <select
              value={preferredCustodian}
              onChange={(e) => handleCustodianChange(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Inget valt</option>
              {CUSTODIANS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Portfolios */}
      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Mina portföljer</p>
        </div>
        {portfolios.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-8 text-center">
            <p className="text-sm text-slate-400">Du har inga sparade portföljer än.</p>
            <button onClick={() => router.push("/analyze")} className="mt-3 text-sm text-blue-600 hover:underline">
              Analysera din första portfölj →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {portfolios.map((p) => {
              const isExpanded = expandedId === p.id;
              const custodianLabel = p.custodian === "nordnet" ? "Nordnet" : "Avanza";
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Card header — click to expand */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className="w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 text-sm">{p.name}</span>
                          <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full">{custodianLabel}</span>
                          <span className="text-xs text-slate-400">{p.holdings.length} fonder</span>
                        </div>
                        <div className="flex gap-4 mt-1.5">
                          {p.analysis.avgCost !== null && (
                            <span className="text-xs text-slate-500">Avgift: <span className="font-medium text-slate-700">{p.analysis.avgCost.toFixed(2)}%</span></span>
                          )}
                          {p.analysis.weightedReturn1yr !== null && (
                            <span className="text-xs text-slate-500">Avk 1 år: <span className="font-medium text-slate-700">{p.analysis.weightedReturn1yr.toFixed(1)}%</span></span>
                          )}
                        </div>
                      </div>
                      <svg className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-6 py-4 space-y-5">
                      {/* Holdings */}
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Innehav</p>
                        <div className="space-y-1.5">
                          {p.holdings.map((h) => (
                            <div key={h.isin} className="flex items-center justify-between text-sm">
                              <div className="min-w-0">
                                <span className="font-medium text-slate-900 truncate">{h.name}</span>
                                <span className="text-xs text-slate-400 ml-2">{h.isin}</span>
                              </div>
                              <span className="font-semibold text-slate-600 shrink-0 ml-3">{h.weight}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Metrics */}
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Nyckeltal</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3">
                          <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-0.5">Snittavgift</p>
                            <p className="font-bold text-slate-900">{p.analysis.avgCost !== null ? `${p.analysis.avgCost.toFixed(2)}%` : "–"}</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-0.5">Avk 1 år</p>
                            <p className="font-bold text-slate-900">{p.analysis.weightedReturn1yr !== null ? `${p.analysis.weightedReturn1yr.toFixed(1)}%` : "–"}</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-0.5">Avk 3 år</p>
                            <p className="font-bold text-slate-900">{p.analysis.weightedReturn3yr !== null ? `${p.analysis.weightedReturn3yr.toFixed(1)}%` : "–"}</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-0.5">Sharpe 3 år</p>
                            <p className="font-bold text-slate-900">{p.analysis.weightedSharpe !== null ? p.analysis.weightedSharpe.toFixed(2) : "–"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      {p.analysis.summaryText && (
                        <p className="text-sm text-slate-600 leading-relaxed bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">{p.analysis.summaryText}</p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={() => router.push(`/analyze?portfolio=${p.id}`)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-3 rounded-xl transition-colors"
                        >
                          Redigera
                        </button>
                        <button
                          onClick={() => handleDeletePortfolio(p.id)}
                          className="text-sm font-medium text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 px-4 py-3 rounded-xl transition-colors"
                        >
                          Ta bort
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
