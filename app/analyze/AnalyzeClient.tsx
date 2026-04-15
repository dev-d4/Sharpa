"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PortfolioAnalysis, SuggestedMetrics } from "@/lib/analysis";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Building2, Landmark, Search, Sparkles, X } from "lucide-react"
import type { SavedPortfolio } from "@/lib/portfolio"

// ── Types ─────────────────────────────────────────────────────────────────────

type Entry = { isin: string; name: string; weight: string; amount?: string };
type FundSuggestion = { name: string; isin: string };

const CUSTODIANS = [
  { value: "avanza", label: "Avanza" },
  { value: "nordnet", label: "Nordnet" },
  { value: "övrigt", label: "Övrigt" },
];

// ── Login CTA text ────────────────────────────────────────────────────────────

function buildLoginCTA(analysis: PortfolioAnalysis): string {
  const benefits: string[] = [];

  if (
    analysis.suggestedMetrics &&
    analysis.avgCost !== null &&
    analysis.suggestedMetrics.avgCost !== null
  ) {
    const saving = analysis.avgCost - analysis.suggestedMetrics.avgCost;
    if (saving >= 0.05) {
      benefits.push(`sänka din avgift med ${saving.toFixed(2)} procentenheter per år`);
    }
  }

  if (
    analysis.suggestedMetrics &&
    analysis.weightedReturn1yr !== null &&
    analysis.suggestedMetrics.weightedReturn1yr !== null
  ) {
    const gain = analysis.suggestedMetrics.weightedReturn1yr - analysis.weightedReturn1yr;
    if (gain >= 1) {
      benefits.push(`öka din historiska avkastning med ${gain.toFixed(1)}%`);
    }
  }

  if (benefits.length === 0)
    return "Logga in för att se personliga fondbytesförslag för din portfölj.";

  return `Logga in för att se fondbytesförslagen — med optimerade fonder kan du potentiellt ${benefits.join(" och ")}.`;
}

// ── Blur gate ─────────────────────────────────────────────────────────────────

function BlurGate({
  children,
  unlocked,
  ctaText,
  onLoginClick,
}: {
  children: React.ReactNode;
  unlocked: boolean;
  ctaText: string;
  onLoginClick: () => void;
}) {
  if (unlocked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl p-8 text-center bg-white/85 backdrop-blur-[2px]">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Fondbytesförslag</h3>
        <p className="text-sm text-slate-500 mb-5 max-w-xs leading-relaxed">{ctaText}</p>
        <button
          onClick={onLoginClick}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors"
        >
          Logga in kostnadsfritt
        </button>
      </div>
    </div>
  );
}

// ── Fund quiz ─────────────────────────────────────────────────────────────────

type QuizFundResult = {
  isin: string;
  name: string;
  category: string | null;
  sharpe_3yr: number | null;
  return_1yr: number | null;
  return_3yr: number | null;
  ongoing_cost_actual: number | null;
  ongoing_cost_estimated: number | null;
};

type QuizScreen = "asset" | "market" | "sector" | "management" | "cost" | "sort" | "results";

type QuizAnswers = {
  assetClass: string | null;
  market: string | null;
  sector: string | null;
  management: string | null;
  maxCost: number | null;
  sortBy: string | null;
};

const ASSET_OPTIONS = [
  { value: "equity", emoji: "📈", label: "Aktiefonder", desc: "Investerar i börsnoterade bolag" },
  { value: "fixed-income", emoji: "🏦", label: "Räntefonder", desc: "Obligationer och penningmarknad" },
  { value: "allocation", emoji: "⚖️", label: "Blandfonder", desc: "Blandning av aktier och räntor" },
  { value: "alternative", emoji: "🎲", label: "Alternativa fonder", desc: "Hedgefonder och råvaror" },
];

const MARKET_OPTIONS = [
  { value: "global", emoji: "🌍", label: "Globalt" },
  { value: "sweden", emoji: "🇸🇪", label: "Sverige" },
  { value: "usa", emoji: "🇺🇸", label: "USA" },
  { value: "europe", emoji: "🇪🇺", label: "Europa" },
  { value: "nordic", emoji: "❄️", label: "Norden" },
  { value: "emerging", emoji: "🌏", label: "Tillväxtmarknader" },
  { value: "asia", emoji: "🏯", label: "Asien" },
  { value: "sector", emoji: "🔬", label: "Bransch/tema" },
];

const SECTOR_OPTIONS = [
  { value: "tech", emoji: "💻", label: "Teknik" },
  { value: "health", emoji: "🧬", label: "Hälsa & biotech" },
  { value: "real-estate", emoji: "🏢", label: "Fastigheter" },
  { value: "energy", emoji: "⚡", label: "Energi & råvaror" },
  { value: "other-sector", emoji: "🏭", label: "Annan bransch" },
];

const MANAGEMENT_OPTIONS = [
  { value: "any", emoji: "🤷", label: "Spelar ingen roll", desc: "Visa alla förvaltningsstilar" },
  { value: "passive", emoji: "📊", label: "Indexfond", desc: "Följer ett index, låg avgift" },
  { value: "active", emoji: "🧠", label: "Aktivt förvaltad", desc: "Fondförvaltare väljer placeringar" },
];

const COST_OPTIONS = [
  { value: null, emoji: "🔓", label: "Ingen gräns", desc: "Visa alla avgiftsnivåer" },
  { value: 0.3, emoji: "💎", label: "Max 0,3%", desc: "Riktigt billiga fonder" },
  { value: 0.5, emoji: "💰", label: "Max 0,5%", desc: "Prisvärd nivå" },
  { value: 1.0, emoji: "📝", label: "Max 1,0%", desc: "Inkluderar aktiva fonder" },
];

const SORT_OPTIONS = [
  { value: "sharpe", emoji: "🏆", label: "Bäst riskjusterad avkastning", desc: "Avkastning i förhållande till risk" },
  { value: "return", emoji: "🚀", label: "Bäst historisk avkastning", desc: "Högst 3-årsavkastning" },
  { value: "cost", emoji: "💸", label: "Lägst avgift", desc: "Billigast fondavgift" },
];

// Build the ordered step list for the current path
function getSteps(a: QuizAnswers): QuizScreen[] {
  const steps: QuizScreen[] = ["asset"];
  if (a.assetClass === "equity") {
    steps.push("market");
    if (a.market === "sector") steps.push("sector");
  }
  steps.push("management", "cost", "sort");
  return steps;
}

function getNextScreen(current: QuizScreen, a: QuizAnswers): QuizScreen | "done" {
  const steps = getSteps(a);
  const idx = steps.indexOf(current);
  if (idx === -1 || idx === steps.length - 1) return "done";
  return steps[idx + 1];
}

