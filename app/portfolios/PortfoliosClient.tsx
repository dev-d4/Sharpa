"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import type { SavedPortfolio, PortfolioScoreHistoryEntry } from "@/lib/portfolio";
import type { SwapSuggestion } from "@/lib/analysis";
import { computePortfolioScore, SCORE_COLOR_CLASSES } from "@/lib/portfolio-score";
import { track } from "@vercel/analytics";

/** "3 augusti" / "3 augusti 2025" om kontrollen skedde ett annat år. */
function formatCheckedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

const score1 = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function PortfoliosClient() {
  const [portfolios, setPortfolios] = useState<SavedPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSwaps, setExpandedSwaps] = useState<Set<string>>(new Set());
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState<boolean | null>(null);
  const [history, setHistory] = useState<Map<string, PortfolioScoreHistoryEntry>>(new Map());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        // Behåll ankaret över inloggningen. Mejlen länkar hit, och de öppnas
        // ofta i en webbläsare där sessionen saknas — utan next hamnar man på
        // en tom portföljlista i stället för på portföljen mejlet gällde.
        const target = `/portfolios${window.location.hash}`;
        router.replace(`/login?next=${encodeURIComponent(target)}`);
        return;
      }
      fetch("/api/portfolios")
        .then((r) => r.ok ? r.json() : [])
        .then((p: SavedPortfolio[]) => {
          setPortfolios(p);
          setLoading(false);
          if (p.length > 0) {
            track("portfolio_viewed_again", { portfolio_count: p.length });
          }
          // Ankaret från mejlet, avläst först när portföljerna finns: kortet
          // ska markeras, och id:t ska bara gälla om portföljen faktiskt finns.
          const anchored = window.location.hash.match(/^#p-(.+)$/);
          const id = anchored ? decodeURIComponent(anchored[1]) : null;
          if (id && p.some((x) => x.id === id)) setFocusedId(id);
        })
        .catch(() => setLoading(false));
      fetch("/api/notification-preferences")
        .then((r) => r.ok ? r.json() : null)
        .then((p) => setAlertsEnabled(p?.email_score_alerts ?? false))
        .catch(() => setAlertsEnabled(false));
      fetch("/api/portfolio-history")
        .then((r) => r.ok ? r.json() : [])
        .then((rows: PortfolioScoreHistoryEntry[]) => {
          // Raderna kommer nyast först — första träffen per portfölj med en
          // faktisk förändring är den senaste förändringen.
          const latest = new Map<string, PortfolioScoreHistoryEntry>();
          for (const row of rows ?? []) {
            if (row.previous_score === null) continue;
            if (!latest.has(row.portfolio_id)) latest.set(row.portfolio_id, row);
          }
          setHistory(latest);
        })
        .catch(() => {});
    });
  }, [router]);

  // Korten finns inte i DOM:en förrän portföljerna hämtats, så webbläsarens
  // egen hash-scroll hinner aldrig träffa rätt — vi gör den själva när kortet
  // väl renderats.
  useEffect(() => {
    if (!focusedId) return;
    document.getElementById(`p-${focusedId}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focusedId]);

  async function handleDelete(id: string) {
    setDeleteError(null);
    const res = await fetch(`/api/portfolios/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleteError("Kunde inte ta bort portföljen. Försök igen.");
      return;
    }
    setPortfolios((prev) => prev.filter((p) => p.id !== id));
    setDeleteConfirm(null);
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Mina portföljer</h1>
          <p className="text-sm text-slate-500 mt-1">{portfolios.length} sparade portföljer</p>
          {portfolios.length > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Alla portföljer granskas vid nästa fonduppdatering. Bevakningen mejlar ett samlat besked efter kontrollen.{" "}
              <Link href="/account#notiser" className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600">
                Hantera bevakning
              </Link>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/analyze"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 px-3 py-2.5 rounded-md transition-colors hidden sm:block"
          >
            Analysera befintlig
          </Link>
          <Link
            href="/bygg-portfolj"
            className="bg-accent hover:bg-accent-hover active:bg-accent-press text-white text-sm font-semibold px-3 py-2.5 sm:px-4 rounded-md transition-colors"
          >
            + Ny portfölj
          </Link>
        </div>
      </div>

      {portfolios.length === 0 ? (
        <div className="bg-white rounded-md border border-slate-200 shadow-sm px-6 py-20 text-center space-y-5">
          <p className="text-slate-900 font-semibold text-lg">Du har inga sparade portföljer än</p>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">Bygg din första portfölj på 2 minuter — vi ställer 4 frågor och sätter ihop en komplett portfölj åt dig. Eller lägg in din befintliga portfölj, analysera den och spara den här.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/bygg-portfolj" className="inline-block bg-accent hover:bg-accent-hover active:bg-accent-press text-white text-sm font-semibold px-6 py-3 rounded-md transition-colors">
              Bygg din första portfölj
            </Link>
            <Link href="/analyze" className="inline-block border border-slate-200 hover:border-slate-300 text-slate-600 text-sm font-medium px-6 py-3 rounded-md transition-colors">
              Analysera befintlig portfölj
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {portfolios.map((p) => {
            const custodianLabel = p.custodian === "nordnet" ? "Nordnet" : p.custodian === "övrigt" ? "Övrigt" : "Avanza";
            const showSwaps = expandedSwaps.has(p.id);
            const hasSwaps = p.analysis.swapSuggestions?.length > 0;

            const scoreResult = computePortfolioScore(p.analysis);
            const scoreColors = SCORE_COLOR_CLASSES[scoreResult.color];

            return (
              <div
                key={p.id}
                id={`p-${p.id}`}
                className={`bg-white rounded-md border shadow-sm overflow-hidden scroll-mt-24 ${
                  focusedId === p.id ? "border-accent ring-1 ring-accent/25" : "border-slate-200"
                }`}
              >
                {/* Header */}
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="font-heading font-bold text-slate-900 break-words w-full sm:w-auto">{p.name}</h2>
                        <span className="text-xs text-slate-400">{custodianLabel}</span>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${scoreColors.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${scoreColors.dot}`} />
                          {scoreResult.score.toFixed(1)}/10 · {scoreResult.label}
                        </span>
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

                      {/* Bevakningsstatus */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <span className={`h-1.5 w-1.5 rounded-full ${alertsEnabled === false ? "bg-slate-300" : "bg-pos"}`} />
                          {alertsEnabled === false ? "Bevakning av" : "Bevakning på"}
                        </span>
                        {p.last_checked_at && (
                          <span className="text-xs text-slate-400">
                            Kontrollerad {formatCheckedAt(p.last_checked_at)}
                          </span>
                        )}
                        {(() => {
                          const h = history.get(p.id);
                          if (!h || h.previous_score === null) return null;
                          const delta = h.score - h.previous_score;
                          if (Math.abs(delta) < 0.05) return null;
                          return (
                            <span className={`text-xs font-medium ${delta < 0 ? "text-neg" : "text-pos"}`}>
                              {score1(h.previous_score)} → {score1(h.score)}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <button
                        onClick={() => router.push(`/analyze?portfolio=${p.id}`)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors whitespace-nowrap min-h-[36px]"
                      >
                        Redigera
                      </button>
                      {deleteConfirm === p.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors whitespace-nowrap min-h-[36px]"
                          >
                            Ja, ta bort
                          </button>
                          <button
                            onClick={() => { setDeleteConfirm(null); setDeleteError(null); }}
                            className="text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-200 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors whitespace-nowrap min-h-[36px]"
                          >
                            Avbryt
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(p.id)}
                          className="text-xs font-medium text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-200 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors whitespace-nowrap min-h-[36px]"
                        >
                          Ta bort
                        </button>
                      )}
                    </div>
                    {deleteError && deleteConfirm === null && (
                      <p className="text-xs text-red-500 mt-1 text-right">{deleteError}</p>
                    )}
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
                            <p className="text-sm text-slate-600 leading-relaxed bg-blue-50 border border-blue-100 rounded-md px-4 py-3">
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
                            <div key={m.label} className="bg-slate-50 rounded-md p-3">
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
                        {showSwaps ? "Dölj fondalternativ" : `Visa fondalternativ (${p.analysis.swapSuggestions?.length ?? 0})`}
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
                                  <div key={gi} className={`rounded-md p-4 space-y-3 border ${isConsolidate ? "border-info-line bg-info/40" : "border-warn/25 bg-warn-soft/40"}`}>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md border uppercase tracking-wide inline-block ${isConsolidate ? "text-accent bg-info border-info-line" : "text-warn bg-warn-soft border-warn/25"}`}>
                                      {isConsolidate ? `Konsolidera ${group.length} fonder hit` : `Topval — bättre än ${group.length} fonder`}
                                    </span>
                                    <div>
                                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
                                        {isConsolidate ? "Redan i din portfölj" : "Alternativ fond"}
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
                                <div key={gi} className="border border-slate-200 rounded-md p-4 space-y-2 bg-slate-50">
                                  {s.consolidate ? (
                                    <>
                                      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nuvarande fond</p>
                                          <p className="font-semibold text-sm text-slate-900 break-words">{s.currentFund.name}</p>
                                        </div>
                                        <span className="text-slate-400 text-xs font-medium sm:mt-3">till</span>
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
                                        <span className="text-slate-400 text-xs font-medium sm:mt-3">till</span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Alternativ fond</p>
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
