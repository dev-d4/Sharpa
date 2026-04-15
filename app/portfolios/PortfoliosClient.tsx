"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import type { SavedPortfolio } from "@/lib/portfolio";
import { portfolioRiskLevel, riskMatch, type RiskLevel } from "@/lib/risk";
import type { SwapSuggestion } from "@/lib/analysis";

export default function PortfoliosClient() {
  const [portfolios, setPortfolios] = useState<SavedPortfolio[]>([]);
  const [riskProfile, setRiskProfile] = useState<{ score: RiskLevel } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSwaps, setExpandedSwaps] = useState<Set<string>>(new Set());
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) { router.replace("/login"); return; }
      Promise.all([
        fetch("/api/portfolios").then((r) => r.ok ? r.json() : []),
        fetch("/api/risk-profile").then((r) => r.ok ? r.json() : null),
      ]).then(([p, rp]) => {
        setPortfolios(p);
        setRiskProfile(rp ? { score: rp.score as RiskLevel } : null);
        setLoading(false);
      }).catch(() => setLoading(false));
    });
  }, [router]);

  async function handleDelete(id: string) {
    await fetch(`/api/portfolios/${id}`, { method: "DELETE" });
    setPortfolios((prev) => prev.filter((p) => p.id !== id));
  }

  function toggle(set: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    set((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mina portföljer</h1>
          <p className="text-sm text-slate-500 mt-1">{portfolios.length} sparade portföljer</p>
        </div>
        <Link
          href="/analyze"
          className="shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium px-3 py-2.5 sm:px-4 rounded-xl transition-all shadow-sm shadow-blue-200"
        >
          + Ny
        </Link>
      </div>

      {portfolios.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-16 text-center">
          <p className="text-slate-400 text-sm mb-3">Du har inga sparade portföljer än.</p>
          <Link href="/analyze" className="text-sm text-blue-600 hover:underline">Analysera din första portfölj →</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {portfolios.map((p) => {
            const custodianLabel = p.custodian === "nordnet" ? "Nordnet" : p.custodian === "övrigt" ? "Övrigt" : "Avanza";
            const showSwaps = expandedSwaps.has(p.id);
            const hasSwaps = p.analysis.swapSuggestions?.length > 0;

            let riskBadge = null;
            if (riskProfile && p.analysis.categoryBreakdown) {
              const match = riskMatch(portfolioRiskLevel(p.analysis.categoryBreakdown), riskProfile.score);
              const colors = {
                green: "bg-green-50 text-green-700 border-green-100",
                yellow: "bg-amber-50 text-amber-700 border-amber-100",
                red: "bg-red-50 text-red-700 border-red-100",
              };
              riskBadge = (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors[match.color]}`}>
                  {match.label}
                </span>
              );
            }

            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-slate-900 break-words">{p.name}</h2>
                        <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full">{custodianLabel}</span>
                        <span className="text-xs text-slate-400">{p.holdings.length} fonder</span>
                        {riskBadge}
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        {p.analysis.avgCost !== null && (
                          <span className="text-xs text-slate-500">Avgift: <span className="font-medium text-slate-700">{p.analysis.avgCost.toFixed(2)}%</span></span>
                        )}
                        {p.analysis.weightedReturn1yr !== null && (
                          <span className="text-xs text-slate-500">1 år: <span className="font-medium text-slate-700">{p.analysis.weightedReturn1yr.toFixed(1)}%</span></span>
                        )}
                        {p.analysis.weightedReturn3yr !== null && (
                          <span className="text-xs text-slate-500">3 år: <span className="font-medium text-slate-700">{p.analysis.weightedReturn3yr.toFixed(1)}%</span></span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <button
                        onClick={() => router.push(`/analyze?portfolio=${p.id}`)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 px-2.5 sm:px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Redigera
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs font-medium text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-200 px-2.5 sm:px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Ta bort
                      </button>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
                  {/* Holdings + Metrics toggle */}
                  <div>
                    <button
                      onClick={() => toggle(setExpandedDetails, p.id)}
                      className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <svg className={`w-4 h-4 transition-transform ${expandedDetails.has(p.id) ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                      {expandedDetails.has(p.id) ? "Dölj innehav och nyckeltal" : "Visa innehav och nyckeltal"}
                    </button>

                    {expandedDetails.has(p.id) && (
                      <div className="mt-3 space-y-4">
                          {/* Summary */}
                          {p.analysis.summaryText && (
                            <p className="text-sm text-slate-600 leading-relaxed bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                              {p.analysis.summaryText}
                            </p>
                          )}
                        <div className="space-y-1.5">
                          {p.holdings.map((h) => (
                            <div key={h.isin} className="flex items-center justify-between text-sm">
                              <div className="min-w-0 flex items-center gap-2">
                                <span className="font-medium text-slate-900 truncate">{h.name}</span>
                                <span className="hidden sm:inline text-xs text-slate-400 shrink-0">{h.isin}</span>
                              </div>
                              <div className="flex items-baseline gap-2 shrink-0 ml-3">
                                {h.amount && (
                                  <span className="text-xs text-slate-400">{parseFloat(h.amount).toLocaleString("sv-SE")} kr</span>
                                )}
                                <span className="font-semibold text-slate-600">{h.weight}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: "Snittavgift", value: p.analysis.avgCost !== null ? `${p.analysis.avgCost.toFixed(2)}%` : "–" },
                            { label: "Avk 1 år", value: p.analysis.weightedReturn1yr !== null ? `${p.analysis.weightedReturn1yr.toFixed(1)}%` : "–" },
                            { label: "Avk 3 år", value: p.analysis.weightedReturn3yr !== null ? `${p.analysis.weightedReturn3yr.toFixed(1)}%` : "–" },
                            { label: "Sharpe 3 år", value: p.analysis.weightedSharpe !== null ? p.analysis.weightedSharpe.toFixed(2) : "–" },
                          ].map((m) => (
                            <div key={m.label} className="bg-slate-50 rounded-xl p-3">
                              <p className="text-xs text-slate-500 mb-0.5">{m.label}</p>
                              <p className="font-bold text-slate-900">{m.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Swap suggestions toggle */}
                  {hasSwaps && (
                    <div>
                      <button
                        onClick={() => toggle(setExpandedSwaps, p.id)}
                        className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <svg className={`w-4 h-4 transition-transform ${showSwaps ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                        {showSwaps ? "Dölj fondbytesförslag" : `Visa fondbytesförslag (${p.analysis.swapSuggestions?.length ?? 0})`}
                      </button>

                      {showSwaps && (
                        <div className="mt-3 space-y-3">
                          {(() => {
                            const swaps = p.analysis.swapSuggestions ?? [];
                            const groupMap = new Map<string, SwapSuggestion[]>();
                            for (const s of swaps) {
                              const key = s.suggestedFund.isin;
                              if (!groupMap.has(key)) groupMap.set(key, []);
                              groupMap.get(key)!.push(s);
                            }
                            const groups = Array.from(groupMap.values()).sort((a, b) => b.length - a.length);
                            return groups.map((group, gi) => {
                              const suggested = group[0].suggestedFund;
                              const isConsolidate = group[0].consolidate;
                              if (group.length >= 2) {
                                return (
                                  <div key={gi} className={`rounded-xl p-4 space-y-3 border-2 ${isConsolidate ? "border-blue-200 bg-blue-50/30" : "border-amber-200 bg-amber-50/30"}`}>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide inline-block ${isConsolidate ? "text-blue-700 bg-blue-100 border-blue-200" : "text-amber-700 bg-amber-100 border-amber-200"}`}>
                                      {isConsolidate ? `Konsolidera ${group.length} fonder hit` : `Topval — bättre än ${group.length} fonder`}
                                    </span>
                                    <div>
                                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
                                        {isConsolidate ? "Redan i din portfölj" : "Föreslagen fond"}
                                      </p>
                                      <p className="font-bold text-slate-900">{suggested.name}</p>
                                      <p className="text-xs text-slate-400">{suggested.isin}</p>
                                    </div>
                                    {group[0].similarityNote && (
                                      <p className="text-xs text-slate-500 italic">{group[0].similarityNote}</p>
                                    )}
                                    <div className="pt-2 border-t border-slate-200/60 space-y-2">
                                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ersätter</p>
                                      {group.map((s, si) => (
                                        <div key={si} className="flex items-start justify-between gap-3 text-sm">
                                          <span className="font-medium text-slate-800 min-w-0 truncate">{s.currentFund.name}</span>
                                          {s.reason && <span className="text-xs text-green-600 shrink-0 text-right max-w-[45%]">{s.reason}</span>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                              const s = group[0];
                              return (
                                <div key={gi} className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50">
                                  {s.consolidate ? (
                                    <>
                                      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Överväg att sälja</p>
                                          <p className="font-semibold text-sm text-slate-900 break-words">{s.currentFund.name}</p>
                                        </div>
                                        <span className="text-slate-400 text-lg sm:mt-3">↓<span className="hidden sm:inline">→</span></span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Öka i befintlig fond</p>
                                          <p className="font-semibold text-sm text-slate-900 break-words">{s.suggestedFund.name}</p>
                                        </div>
                                      </div>
                                      {s.similarityNote && <p className="text-xs text-slate-400 italic">{s.similarityNote}</p>}
                                      <p className="text-sm text-slate-600">
                                        <span className="font-semibold text-blue-600">Konsolidera: </span>
                                        Flytta kapitalet från {s.currentFund.name} till {s.suggestedFund.name}.{s.reason && ` (${s.reason})`}
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nuvarande fond</p>
                                          <p className="font-semibold text-sm text-slate-900 break-words">{s.currentFund.name}</p>
                                        </div>
                                        <span className="text-slate-400 text-lg sm:mt-3">↓<span className="hidden sm:inline">→</span></span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Föreslagen fond</p>
                                          <p className="font-semibold text-sm text-slate-900 break-words">{s.suggestedFund.name}</p>
                                        </div>
                                      </div>
                                      {s.similarityNote && <p className="text-xs text-slate-400 italic">{s.similarityNote}</p>}
                                      <p className="text-sm text-slate-600">
                                        <span className="font-semibold text-green-600">Förbättring: </span>{s.reason}
                                      </p>
                                    </>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