function getPrevScreen(current: QuizScreen, a: QuizAnswers): QuizScreen {
  const steps = getSteps(a);
  const idx = steps.indexOf(current);
  if (idx <= 0) return "asset";
  return steps[idx - 1];
}

function FundQuiz({
  custodian,
  onAdd,
  existingIsins,
}: {
  custodian: string;
  onAdd: (isin: string, name: string) => void;
  existingIsins: string[];
}) {
  const PAGE = 8;
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<QuizScreen>("asset");
  const [answers, setAnswers] = useState<QuizAnswers>({
    assetClass: null, market: null, sector: null, management: null, maxCost: null, sortBy: null,
  });
  const [allResults, setAllResults] = useState<QuizFundResult[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = allResults.slice(0, visibleCount);
  const hasMore = visibleCount < allResults.length;

  function pick(field: keyof QuizAnswers, value: QuizAnswers[keyof QuizAnswers]) {
    const next = { ...answers, [field]: value };
    setAnswers(next);
    const nextScreen = getNextScreen(screen, next);
    if (nextScreen === "done") {
      runSearch(next);
    } else {
      setScreen(nextScreen);
    }
  }

  async function runSearch(a: QuizAnswers) {
    setScreen("results");
    setLoading(true);
    setError(null);
    setAllResults([]);
    setVisibleCount(PAGE);
    try {
      const res = await fetch("/api/fund-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custodian,
          assetClass: a.assetClass,
          market: a.assetClass === "equity" ? (a.market ?? undefined) : undefined,
          sector: a.market === "sector" ? (a.sector ?? undefined) : undefined,
          management: a.management === "any" ? undefined : (a.management ?? undefined),
          maxCost: a.maxCost,
          sortBy: a.sortBy ?? "sharpe",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Okänt fel");
      setAllResults(data.funds ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setScreen("asset");
    setAnswers({ assetClass: null, market: null, sector: null, management: null, maxCost: null, sortBy: null });
    setAllResults([]);
    setError(null);
  }

  function getSummaryPills(a: QuizAnswers): string[] {
    const pills: string[] = [];
    const asset = ASSET_OPTIONS.find((o) => o.value === a.assetClass);
    if (asset) pills.push(`${asset.emoji} ${asset.label}`);
    if (a.assetClass === "equity" && a.market) {
      const m = MARKET_OPTIONS.find((o) => o.value === a.market);
      if (m) pills.push(`${m.emoji} ${m.label}`);
    }
    if (a.market === "sector" && a.sector) {
      const s = SECTOR_OPTIONS.find((o) => o.value === a.sector);
      if (s) pills.push(`${s.emoji} ${s.label}`);
    }
    if (a.management && a.management !== "any") {
      const m = MANAGEMENT_OPTIONS.find((o) => o.value === a.management);
      if (m) pills.push(`${m.emoji} ${m.label}`);
    }
    if (a.maxCost !== null && a.maxCost !== undefined) {
      pills.push(`💰 Max ${String(a.maxCost).replace(".", ",")}% avgift`);
    }
    return pills;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        Hitta fonder med AI
      </button>
    );
  }

  // Step progress (only for non-results screens)
  const steps = getSteps(answers);
  const stepIdx = steps.indexOf(screen); // -1 on results screen
  const isResults = screen === "results";

  const STEP_QUESTIONS: Record<QuizScreen, string> = {
    asset: "Vilken typ av fond?",
    market: "Vilken marknad?",
    sector: "Vilken bransch?",
    management: "Förvaltningsstil?",
    cost: "Maximal avgift?",
    sort: "Vad prioriterar du?",
    results: "Resultat",
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-blue-100 shadow-sm">
      {/* Coloured header bar */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white text-sm font-semibold tracking-wide">
            {isResults ? "Dina fonder" : "AI-fondssökning"}
          </span>
          <button type="button" onClick={handleClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress dots */}
        {!isResults && (
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i < stepIdx ? "bg-white w-5" :
                  i === stepIdx ? "bg-white w-8" :
                  "bg-white/30 w-3"
                }`}
              />
            ))}
            <span className="ml-auto text-white/80 text-xs font-medium">
              {stepIdx + 1} / {steps.length}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="bg-white p-4 space-y-3">
        {/* Question heading */}
        {!isResults && (
          <p className="text-base font-bold text-slate-800">{STEP_QUESTIONS[screen]}</p>
        )}

        {/* Asset class */}
        {screen === "asset" && (
          <div className="grid gap-2">
            {ASSET_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick("assetClass", o.value)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
              >
                <span className="text-2xl">{o.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">{o.label}</p>
                  <p className="text-xs text-slate-400">{o.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Market */}
        {screen === "market" && (
          <div className="grid grid-cols-2 gap-2">
            {MARKET_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick("market", o.value)}
                className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <span className="text-2xl">{o.emoji}</span>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700">{o.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Sector */}
        {screen === "sector" && (
          <div className="grid grid-cols-2 gap-2">
            {SECTOR_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick("sector", o.value)}
                className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <span className="text-2xl">{o.emoji}</span>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700">{o.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Management */}
        {screen === "management" && (
          <div className="grid gap-2">
            {MANAGEMENT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick("management", o.value)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
              >
                <span className="text-2xl">{o.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">{o.label}</p>
                  <p className="text-xs text-slate-400">{o.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Cost */}
        {screen === "cost" && (
          <div className="grid grid-cols-2 gap-2">
            {COST_OPTIONS.map((o) => (
              <button
                key={String(o.value)}
                type="button"
                onClick={() => pick("maxCost", o.value)}
                className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <span className="text-2xl">{o.emoji}</span>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700">{o.label}</span>
                <span className="text-xs text-slate-400">{o.desc}</span>
              </button>
            ))}
          </div>
        )}

        {/* Sort */}
        {screen === "sort" && (
          <div className="grid gap-2">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick("sortBy", o.value)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
              >
                <span className="text-2xl">{o.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">{o.label}</p>
                  <p className="text-xs text-slate-400">{o.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {isResults && (
          <>
            {/* Filter summary pills */}
            {getSummaryPills(answers).length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pb-1">
                {getSummaryPills(answers).map((pill) => (
                  <span key={pill} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-medium">
                    {pill}
                  </span>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <p className="text-sm text-slate-500">Söker bland alla fonder…</p>
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {!loading && !error && allResults.length === 0 && (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">🤔</p>
                <p className="text-sm text-slate-600 font-medium">Inga fonder hittades</p>
                <p className="text-xs text-slate-400 mt-1">Försök med andra kriterier</p>
              </div>
            )}
            {!loading && allResults.length > 0 && (
              <p className="text-xs text-slate-400 font-medium">{allResults.length} fonder hittades</p>
            )}
            {results.length > 0 && (
              <div className="grid gap-2">
                {results.map((f) => {
                  const cost = f.ongoing_cost_actual ?? f.ongoing_cost_estimated;
                  const alreadyAdded = existingIsins.includes(f.isin);
                  return (
                    <div
                      key={f.isin}
                      className="flex items-center justify-between gap-3 border border-slate-100 rounded-xl px-4 py-3 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{f.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                          {f.category && <span>{f.category}</span>}
                          {f.sharpe_3yr !== null && <span>Sharpe {f.sharpe_3yr.toFixed(2)}</span>}
                          {f.return_1yr !== null && <span>{f.return_1yr.toFixed(1)}% 1 år</span>}
                          {cost !== null && <span>{cost.toFixed(2)}% avgift</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => onAdd(f.isin, f.name)}
                        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500"
                      >
                        {alreadyAdded ? "Tillagd" : "+ Lägg till"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {hasMore && (
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE)}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-2 border border-blue-100 rounded-xl hover:bg-blue-50 transition-colors"
              >
                Visa fler ({allResults.length - visibleCount} kvar)
              </button>
            )}
          </>
        )}

        {/* Back button */}
        {screen !== "asset" && !(isResults && loading) && (
          <button
            type="button"
            onClick={() => {
              if (isResults) { setAllResults([]); setError(null); }
              setScreen(getPrevScreen(screen, answers));
            }}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors pt-1"
          >
            ← Tillbaka
          </button>
        )}
      </div>
    </div>
  );
}

// ── Fund search input with autocomplete ───────────────────────────────────────

function FundSearchInput({
  isin,
  name,
  custodian,
  excludeIsins,
  onSelect,
  onClear,
}: {
  isin: string;
  name: string;
  custodian: string;
  excludeIsins: string[];
  onSelect: (isin: string, name: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<FundSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (isin) {
    return (
      <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white min-w-0">
        <span className="flex-1 truncate font-medium text-slate-900">{name}</span>
        <span className="text-xs text-slate-400 shrink-0">{isin}</span>
        <button type="button" onClick={onClear} className="text-slate-400 hover:text-red-500 shrink-0 transition-colors">✕</button>
      </div>
    );
  }

  function handleChange(q: string) {
    setQuery(q);
    if (debounce.current) clearTimeout(debounce.current);
    if (q.length < 2) { setSuggestions([]); setNoResults(false); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      const res = await fetch(`/api/funds/search?q=${encodeURIComponent(q)}&custodian=${encodeURIComponent(custodian)}`);
      const data: FundSuggestion[] = (await res.json()).filter(
        (s: FundSuggestion) => !excludeIsins.includes(s.isin)
      );
      setSuggestions(data);
      setNoResults(data.length === 0);
      setOpen(true);
    }, 200);
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Sök fondnamn eller ISIN…"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full border border-slate-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={`${s.isin}-${i}`}
              onMouseDown={() => { onSelect(s.isin, s.name); setQuery(""); setOpen(false); setNoResults(false); }}
              className="px-3 py-3 text-sm cursor-pointer hover:bg-blue-50 flex items-center justify-between gap-3"
            >
              <span className="font-medium text-slate-900">{s.name}</span>
              <span className="text-xs text-slate-400 shrink-0">{s.isin}</span>
            </li>
          ))}
        </ul>
      )}
      {open && noResults && (
        <div className="absolute z-10 top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 px-3 py-3 text-sm text-slate-500">
          Ingen fond hittades för &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}

// ── Custodian dropdown ────────────────────────────────────────────────────────

function CustodianDropdown({ onSelect }: { onSelect: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = CUSTODIANS.find((c) => c.value === selected);

  return (
    <div ref={ref} className="relative w-full sm:w-72">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 bg-white text-sm font-medium transition-all
          ${open ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"}`}
      >
        <span className={current ? "text-slate-900" : "text-slate-400"}>
          {current ? current.label : "Välj depåinstitut…"}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-10 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {CUSTODIANS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => { setSelected(c.value); setOpen(false); onSelect(c.value); }}
              className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-blue-50 hover:text-blue-700
                ${selected === c.value ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const SESSION_KEY = "fondanalys_state";

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { custodian: string | null; entries: Entry[]; analysis: PortfolioAnalysis | null };
  } catch { return null; }
}

function saveSession(custodian: string | null, entries: Entry[], analysis: PortfolioAnalysis | null) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ custodian, entries, analysis }));
  } catch { /* ignore */ }
}

export default function AnalyzeClient() {
  const router = useRouter();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [custodian, setCustodian] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([{ isin: "", name: "", weight: "" }]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [riskProfile, setRiskProfile] = useState<object | null | undefined>(undefined);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [inputMode, setInputMode] = useState<"weight" | "amount">("weight");

  // Portfolio saving state
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [savingName, setSavingName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedPortfolios, setSavedPortfolios] = useState<SavedPortfolio[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(() =>
    new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").has("portfolio")
  );

  // Warm up fund cache as soon as page loads so search is instant
  useEffect(() => {
    fetch("/api/funds/search?q=__warmup__&custodian=avanza").catch(() => {});
    fetch("/api/funds/search?q=__warmup__&custodian=nordnet").catch(() => {});
  }, []);

  // Restore state from sessionStorage on mount, or load portfolio from URL param
  useEffect(() => {
    const portfolioParam = new URLSearchParams(window.location.search).get("portfolio");
    if (portfolioParam) {
      // Load saved portfolio from DB, ignore sessionStorage
      setPortfolioLoading(true);
      fetch(`/api/portfolios/${portfolioParam}`)
        .then((r) => r.ok ? r.json() : null)
        .then((p) => {
          if (p) {
            setCustodian(p.custodian);
            setEntries(p.holdings);
            setAnalysis(p.analysis);
            setPortfolioId(p.id);
            sessionStorage.removeItem(SESSION_KEY);
          }
          router.replace("/analyze");
        })
        .catch(() => router.replace("/analyze"))
        .finally(() => setPortfolioLoading(false));
      return;
    }

    const saved = loadSession();
    if (saved) {
      if (saved.custodian) setCustodian(saved.custodian);
      if (saved.entries?.length) setEntries(saved.entries);
      if (saved.analysis) setAnalysis(saved.analysis);
      sessionStorage.removeItem(SESSION_KEY); // one-time use — clear after restoring
    } else {
      // Fall back to preferred custodian from account settings
      const preferred = localStorage.getItem("fondanalys_preferred_custodian");
      if (preferred) setCustodian(preferred);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) {
        fetch("/api/portfolios")
          .then((r) => r.ok ? r.json() : [])
          .then(setSavedPortfolios)
          .catch(() => {});
        fetch("/api/risk-profile")
          .then((r) => r.ok ? r.json() : null)
          .then((p) => setRiskProfile(p ?? null))
          .catch(() => setRiskProfile(null));
      } else {
        setRiskProfile(null);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  function loadPortfolio(p: SavedPortfolio) {
    setCustodian(p.custodian);
    setEntries(p.holdings);
    setAnalysis(p.analysis);
    setPortfolioId(p.id);
    setError(null);
    setInputMode(p.holdings.some((h) => h.amount) ? "amount" : "weight");
  }

  // Distributes the difference between 100 and the current total evenly across funds.
  // Returns the new entries array (synchronously) so analyze() can use them immediately.
  function distributeWeights(src: Entry[] = entries): Entry[] {
    const withWeights = src.filter((e) => e.isin.trim() && e.weight.trim());
    if (withWeights.length === 0) return src;
    const n = withWeights.length;
    const currentTotal = withWeights.reduce((s, e) => s + (parseFloat(e.weight) || 0), 0);
    const diffTenths = Math.round((100 - currentTotal) * 10); // work in 0.1% units
    if (diffTenths === 0) return src;
    // Distribute: base adjustment + remainder to first fund
    const baseTenths = Math.trunc(diffTenths / n);
    const remainderTenths = diffTenths - baseTenths * n;
    let idx = 0;
    const newEntries = src.map((e) => {
      if (!e.isin.trim() || !e.weight.trim()) return e;
      const curTenths = Math.round((parseFloat(e.weight) || 0) * 10);
      const adjTenths = idx === 0 ? baseTenths + remainderTenths : baseTenths;
      idx++;
      return { ...e, weight: (Math.max(0, curTenths + adjTenths) / 10).toFixed(1) };
    });
    setEntries(newEntries);
    return newEntries;
  }

  function addRow() { setEntries((p) => [...p, { isin: "", name: "", weight: "", amount: "" }]); }
  function removeRow(i: number) { setEntries((p) => p.filter((_, idx) => idx !== i)); }
  function selectFund(i: number, isin: string, name: string) {
    setEntries((p) => p.map((e, idx) => idx === i ? { ...e, isin, name } : e));
  }
  function clearFund(i: number) {
    setEntries((p) => p.map((e, idx) => idx === i ? { ...e, isin: "", name: "" } : e));
  }
  function updateWeight(i: number, value: string) {
    setEntries((p) => p.map((e, idx) => idx === i ? { ...e, weight: value } : e));
  }
  function updateAmount(i: number, value: string) {
    setEntries((p) => p.map((e, idx) => idx === i ? { ...e, amount: value } : e));
  }

  const LOADING_STEPS = [
    "Hämtar fonddata…",
    "Beräknar avkastning och risk…",
    "Genererar bytesförslag…",
    "Sammanställer analys…",
  ];

  async function analyze() {
    setError(null);
    setAnalysis(null);

    let workingEntries = entries;

    if (inputMode === "amount") {
      // Compute weights from amounts
      const validAmt = entries.filter((e) => e.isin.trim() && (e.amount ?? "").trim());
      if (validAmt.length === 0) { setError("Lägg till minst en fond med belopp."); return; }
      const totalAmt = validAmt.reduce((s, e) => s + (parseFloat(e.amount || "0") || 0), 0);
      if (totalAmt === 0) { setError("Ange belopp för dina fonder."); return; }
      workingEntries = entries.map((e) => {
        if (!e.isin.trim() || !(e.amount ?? "").trim()) return e;
        const w = ((parseFloat(e.amount || "0") / totalAmt) * 100).toFixed(1);
        return { ...e, weight: w };
      });
      setEntries(workingEntries);
    } else {
      // Auto-distribute if weights don't sum to 100
      const currentTotal = entries.reduce((s, e) => s + (parseFloat(e.weight) || 0), 0);
      if (Math.abs(currentTotal - 100) > 0.1) {
        workingEntries = distributeWeights(entries);
      }
    }

    const valid = workingEntries.filter((e) => e.isin.trim() && e.weight.trim());
    if (valid.length === 0) { setError("Lägg till minst en fond med vikt."); return; }
    setLoading(true);
    setLoadingStep(0);
    const stepInterval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 500);
    const minDelay = new Promise((r) => setTimeout(r, 1800));
    try {
      const [res] = await Promise.all([
        fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ custodian, entries: valid.map((e) => ({ isin: e.isin.trim().toUpperCase(), weight: parseFloat(e.weight) })) }),
        }),
        minDelay,
      ]);
      clearInterval(stepInterval);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Okänt fel");
      setAnalysis(data);
      setTimeout(() => {
        if (resultsRef.current) {
          const top = resultsRef.current.getBoundingClientRect().top + window.scrollY - 88;
          window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        }
      }, 150);

      // Auto-save if editing an existing portfolio
      if (portfolioId) {
        setSaveStatus("saving");
        fetch(`/api/portfolios/${portfolioId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ holdings: entries, analysis: data }),
        })
          .then((r) => setSaveStatus(r.ok ? "saved" : "error"))
          .catch(() => setSaveStatus("error"))
          .finally(() => setTimeout(() => setSaveStatus("idle"), 3000));
      }
    } catch (err: unknown) {
      clearInterval(stepInterval);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveNew() {
    if (!savingName.trim() || !analysis || !custodian) return;
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: savingName.trim(), custodian, holdings: entries, analysis }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPortfolioId(data.id);
      setSavedPortfolios((prev) => [...prev, data]);
      setShowSaveForm(false);
      setSavingName("");
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    }
  }

  const totalWeight = entries.reduce((s, e) => s + (parseFloat(e.weight) || 0), 0);
  const totalAmount = entries.reduce((s, e) => s + (parseFloat(e.amount || "0") || 0), 0);
  const portfolioValue = inputMode === "amount" && totalAmount > 0 ? totalAmount : null;

  if (portfolioLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }
    
  if (!custodian) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-20 space-y-8 sm:space-y-10">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Analysera din portfölj
            </h1>
            <p className="text-slate-600 text-base max-w-md mx-auto leading-relaxed">
              Lägg in dina fonder och se om du betalar för mycket i avgifter, hur risken ser ut — och få förslag på bättre alternativ.
            </p>
            <p className="text-slate-400 text-sm">Välj var du förvaltar dina fonder så hämtar vi rätt fondutbud.</p>
          </div>

          {/* Saved portfolios */}
          {savedPortfolios.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">Mina portföljer</p>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {savedPortfolios.map((p) => {
                  const custodianLabel = p.custodian === "nordnet" ? "Nordnet" : p.custodian === "övrigt" ? "Övrigt" : "Avanza";
                  return (
                    <button
                      key={p.id}
                      onClick={() => loadPortfolio(p)}
                      className="text-sm px-3 py-1.5 rounded-lg border bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600 transition-all flex items-baseline gap-1.5"
                    >
                      {p.name}
                      <span className="text-xs opacity-70">{custodianLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cards */}
          <div className="grid sm:grid-cols-3 gap-5 w-full">
            {[
              {
                value: "avanza",
                label: "Avanza",
                funds: "1 500+",
                description: "Sveriges största nätmäklare med ett brett utbud av fonder.",
                icon: Landmark,
              },
              {
                value: "nordnet",
                label: "Nordnet",
                funds: "1 700+",
                description: "Nordisk nätmäklare med ett av marknadens bredaste fondutbud.",
                icon: Landmark,
              },
              {
                value: "övrigt",
                label: "Övrigt",
                description: "Sök bland alla tillgängliga fonder oavsett depå.",
                icon: Search,
              },
            ].map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCustodian(c.value)}
                className={cn(
                  "group text-left rounded-2xl border p-6 space-y-4 transition-all duration-300",
                  "bg-white/80 backdrop-blur",
                  "border-slate-200 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1"
                )}
              >
                {/* Top */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <c.icon className="w-5 h-5 text-blue-500" />
                    <p className="font-bold text-slate-900">{c.label}</p>
                  </div>

                  {"funds" in c && (
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                      {c.funds} fonder
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 leading-relaxed">
                  {c.description}
                </p>

                {/* CTA */}
                <div className="text-sm font-medium text-blue-600 flex items-center gap-1">
                  Välj {c.label}
                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6 max-w-xs mx-auto px-6">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-base font-medium text-slate-700">{LOADING_STEPS[loadingStep]}</p>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Risk profile nudge — shown when logged in with no risk profile */}
      {user && riskProfile === null && !nudgeDismissed && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <span className="text-amber-500 shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
          </span>
          <p className="text-sm text-amber-800 flex-1 leading-relaxed">
            Du har ingen riskprofil ännu.{" "}
            <a href="/risk-profile" className="font-medium underline hover:text-amber-900">Ta fram din →</a>
          </p>
          <button onClick={() => setNudgeDismissed(true)} className="text-amber-400 hover:text-amber-600 shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Saved portfolios switcher — only shown when logged in with saved portfolios */}
      {savedPortfolios.length > 0 && (
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-full sm:w-auto">Mina portföljer</span>
          <div className="flex items-center gap-2 flex-wrap">
            {savedPortfolios.map((p) => {
              const differentCustodian = custodian && p.custodian !== custodian;
              const custodianLabel = p.custodian === "nordnet" ? "Nordnet" : p.custodian === "övrigt" ? "Övrigt" : "Avanza";
              return (
                <button
                  key={p.id}
                  onClick={() => loadPortfolio(p)}
                  className={cn(
                    "text-sm px-3 py-1.5 rounded-lg border transition-all flex items-baseline gap-1.5",
                    portfolioId === p.id
                      ? "bg-blue-50 border-blue-200 text-blue-700 font-medium"
                      : "bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
                  )}
                >
                  {p.name}
                  <span className="text-xs opacity-70">
                    {custodianLabel}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => { setPortfolioId(null); setCustodian(null); setEntries([{ isin: "", name: "", weight: "" }]); setAnalysis(null); setError(null); }}
              className={cn(
                "text-sm px-3 py-1.5 rounded-lg border transition-all",
                !portfolioId
                  ? "bg-blue-50 border-blue-200 text-blue-700 font-medium"
                  : "bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
              )}
            >
              + Ny portfölj
            </button>
          </div>
          {portfolioId && (
            <span className="text-xs text-slate-400 ml-auto">
              {saveStatus === "saving" && "Sparar…"}
              {saveStatus === "saved" && "Sparad ✓"}
              {saveStatus === "error" && "Kunde inte spara"}
            </span>
          )}
        </div>
      )}

      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900 shrink-0">Din portfölj</h2>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => setInputMode(inputMode === "weight" ? "amount" : "weight")}
              className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors whitespace-nowrap"
            >
              {inputMode === "weight" ? "Ange belopp" : "Ange vikter (%)"}
            </button>
            <button
              onClick={() => { setCustodian(null); setAnalysis(null); setError(null); setPortfolioId(null); setEntries([{ isin: "", name: "", weight: "" }]); }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap"
            >
              {CUSTODIANS.find((c) => c.value === custodian)?.label} · <span className="underline">Byt</span>
            </button>
          </div>
        </div>
        {user ? (
          <FundQuiz
            custodian={custodian}
            existingIsins={entries.map((e) => e.isin).filter(Boolean)}
            onAdd={(isin: string, name: string) => {
              setEntries((prev) => {
                const empty = prev.findIndex((e) => !e.isin);
                if (empty !== -1) {
                  return prev.map((e, idx) => idx === empty ? { ...e, isin, name } : e);
                }
                return [...prev, { isin, name, weight: "", amount: "" }];
              });
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-600 transition-colors group"
          >
            <Sparkles className="w-4 h-4 group-hover:text-blue-500" />
            <span>Logga in för att hitta fonder med AI</span>
          </button>
        )}

        <p className="text-sm text-slate-500">
          {inputMode === "weight"
            ? "Eller sök på fondnamn eller ISIN och ange vikt (%) för varje fond."
            : "Eller sök på fondnamn eller ISIN och ange hur mycket du har investerat i varje fond (kr)."}
        </p>

        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-[1fr_100px_36px] gap-2 text-xs font-semibold text-slate-500 px-1">
            <span>Fond</span>
            <span>{inputMode === "weight" ? "Vikt (%)" : "Belopp (kr)"}</span>
            <span />
          </div>
          {entries.map((entry, i) => (
            <div key={i} className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_100px_44px]">
              <FundSearchInput isin={entry.isin} name={entry.name} custodian={custodian} excludeIsins={entries.filter((_, idx) => idx !== i).map((e) => e.isin).filter(Boolean)} onSelect={(isin, name) => selectFund(i, isin, name)} onClear={() => clearFund(i)} />
              <div className="flex gap-2 sm:contents">
                {inputMode === "weight" ? (
                  <input
                    type="number" placeholder="Vikt %" min={0} max={100}
                    value={entry.weight} onChange={(e) => updateWeight(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRow(); } }}
                    className="w-24 sm:w-auto flex-1 sm:flex-none border border-slate-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <input
                    type="number" placeholder="Belopp kr" min={0}
                    value={entry.amount ?? ""} onChange={(e) => updateAmount(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRow(); } }}
                    className="flex-1 sm:flex-none border border-slate-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
                <button
                  onClick={() => removeRow(i)} disabled={entries.length === 1}
                  className="h-12 w-12 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 disabled:opacity-30 transition-colors shrink-0"
                >✕</button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <button onClick={addRow} className="text-sm text-blue-600 hover:underline py-2">+ Lägg till fond</button>
          {inputMode === "amount" ? (
            <span className="text-sm text-slate-500">
              Totalt: <span className="font-semibold text-slate-900">
                {totalAmount > 0 ? totalAmount.toLocaleString("sv-SE") + " kr" : "–"}
              </span>
            </span>
          ) : Math.abs(totalWeight - 100) < 0.1 ? (
            <span className="text-sm font-semibold text-green-600">Summa: {totalWeight.toFixed(1)}%</span>
          ) : (
            <button onClick={() => distributeWeights()} className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors" title="Fördela jämnt">
              Summa: {totalWeight.toFixed(1)}% <span className="text-xs font-normal underline">fördela jämnt</span>
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</p>}

        <button
          onClick={analyze} disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-blue-300 disabled:to-blue-300 text-white font-medium rounded-xl py-3 transition-all shadow-md shadow-blue-200"
        >
          {loading ? "Analyserar…" : "Analysera portfölj"}
        </button>
      </section>

      <div ref={resultsRef} />
      {analysis && <AnalysisResult analysis={analysis} user={user} portfolioValue={portfolioValue} onLoginClick={() => { saveSession(custodian, entries, analysis); router.push("/login"); }} />}

      {analysis && user && !portfolioId && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
          {!showSaveForm ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Spara portföljen?</p>
                <p className="text-xs text-slate-400 mt-0.5">Kom åt den när som helst från Mitt konto.</p>
              </div>
              <button
                onClick={() => setShowSaveForm(true)}
                className="shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
              >
                Spara
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-semibold text-slate-900 text-sm">Namnge din portfölj</p>
              <input
                autoFocus
                type="text"
                placeholder="t.ex. ISK, Pension, Barnspar…"
                value={savingName}
                onChange={(e) => setSavingName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveNew()}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {saveStatus === "error" && <p className="text-xs text-red-600">Något gick fel. Försök igen.</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNew}
                  disabled={!savingName.trim() || saveStatus === "saving"}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  {saveStatus === "saving" ? "Sparar…" : "Spara"}
                </button>
                <button
                  onClick={() => { setShowSaveForm(false); setSavingName(""); }}
                  className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl border border-slate-200 transition-colors"
                >
                  Avbryt
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {analysis && user && portfolioId && saveStatus === "saved" && (
        <p className="text-center text-sm text-green-600 font-medium">Portföljen sparades ✓</p>
      )}
    </div></div>
  );
}

// ── Results ───────────────────────────────────────────────────────────────────

function AnalysisResult({ analysis, user, portfolioValue, onLoginClick }: { analysis: PortfolioAnalysis; user: User | null; portfolioValue: number | null; onLoginClick: () => void }) {
  const unlocked = !!user;
  const ctaText = buildLoginCTA(analysis);
  const [deepMode, setDeepMode] = useState(false);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <section className="bg-blue-50 border border-blue-100 rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-bold text-blue-900 mb-2">Sammanfattning</h2>
        <p className="text-sm text-blue-900 leading-relaxed">{analysis.summaryText}</p>
      </section>

      {/* Key metrics — always visible */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Nyckeltal</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metric label="Snittavgift" value={analysis.avgCost !== null ? `${analysis.avgCost.toFixed(2)}%` : "–"} sub="per år" info="Den genomsnittliga årliga avgiften viktat efter din fördelning." />
          <Metric label="Avkastning 1 år" value={analysis.weightedReturn1yr !== null ? `${analysis.weightedReturn1yr.toFixed(1)}%` : "–"} sub="viktad" info="Portföljens viktade avkastning de senaste 12 månaderna." />
          <Metric label="Avkastning 3 år" value={analysis.weightedReturn3yr !== null ? `${analysis.weightedReturn3yr.toFixed(1)}%` : "–"} sub="annualiserad" info="Genomsnittlig årlig avkastning de senaste 3 åren." />
          <Metric label="Sharpe 3 år" value={analysis.weightedSharpe !== null ? analysis.weightedSharpe.toFixed(2) : "–"} sub="riskjusterad" info="Avkastning i förhållande till risk. Högre är bättre." />
        </div>
        {deepMode && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Volatilitet" value={analysis.weightedStdDev != null ? `${analysis.weightedStdDev.toFixed(1)}%` : "–"} sub="std. avv. 3 år" info="Standardavvikelse — hur mycket portföljen svänger." />
              <Metric label="Avkastning 5 år" value={analysis.weightedReturn5yr != null ? `${analysis.weightedReturn5yr.toFixed(1)}%` : "–"} sub="annualiserad" info="Genomsnittlig årlig avkastning de senaste 5 åren." />
            </div>
          </div>
        )}
        <button
          onClick={() => setDeepMode((v) => !v)}
          className="mt-4 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          {deepMode ? "Dölj fördjupad analys ↑" : "Fördjupad analys ↓"}
        </button>
      </section>

      {/* Concentration warnings */}
      {(analysis.concentrationWarnings?.length ?? 0) > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Koncentrationsrisk</p>
            {(analysis.concentrationWarnings ?? []).map((w) => (
              <p key={w.category} className="text-sm text-amber-700 mt-0.5">
                {w.weight.toFixed(0)}% av portföljen är i {w.category.toLowerCase()} — överväg att sprida risken över fler kategorier.
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Category breakdown + active/passive — always visible */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-5">
        <h2 className="text-lg font-bold text-slate-900">Fördelning</h2>
        <div className="space-y-3">
          {analysis.categoryBreakdown.map((cat) => (
            <div key={cat.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-800">{cat.label}</span>
                <span className="font-semibold text-slate-900">{cat.weight.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${cat.weight}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Active / passive breakdown — only show if we have actual data (not all unknown) */}
        {analysis.managementBreakdown && analysis.managementBreakdown.unknown < 99.5 && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-sm font-semibold text-slate-700 mb-2">Aktiv vs. passiv förvaltning</p>
            <div className="flex h-2 rounded-full overflow-hidden gap-px">
              {analysis.managementBreakdown.passive > 0 && (
                <div className="bg-blue-500 h-full" style={{ width: `${analysis.managementBreakdown.passive}%` }} title={`Passiv ${analysis.managementBreakdown.passive.toFixed(1)}%`} />
              )}
              {analysis.managementBreakdown.active > 0 && (
                <div className="bg-violet-400 h-full" style={{ width: `${analysis.managementBreakdown.active}%` }} title={`Aktiv ${analysis.managementBreakdown.active.toFixed(1)}%`} />
              )}
              {analysis.managementBreakdown.unknown > 0 && (
                <div className="bg-slate-200 h-full" style={{ width: `${analysis.managementBreakdown.unknown}%` }} title={`Okänd ${analysis.managementBreakdown.unknown.toFixed(1)}%`} />
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {analysis.managementBreakdown.passive > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
                  Passiv (index) {analysis.managementBreakdown.passive.toFixed(1)}%
                </span>
              )}
              {analysis.managementBreakdown.active > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-violet-400 inline-block" />
                  Aktivt förvaltad {analysis.managementBreakdown.active.toFixed(1)}%
                </span>
              )}
              {analysis.managementBreakdown.unknown > 0.5 && (
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 inline-block" />
                  Uppgift saknas {analysis.managementBreakdown.unknown.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Swap suggestions + best in category — blurred if not logged in */}
      {((analysis.swapSuggestions?.length ?? 0) > 0 || (analysis.bestInCategory?.length ?? 0) > 0) && (
        <BlurGate unlocked={unlocked} ctaText={ctaText} onLoginClick={onLoginClick}>
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Fondbytesförslag</h2>
              <p className="text-sm text-slate-500">Fonder i samma kategori med bättre nyckeltal.</p>
            </div>
            {(analysis.swapSuggestions?.length ?? 0) > 0 && (() => {
              const swaps = analysis.swapSuggestions ?? [];
              // Group by suggested fund isin, sort largest groups first
              const groupMap = new Map<string, typeof swaps>();
              for (const s of swaps) {
                const key = s.suggestedFund.isin;
                if (!groupMap.has(key)) groupMap.set(key, []);
                groupMap.get(key)!.push(s);
              }
              const groups = Array.from(groupMap.values()).sort((a, b) => b.length - a.length);

              return (
                <div className="space-y-4">
                  {groups.map((group, gi) => {
                    const suggested = group[0].suggestedFund;
                    const isConsolidate = group[0].consolidate;

                    if (group.length >= 2) {
                      // ── Group card (topval / konsolidera) ──────────────────
                      return (
                        <div key={gi} className={`rounded-xl p-4 space-y-3 border-2 ${isConsolidate ? "border-blue-200 bg-blue-50/30" : "border-amber-200 bg-amber-50/30"}`}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${isConsolidate ? "text-blue-700 bg-blue-100 border-blue-200" : "text-amber-700 bg-amber-100 border-amber-200"}`}>
                              {isConsolidate ? `Konsolidera ${group.length} fonder hit` : `Topval — bättre än ${group.length} fonder`}
                            </span>
                          </div>
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
                                <div className="min-w-0">
                                  <span className="font-medium text-slate-800">{s.currentFund.name}</span>
                                  <span className="text-xs text-slate-400 ml-2">{s.currentFund.isin}</span>
                                </div>
                                {s.reason && (
                                  <span className="text-xs text-green-600 shrink-0 text-right max-w-[45%]">{s.reason}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    // ── Single swap card ────────────────────────────────────
                    const s = group[0];
                    return (
                      <div key={gi} className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50">
                        {s.consolidate ? (
                          <>
                            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Överväg att sälja</p>
                                <p className="font-semibold text-sm text-slate-900 break-words">{s.currentFund.name}</p>
                                <p className="text-xs text-slate-400">{s.currentFund.isin}</p>
                              </div>
                              <span className="text-slate-400 text-lg sm:mt-3 self-start sm:self-auto">↓<span className="hidden sm:inline">→</span></span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Öka i befintlig fond</p>
                                <p className="font-semibold text-sm text-slate-900 break-words">{s.suggestedFund.name}</p>
                                <p className="text-xs text-slate-400">{s.suggestedFund.isin}</p>
                              </div>
                            </div>
                            {s.similarityNote && <p className="text-xs text-slate-400 italic">{s.similarityNote}</p>}
                            <p className="text-sm text-slate-600">
                              <span className="font-semibold text-blue-600">Konsolidera: </span>
                              Du har redan {s.suggestedFund.name} i portföljen och den är den bästa fonden i kategorin. Flytta kapitalet från {s.currentFund.name} dit istället.{s.reason && ` (${s.reason})`}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nuvarande fond</p>
                                <p className="font-semibold text-sm text-slate-900 break-words">{s.currentFund.name}</p>
                                <p className="text-xs text-slate-400">{s.currentFund.isin}</p>
                              </div>
                              <span className="text-slate-400 text-lg sm:mt-3 self-start sm:self-auto">↓<span className="hidden sm:inline">→</span></span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Föreslagen fond</p>
                                <p className="font-semibold text-sm text-slate-900 break-words">{s.suggestedFund.name}</p>
                                <p className="text-xs text-slate-400">{s.suggestedFund.isin}</p>
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
                  })}
                </div>
              );
            })()}
            {(analysis.bestInCategory?.length ?? 0) > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                  <p className="text-sm font-bold text-green-900">Redan bäst i sin kategori</p>
                </div>
                <div className="space-y-1">
                  {(analysis.bestInCategory ?? []).map((f) => (
                    <div key={f.isin} className="flex items-baseline justify-between text-sm">
                      <span className="font-medium text-green-900">{f.fundName}</span>
                      <span className="text-xs text-green-600 ml-3 shrink-0">{f.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </BlurGate>
      )}

      {/* Suggested portfolio — only visible when logged in */}
      {analysis.suggestedMetrics && unlocked && (
        <SuggestedPortfolio
          current={{ avgCost: analysis.avgCost, weightedReturn1yr: analysis.weightedReturn1yr, weightedReturn3yr: analysis.weightedReturn3yr, weightedSharpe: analysis.weightedSharpe }}
          suggested={analysis.suggestedMetrics}
          portfolioValue={portfolioValue}
        />
      )}

      {analysis.notFound.length > 0 && (
        <section className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-sm text-amber-800">
            <span className="font-medium">Hittades inte: </span>{analysis.notFound.join(", ")}
          </p>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value, sub, info }: { label: string; value: string; sub: string; info: string }) {
  return (
    <div className="relative group bg-slate-50 rounded-xl p-4">
      
      {/* Tooltip (centered on card, above it) */}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44
        bg-slate-400/90 backdrop-blur-sm text-white text-xs
        rounded-xl px-2.5 py-1.5
        opacity-0 group-hover:opacity-100 transition-opacity
        z-10 text-center leading-snug
        shadow-md shadow-slate-500/20
        ring-1 ring-white/20">
        {info}
      </span>

      <div className="flex items-center gap-1 mb-1">
        <p className="text-xs font-semibold text-slate-500">{label}</p>

        {/* Info icon */}
        <span className="flex items-center justify-center w-3 h-3 rounded-full bg-slate-300 text-[9px] text-white cursor-default">
          i
        </span>
      </div>

      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

type CurrentMetrics = { avgCost: number | null; weightedReturn1yr: number | null; weightedReturn3yr: number | null; weightedSharpe: number | null };

function delta(next: number | null, prev: number | null, lowerIsBetter = false) {
  if (next === null || prev === null) return null;
  const diff = next - prev;
  return { diff, better: lowerIsBetter ? diff < 0 : diff > 0 };
}

function fmt(v: number | null, decimals = 2) {
  return v !== null ? `${v.toFixed(decimals)}%` : "–";
}

function SuggestedPortfolio({ current, suggested, portfolioValue }: { current: CurrentMetrics; suggested: SuggestedMetrics; portfolioValue: number | null }) {
  const assumed = portfolioValue === null;
  const pv = portfolioValue ?? 100_000;
  const feeSavingsKr = current.avgCost !== null && suggested.avgCost !== null
    ? (current.avgCost - suggested.avgCost) / 100 * pv : null;
  const returnGainKr = current.weightedReturn1yr !== null && suggested.weightedReturn1yr !== null
    ? (suggested.weightedReturn1yr - current.weightedReturn1yr) / 100 * pv : null;
  const totalGainKr = feeSavingsKr !== null && returnGainKr !== null ? feeSavingsKr + returnGainKr : null;

  const rows = [
    { label: "Snittavgift", sub: "per år", currentVal: current.avgCost, suggestedVal: suggested.avgCost, lowerIsBetter: true },
    { label: "Avkastning 1 år", sub: "viktad", currentVal: current.weightedReturn1yr, suggestedVal: suggested.weightedReturn1yr },
    { label: "Avkastning 3 år", sub: "annualiserad", currentVal: current.weightedReturn3yr, suggestedVal: suggested.weightedReturn3yr },
    { label: "Sharpe 3 år", sub: "riskjusterad", currentVal: current.weightedSharpe, suggestedVal: suggested.weightedSharpe },
  ];

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Föreslagen portfölj</h2>
        <p className="text-sm text-slate-400 mt-0.5">Nyckeltal om du genomför alla förslag ovan.</p>
      </div>

      {/* Mobile: card stack */}
      <div className="sm:hidden space-y-2">
        {rows.map((row) => {
          const d = delta(row.suggestedVal, row.currentVal, row.lowerIsBetter);
          return (
            <div key={row.label} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
              <div>
                <p className="text-xs font-semibold text-slate-700">{row.label}</p>
                <p className="text-xs text-slate-400">{row.sub}</p>
              </div>
              <div className="text-right space-y-0.5">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-xs text-slate-400">{fmt(row.currentVal)}</span>
                  <span className="text-xs text-slate-300">→</span>
                  <span className="text-sm font-bold text-slate-900">{fmt(row.suggestedVal)}</span>
                </div>
                {d && (
                  <p className={`text-xs font-semibold ${d.better ? "text-green-600" : "text-red-500"}`}>
                    {d.diff > 0 ? "▲" : "▼"} {Math.abs(d.diff).toFixed(2)}%
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100">
              <th className="text-left py-2 pr-4">Nyckeltal</th>
              <th className="text-right py-2 px-4">Nuvarande</th>
              <th className="text-right py-2 px-4">Föreslagen</th>
              <th className="text-right py-2 pl-4">Förändring</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row) => {
              const d = delta(row.suggestedVal, row.currentVal, row.lowerIsBetter);
              return (
                <tr key={row.label} className="text-slate-800">
                  <td className="py-3 pr-4">
                    <span className="font-medium">{row.label}</span>
                    <span className="text-xs text-slate-400 ml-1">{row.sub}</span>
                  </td>
                  <td className="text-right py-3 px-4 text-slate-400">{fmt(row.currentVal)}</td>
                  <td className="text-right py-3 px-4 font-semibold">{fmt(row.suggestedVal)}</td>
                  <td className="text-right py-3 pl-4 font-semibold">
                    {d ? (
                      <span className={d.better ? "text-green-600" : "text-red-500"}>
                        {d.diff > 0 ? "▲" : "▼"} {Math.abs(d.diff).toFixed(2)}%
                      </span>
                    ) : <span className="text-slate-400">–</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Fondinnehav</p>
        <div className="space-y-1">
          {suggested.funds.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
              <div>
                <span className="font-medium text-slate-900">{f.name}</span>
                <span className="text-xs text-slate-400 ml-2">{f.isin}</span>
              </div>
              <span className="font-semibold text-slate-600">{f.weight.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* SEK profit estimate */}
      <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-green-900">Uppskattad vinst per år</p>
          {!assumed && (
            <span className="text-xs text-slate-500 italic">
              Beräknat på din investering av {pv.toLocaleString("sv-SE")} kr
            </span>
          )}
          {assumed && (
            <span className="text-xs text-slate-500 italic">Beräknat på en investering av 100 000 kr</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Avgiftsskillnad</p>
          <p
            className={`font-bold text-sm ${
              feeSavingsKr !== null
                ? feeSavingsKr >= 0
                  ? "text-green-700"
                  : "text-red-600"
                : "text-slate-400"
            }`}
          >
            {feeSavingsKr !== null
              ? `${feeSavingsKr >= 0 ? "+" : ""}${Math.round(feeSavingsKr).toLocaleString("sv-SE")} kr`
              : "–"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-0.5">Avkastningsskillnad</p>
          <p
            className={`font-bold text-sm ${
              returnGainKr !== null
                ? returnGainKr >= 0
                  ? "text-green-700"
                  : "text-red-600"
                : "text-slate-400"
            }`}
          >
            {returnGainKr !== null
              ? `${returnGainKr >= 0 ? "+" : ""}${Math.round(returnGainKr).toLocaleString("sv-SE")} kr`
              : "–"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-0.5">Totalt</p>
          <p
            className={`font-bold text-base ${
              totalGainKr !== null
                ? totalGainKr >= 0
                  ? "text-green-700"
                  : "text-red-600"
                : "text-slate-400"
            }`}
          >
            {totalGainKr !== null
              ? `${totalGainKr >= 0 ? "+" : ""}${Math.round(totalGainKr).toLocaleString("sv-SE")} kr`
              : "–"}
          </p>
        </div>
        </div>
      </div>
    </section>
  );
}
