"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PortfolioAnalysis, SuggestedMetrics } from "@/lib/analysis";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Search, Sparkles, X } from "lucide-react"
import type { SavedPortfolio } from "@/lib/portfolio"
import DonutChart from "@/components/ui/DonutChart"
import { computePortfolioScore } from "@/lib/portfolio-score"

// ── Types ─────────────────────────────────────────────────────────────────────

type Entry = { isin: string; name: string; weight: string; amount?: string };
type FundSuggestion = { name: string; isin: string };

const CUSTODIANS = [
  { value: "avanza", label: "Avanza" },
  { value: "nordnet", label: "Nordnet" },
  { value: "övrigt", label: "Övrigt" },
];

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


function FundQuiz({
  custodian,
  onAdd,
  onClose: onCloseProp,
  existingIsins,
  autoOpen = false,
}: {
  custodian: string;
  onAdd: (isin: string, name: string) => void;
  onClose?: () => void;
  existingIsins: string[];
  autoOpen?: boolean;
}) {
  const PAGE = 8;
  const [open, setOpen] = useState(autoOpen);
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
    onCloseProp?.();
  }

  function resetQuiz() {
    setScreen("asset");
    setAnswers({ assetClass: null, market: null, sector: null, management: null, maxCost: null, sortBy: null });
    setAllResults([]);
    setError(null);
    setVisibleCount(PAGE);
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
    return null;
  }

  const steps = getSteps(answers);
  const stepIdx = steps.indexOf(screen);
  const isResults = screen === "results";

  const STEP_QUESTIONS: Record<QuizScreen, string> = {
    asset: "Vilken typ av fond?",
    market: "Vilken marknad?",
    sector: "Vilken bransch?",
    management: "Förvaltningsstil?",
    cost: "Maximal avgift?",
    sort: "Vad prioriterar du?",
    results: "",
  };

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50/60 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Sök med AI
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!isResults && (
            <span className="text-xs text-slate-400">{stepIdx + 1} / {steps.length}</span>
          )}
          <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {!isResults && (
        <div className="h-0.5 bg-slate-100">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((stepIdx + 1) / steps.length) * 100}%` }}
          />
        </div>
      )}

      {/* Body */}
      <div className="p-4 space-y-3">

        {/* Question heading */}
        {!isResults && (
          <p className="text-sm font-semibold text-slate-800">{STEP_QUESTIONS[screen]}</p>
        )}

        {/* Asset class */}
        {screen === "asset" && (
          <div className="grid gap-2">
            {ASSET_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick("assetClass", o.value)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 transition-all text-left group"
              >
                <span className="text-xl">{o.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-slate-800 group-hover:text-blue-700">{o.label}</p>
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
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 transition-all text-left group"
              >
                <span className="text-base leading-none">{o.emoji}</span>
                <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">{o.label}</span>
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
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 transition-all text-left group"
              >
                <span className="text-base leading-none">{o.emoji}</span>
                <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">{o.label}</span>
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
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 transition-all text-left group"
              >
                <span className="text-xl">{o.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-slate-800 group-hover:text-blue-700">{o.label}</p>
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
                className="flex flex-col gap-0.5 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 transition-all text-left group"
              >
                <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">{o.label}</span>
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
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 transition-all text-left group"
              >
                <span className="text-xl">{o.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-slate-800 group-hover:text-blue-700">{o.label}</p>
                  <p className="text-xs text-slate-400">{o.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {isResults && (
          <>
            {/* Filter pills */}
            {getSummaryPills(answers).length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {getSummaryPills(answers).map((pill) => (
                  <span key={pill} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                    {pill}
                  </span>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center gap-2.5 py-8">
                <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <p className="text-sm text-slate-500">Söker bland alla fonder…</p>
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {!loading && !error && allResults.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm font-medium text-slate-700">Inga fonder hittades</p>
                <p className="text-xs text-slate-400 mt-1">Prova att ta bort avgiftsgränsen eller byta marknad</p>
              </div>
            )}
            {!loading && allResults.length > 0 && (
              <p className="text-xs text-slate-400">{allResults.length} fonder hittades</p>
            )}

            {results.length > 0 && (
              <div className="divide-y divide-slate-100">
                {results.map((f) => {
                  const cost = f.ongoing_cost_actual ?? f.ongoing_cost_estimated;
                  const alreadyAdded = existingIsins.includes(f.isin);
                  return (
                    <div key={f.isin} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{f.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
                          {f.category && <span className="truncate max-w-[120px]">{f.category}</span>}
                          {f.return_1yr !== null && (
                            <>
                              <span>·</span>
                              <span className={f.return_1yr >= 0 ? "text-emerald-600" : "text-red-500"}>
                                {f.return_1yr > 0 ? "+" : ""}{f.return_1yr.toFixed(1)}%
                              </span>
                            </>
                          )}
                          {cost !== null && (
                            <>
                              <span>·</span>
                              <span>{cost.toFixed(2)}% avgift</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => onAdd(f.isin, f.name)}
                        className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-blue-200 text-blue-600 hover:bg-blue-50 disabled:border-slate-200 disabled:text-slate-400"
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
                className="w-full text-xs font-medium text-slate-500 hover:text-blue-600 py-2 transition-colors"
              >
                Visa fler ({allResults.length - visibleCount} kvar)
              </button>
            )}

            {!loading && (
              <div className="border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={resetQuiz}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  Ny sökning
                </button>
              </div>
            )}
          </>
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
        <ul className="absolute z-10 top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-72 overflow-y-auto">
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


export default function AnalyzeClient() {
  const router = useRouter();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [custodian, setCustodian] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([{ isin: "", name: "", weight: "" }]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [riskProfile, setRiskProfile] = useState<object | null | undefined>(undefined);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [inputMode, setInputMode] = useState<"weight" | "amount">("weight");

  // Input method: how the user wants to populate their portfolio
  const [inputMethod, setInputMethod] = useState<"ai" | "manual" | null>(null);

  // CSV import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ matched: number; unmatched: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import wizard state
  type ImportWizardState = { open: boolean; step: 1 | 2; file: File | null; name: string };
  const [importWizard, setImportWizard] = useState<ImportWizardState>({ open: false, step: 1, file: null, name: "" });

  // Portfolio saving state
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [savingName, setSavingName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedPortfolios, setSavedPortfolios] = useState<SavedPortfolio[]>([]);
  const [savedPortfoliosLoading, setSavedPortfoliosLoading] = useState(false);
  const [portfolioDropdownOpen, setPortfolioDropdownOpen] = useState(false);
  const portfolioDropdownRef = useRef<HTMLDivElement>(null);
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
            setInputMethod("manual");
            sessionStorage.removeItem(SESSION_KEY);
          }
          router.replace("/analyze");
        })
        .catch(() => router.replace("/analyze"))
        .finally(() => setPortfolioLoading(false));
      return;
    }

    // Portfolio builder hand-off (highest priority after URL param)
    const builderRaw = sessionStorage.getItem("fondanalys_builder");
    if (builderRaw) {
      try {
        const builder = JSON.parse(builderRaw) as { custodian?: string; entries: Entry[] };
        if (builder.custodian) setCustodian(builder.custodian);
        if (builder.entries?.length) { setEntries(builder.entries); setInputMethod("manual"); }
      } catch { /* ignore */ }
      sessionStorage.removeItem("fondanalys_builder");
      return;
    }

    const saved = loadSession();
    if (saved) {
      if (saved.custodian) setCustodian(saved.custodian);
      if (saved.entries?.length) { setEntries(saved.entries); setInputMethod("manual"); }
      if (saved.analysis) setAnalysis(saved.analysis);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
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
        setSavedPortfoliosLoading(true);
        fetch("/api/portfolios")
          .then((r) => r.ok ? r.json() : [])
          .then(setSavedPortfolios)
          .catch(() => {})
          .finally(() => setSavedPortfoliosLoading(false));
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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (portfolioDropdownRef.current && !portfolioDropdownRef.current.contains(e.target as Node)) {
        setPortfolioDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function loadPortfolio(p: SavedPortfolio) {
    setCustodian(p.custodian);
    setEntries(p.holdings);
    setAnalysis(p.analysis);
    setPortfolioId(p.id);
    setInputMethod("manual");
    setError(null);
    setInputMode(p.holdings.some((h) => h.amount) ? "amount" : "weight");
  }

  // Distributes weights across funds. If no weights are entered, splits 100% evenly.
  // If some weights exist, distributes the remaining % evenly across the rest.
  // Returns the new entries array (synchronously) so analyze() can use them immediately.
  function distributeWeights(src: Entry[] = entries): Entry[] {
    const withIsins = src.filter((e) => e.isin.trim());
    if (withIsins.length === 0) return src;

    const currentTotal = withIsins.reduce((s, e) => s + (parseFloat(e.weight) || 0), 0);

    // No weights at all — split 100% evenly across all funds with an ISIN
    if (currentTotal === 0) {
      const n = withIsins.length;
      const baseTenths = Math.trunc(1000 / n); // work in 0.1% units
      const remainderTenths = 1000 - baseTenths * n;
      let idx = 0;
      const newEntries = src.map((e) => {
        if (!e.isin.trim()) return e;
        const w = idx === 0 ? baseTenths + remainderTenths : baseTenths;
        idx++;
        return { ...e, weight: (w / 10).toFixed(1) };
      });
      setEntries(newEntries);
      return newEntries;
    }

    // Some weights exist — distribute the remaining % evenly across unweighted funds,
    // or adjust all weighted funds proportionally to reach 100%.
    const unweighted = withIsins.filter((e) => !e.weight.trim());
    if (unweighted.length > 0) {
      const remaining = 100 - currentTotal;
      if (remaining <= 0.1) {
        // No headroom — redistribute evenly across ALL funds so new fund gets a real weight
        const n = withIsins.length;
        const baseTenths = Math.trunc(1000 / n);
        const remainderTenths = 1000 - baseTenths * n;
        let idx = 0;
        const newEntries = src.map((e) => {
          if (!e.isin.trim()) return e;
          const w = idx === 0 ? baseTenths + remainderTenths : baseTenths;
          idx++;
          return { ...e, weight: (w / 10).toFixed(1) };
        });
        setEntries(newEntries);
        return newEntries;
      }
      // Give each unweighted fund an equal share of whatever remains
      const sharePerFund = remaining / unweighted.length;
      const newEntries = src.map((e) => {
        if (!e.isin.trim() || e.weight.trim()) return e;
        return { ...e, weight: sharePerFund.toFixed(1) };
      });
      setEntries(newEntries);
      return newEntries;
    }

    // All funds have weights — adjust them proportionally to sum to 100
    const withWeights = withIsins.filter((e) => e.weight.trim());
    const n = withWeights.length;
    const diffTenths = Math.round((100 - currentTotal) * 10);
    if (diffTenths === 0) return src;
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

  // ── CSV import ────────────────────────────────────────────────────────────

  async function handleFileImport(file: File): Promise<Entry[] | null> {
    setImporting(true);
    setImportResult(null);
    try {
      // Smart encoding detection: check BOM bytes
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let text: string;
      if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
        text = new TextDecoder("utf-16le").decode(buffer);
      } else if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
        text = new TextDecoder("utf-16be").decode(buffer);
      } else {
        text = new TextDecoder("utf-8").decode(buffer);
      }
      // Strip BOM character if present
      text = text.replace(/^\uFEFF/, "");

      // Detect separator (tab = Nordnet, semicolon = Avanza)
      const firstLine = text.split(/\r?\n/)[0] ?? "";
      const sep = firstLine.includes("\t") ? "\t" : ";";
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { setImporting(false); return null; }

      const header = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
      const nameIdx = header.findIndex(h => h === "namn" || h === "name");
      // "Värde SEK" for Nordnet; "värde (sek)" or "andel (%)" for Avanza
      const valueIdx = header.findIndex(h =>
        (h.includes("värde") && h.includes("sek") && !h.includes("inköp") && !h.includes("belån")) ||
        h === "andel (%)" || h === "andel"
      );
      if (nameIdx === -1 || valueIdx === -1) { setImporting(false); return null; }

      const rows = lines.slice(1).flatMap(line => {
        const cells = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ""));
        const name = cells[nameIdx] ?? "";
        const raw = (cells[valueIdx] ?? "").replace(/\s/g, "").replace(",", ".");
        const value = parseFloat(raw.replace(/[^0-9.]/g, ""));
        return name && value > 0 ? [{ name, value }] : [];
      });
      if (rows.length === 0) { setImporting(false); return null; }

      const total = rows.reduce((s, r) => s + r.value, 0);
      // Round weights to 1 decimal, fix rounding error on first row
      const weights = rows.map(r => Math.round((r.value / total) * 1000) / 10);
      const diff = parseFloat((100 - weights.reduce((s, w) => s + w, 0)).toFixed(1));
      if (diff !== 0) weights[0] = parseFloat((weights[0] + diff).toFixed(1));

      // Search each fund name in parallel to resolve ISIN
      const results = await Promise.all(
        rows.map(async (r, i) => {
          const q = encodeURIComponent(r.name.slice(0, 40));
          try {
            const res = await fetch(`/api/funds/search?q=${q}&custodian=${custodian}`);
            const matches: { isin: string; name: string }[] = await res.json();
            // Pick best match: prefer exact name match, otherwise first result
            const exact = matches.find(m => m.name.toLowerCase() === r.name.toLowerCase());
            const best = exact ?? matches[0] ?? null;
            return best
              ? { isin: best.isin, name: best.name, weight: String(weights[i]) }
              : { isin: "", name: r.name, weight: String(weights[i]) };
          } catch {
            return { isin: "", name: r.name, weight: String(weights[i]) };
          }
        })
      );

      const matched = results.filter(r => r.isin).length;
      setEntries(results);
      setInputMode("weight");
      setImportResult({ matched, unmatched: results.length - matched });
      return results;
    } catch {
      return null;
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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

  async function analyze(entriesOverride?: Entry[]) {
    if (!custodian) return;
    setError(null);
    setAnalysis(null);

    let workingEntries = entriesOverride ?? entries;

    if (!entriesOverride) {
      if (inputMode === "amount") {
        // Compute weights from amounts
        const validAmt = workingEntries.filter((e) => e.isin.trim() && (e.amount ?? "").trim());
        if (validAmt.length === 0) { setError("Lägg till minst en fond med belopp."); return; }
        const totalAmt = validAmt.reduce((s, e) => s + (parseFloat(e.amount || "0") || 0), 0);
        if (totalAmt === 0) { setError("Ange belopp för dina fonder."); return; }
        workingEntries = workingEntries.map((e) => {
          if (!e.isin.trim() || !(e.amount ?? "").trim()) return e;
          const w = ((parseFloat(e.amount || "0") / totalAmt) * 100).toFixed(1);
          return { ...e, weight: w };
        });
        setEntries(workingEntries);
      } else {
        // Auto-distribute if weights don't sum to 100, OR if any ISINed fund has no weight set
        const currentTotal = workingEntries.reduce((s, e) => s + (parseFloat(e.weight) || 0), 0);
        const hasUnweighted = workingEntries.some((e) => e.isin.trim() && !e.weight.trim());
        if (Math.abs(currentTotal - 100) > 0.1 || hasUnweighted) {
          workingEntries = distributeWeights(workingEntries);
        }
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

  async function handleWizardComplete() {
    if (!importWizard.file || !importWizard.name.trim()) return;
    const name = importWizard.name.trim();
    setImportWizard({ open: false, step: 1, file: null, name: "" });
    setSavingName(name);
    setShowSaveForm(true);
    setInputMethod("manual");
    const parsed = await handleFileImport(importWizard.file);
    if (parsed && parsed.some(e => e.isin)) {
      await analyze(parsed);
    }
  }

  const totalWeight = entries.reduce((s, e) => s + (parseFloat(e.weight) || 0), 0);
  const totalAmount = entries.reduce((s, e) => s + (parseFloat(e.amount || "0") || 0), 0);
  const portfolioValue = inputMode === "amount" && totalAmount > 0 ? totalAmount : null;

  function handleLoginFromBlur() {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ custodian, entries, analysis }));
    } catch { /* ignore */ }
    router.push("/login?next=/analyze");
  }

  if (portfolioLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
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
    <>
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Risk profile nudge — shown when logged in with no risk profile */}
      {user && riskProfile === null && !nudgeDismissed && (
        <div className="no-print flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
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

      {/* Saved portfolios switcher — dropdown, shown when logged in with saved portfolios */}
      {savedPortfoliosLoading && (
        <div className="no-print flex items-center gap-2 animate-pulse">
          <div className="h-4 w-20 rounded bg-slate-100" />
          <div className="h-8 w-36 rounded-lg bg-slate-100" />
        </div>
      )}
      {!savedPortfoliosLoading && savedPortfolios.length > 0 && (
        <div className="no-print flex items-center gap-2 sm:gap-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide shrink-0">Portfölj</span>
          <div className="relative" ref={portfolioDropdownRef}>
            <button
              type="button"
              onClick={() => setPortfolioDropdownOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white hover:border-blue-300 transition-all"
            >
              <span className={portfolioId ? "font-medium text-slate-900" : "text-slate-500"}>
                {portfolioId ? (savedPortfolios.find(p => p.id === portfolioId)?.name ?? "Portfölj") : "Ny portfölj"}
              </span>
              <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${portfolioDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {portfolioDropdownOpen && (
              <div className="absolute z-20 top-full left-0 mt-1 min-w-[180px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                {savedPortfolios.map((p) => {
                  const custodianLabel = p.custodian === "nordnet" ? "Nordnet" : p.custodian === "övrigt" ? "Övrigt" : "Avanza";
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { loadPortfolio(p); setPortfolioDropdownOpen(false); }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 text-sm flex items-baseline gap-1.5 transition-colors hover:bg-blue-50",
                        portfolioId === p.id ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700"
                      )}
                    >
                      {p.name}
                      <span className="text-xs opacity-60 font-normal">{custodianLabel}</span>
                    </button>
                  );
                })}
                <div className="border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setPortfolioId(null); setEntries([{ isin: "", name: "", weight: "" }]); setAnalysis(null); setError(null); setInputMethod(null); setPortfolioDropdownOpen(false); }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-blue-50",
                      !portfolioId ? "text-blue-700 font-medium bg-blue-50" : "text-slate-500"
                    )}
                  >
                    + Ny portfölj
                  </button>
                </div>
              </div>
            )}
          </div>
          {portfolioId && saveStatus !== "idle" && (
            <span className="text-xs text-slate-400">
              {saveStatus === "saving" && "Sparar…"}
              {saveStatus === "saved" && "Sparad ✓"}
              {saveStatus === "error" && "Kunde inte spara"}
            </span>
          )}
        </div>
      )}

      <section className="no-print bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900 shrink-0">Din portfölj</h2>
          {inputMethod !== null && custodian && (
            <button
              type="button"
              onClick={() => setInputMode(inputMode === "weight" ? "amount" : "weight")}
              className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors whitespace-nowrap"
            >
              {inputMode === "weight" ? "Ange belopp" : "Ange vikter (%)"}
            </button>
          )}
        </div>

        {/* Custodian selector */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.08em]">Var förvaltar du dina fonder?</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "avanza",  label: "Avanza",  funds: "1 500+" },
              { value: "nordnet", label: "Nordnet", funds: "1 700+" },
              { value: "övrigt",  label: "Övrigt",  funds: null },
            ].map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  if (custodian !== c.value) {
                    setEntries([{ isin: "", name: "", weight: "" }]);
                    setInputMethod(null);
                    setAnalysis(null);
                    setError(null);
                    setPortfolioId(null);
                  }
                  setCustodian(c.value);
                  localStorage.setItem("fondanalys_preferred_custodian", c.value);
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-xl border p-3 text-center transition-all min-h-[56px]",
                  custodian === c.value
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500/20"
                    : "border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-white"
                )}
              >
                <span className={cn("text-[15px] font-semibold", custodian === c.value ? "text-blue-700" : "text-slate-800")}>
                  {c.label}
                </span>
                {c.funds && (
                  <span className="text-[10px] text-slate-400">{c.funds} fonder</span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Äger du inga fonder?{" "}
            <Link href="/bygg-portfolj" className="text-blue-600 hover:underline font-medium">
              Bygg en portfölj
            </Link>
          </p>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { setInputMethod("manual"); handleFileImport(f); }
          }}
        />

        {/* Rest of form — shown only when custodian is selected */}
        {custodian && (
          <>
            {/* Divider */}
            <div className="h-px bg-slate-100" />

            {/* Method selector */}
            <div className="grid grid-cols-3 gap-2">
              {/* Manual */}
              <button
                type="button"
                onClick={() => setInputMethod("manual")}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
                  inputMethod === "manual"
                    ? "border-blue-200 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Search className={cn("w-3.5 h-3.5", inputMethod === "manual" ? "text-blue-500" : "text-slate-400")} />
                  <span className={cn("text-xs font-semibold", inputMethod === "manual" ? "text-blue-700" : "text-slate-700")}>
                    Sök manuellt
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 leading-tight hidden sm:block">
                  Sök på fondnamn eller ISIN
                </span>
              </button>

              {/* Import */}
              <button
                type="button"
                onClick={() => { setImportResult(null); setImportWizard({ open: true, step: 1, file: null, name: "" }); }}
                disabled={importing}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
                  importing
                    ? "border-blue-200 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {importing ? (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  )}
                  <span className="text-xs font-semibold text-slate-700">
                    {importing ? "Importerar…" : "Importera fil"}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 leading-tight hidden sm:block">
                  Från Nordnet eller Avanza
                </span>
              </button>

              {/* AI */}
              <button
                type="button"
                onClick={() => {
                  if (!user) { router.push("/login"); return; }
                  setInputMethod("ai");
                }}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
                  inputMethod === "ai"
                    ? "border-indigo-200 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-semibold ai-shimmer-text">
                    Sök med AI
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 leading-tight hidden sm:block">
                  {user ? "Beskriv vad du letar efter" : "Kräver inloggning"}
                </span>
              </button>
            </div>

            {/* AI widget — shown when AI method selected */}
            {inputMethod === "ai" && user && (
              <FundQuiz
                custodian={custodian}
                autoOpen
                onClose={() => setInputMethod(null)}
                existingIsins={entries.map((e) => e.isin).filter(Boolean)}
                onAdd={(isin: string, name: string) => {
                  setInputMethod("ai");
                  setEntries((prev) => {
                    const empty = prev.findIndex((e) => !e.isin);
                    if (empty !== -1) return prev.map((e, idx) => idx === empty ? { ...e, isin, name } : e);
                    return [...prev, { isin, name, weight: "", amount: "" }];
                  });
                }}
              />
            )}

            {/* Fund rows — in AI mode only shown once at least one fund is selected */}
            {(inputMethod === "manual" || (inputMethod === "ai" && entries.some((e) => e.isin))) && (<>

            {importResult && (
              <p className="text-xs text-slate-400">
                {importResult.matched} av {importResult.matched + importResult.unmatched} fonder matchade
                {importResult.unmatched > 0 && " — sök manuellt för de resterande"}
              </p>
            )}

            <div className="space-y-3">
              <div className="hidden sm:grid grid-cols-[1fr_100px_44px] gap-2 text-xs font-semibold text-slate-500 px-1">
                <span>Fond</span>
                <span>{inputMode === "weight" ? "Vikt (%)" : "Belopp (kr)"}</span>
                <span />
              </div>
              {entries.map((entry, i) => (
                <div key={i} className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_100px_44px] sm:gap-2 bg-slate-50 sm:bg-transparent rounded-xl sm:rounded-none p-3 sm:p-0 border border-slate-100 sm:border-0">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide sm:hidden">Fond {i + 1}</p>
                  <FundSearchInput isin={entry.isin} name={entry.name} custodian={custodian} excludeIsins={entries.filter((_, idx) => idx !== i).map((e) => e.isin).filter(Boolean)} onSelect={(isin, name) => selectFund(i, isin, name)} onClear={() => clearFund(i)} />
                  <div className="flex items-center gap-2 sm:contents">
                    {inputMode === "weight" ? (
                      <input
                        type="number" placeholder="%" min={0} max={100}
                        value={entry.weight} onChange={(e) => updateWeight(i, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRow(); } }}
                        className="flex-1 sm:w-auto sm:flex-none border border-slate-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <input
                        type="number" placeholder="kr" min={0}
                        value={entry.amount ?? ""} onChange={(e) => updateAmount(i, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRow(); } }}
                        className="flex-1 sm:flex-none border border-slate-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                    <button
                      onClick={() => removeRow(i)} disabled={entries.length === 1}
                      className="h-11 w-11 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 disabled:opacity-30 transition-colors shrink-0"
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              {inputMethod !== "ai" && (
                <button onClick={addRow} className="text-sm text-blue-600 hover:underline py-2">+ Lägg till fond</button>
              )}
              {inputMethod === "ai" && <span />}
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

            </>)}

            <button
              onClick={() => analyze()} disabled={loading || inputMethod === null}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-blue-300 disabled:to-blue-300 text-white font-medium rounded-xl py-3 transition-all shadow-md shadow-blue-200"
            >
              {loading ? "Analyserar…" : "Analysera portfölj"}
            </button>
          </>
        )}
      </section>

      <div ref={resultsRef} />
      {analysis && <AnalysisResult analysis={analysis} portfolioValue={portfolioValue} user={user} onLoginClick={handleLoginFromBlur} />}

      {analysis && user && !portfolioId && (
        <section className="no-print bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
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

    {/* Import wizard modal */}
    {importWizard.open && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
        onClick={(e) => { if (e.target === e.currentTarget) setImportWizard(w => ({ ...w, open: false })); }}
      >
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Importera portfölj</h2>
              <button
                onClick={() => setImportWizard(w => ({ ...w, open: false }))}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-1.5">
              <div className="h-1 flex-1 rounded-full bg-blue-500" />
              <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${importWizard.step === 2 ? "bg-blue-500" : "bg-slate-200"}`} />
            </div>
          </div>

          <div className="p-6">
            {/* Step 1: File */}
            {importWizard.step === 1 && (
              <div className="space-y-5">
                <div>
                  <p className="font-semibold text-slate-900">Välj fil</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Exportera dina innehav som CSV från din depå och ladda upp filen.
                  </p>
                </div>
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setImportWizard(w => ({ ...w, file: f }));
                    }}
                  />
                  <div className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center transition-all",
                    importWizard.file
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                  )}>
                    {importWizard.file ? (
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="font-medium text-slate-900 text-sm">{importWizard.file.name}</p>
                        <p className="text-xs text-slate-400">Klicka för att byta fil</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                        </div>
                        <p className="font-medium text-slate-700 text-sm">Dra och släpp eller klicka</p>
                        <p className="text-xs text-slate-400">CSV-format (från Nordnet eller Avanza)</p>
                      </div>
                    )}
                  </div>
                </label>
                <button
                  disabled={!importWizard.file}
                  onClick={() => setImportWizard(w => ({ ...w, step: 2 }))}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors text-sm"
                >
                  Nästa
                </button>
              </div>
            )}

            {/* Step 2: Name */}
            {importWizard.step === 2 && (
              <div className="space-y-5">
                <div>
                  <p className="font-semibold text-slate-900">Döp din portfölj</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Ge portföljen ett namn så du enkelt hittar den igen.
                  </p>
                </div>
                <input
                  autoFocus
                  type="text"
                  placeholder="t.ex. ISK Nordnet, Pension, Barnspar…"
                  value={importWizard.name}
                  onChange={(e) => setImportWizard(w => ({ ...w, name: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter" && importWizard.name.trim()) handleWizardComplete(); }}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setImportWizard(w => ({ ...w, step: 1 }))}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Tillbaka
                  </button>
                  <button
                    disabled={!importWizard.name.trim() || importing}
                    onClick={handleWizardComplete}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {importing ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Importerar…
                      </>
                    ) : "Analysera portfölj"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ── Results ───────────────────────────────────────────────────────────────────

function ann3yr(total3yr: number): number {
  return ((1 + total3yr / 100) ** (1 / 3) - 1) * 100;
}

function AnalysisResult({ analysis, portfolioValue, user, onLoginClick }: { analysis: PortfolioAnalysis; portfolioValue: number | null; user: User | null | undefined; onLoginClick: () => void }) {
  const showBlur = user === null;
  const score = computePortfolioScore(analysis).score;
  const [showAllSwaps, setShowAllSwaps] = useState(false);
  const [openSwapTooltip, setOpenSwapTooltip] = useState<number | null>(null);

  const pv = portfolioValue ?? 100_000;
  const assumed = portfolioValue === null;

  let potentialGainKr: number | null = null;
  if (analysis.suggestedMetrics) {
    const fee = analysis.avgCost !== null && analysis.suggestedMetrics.avgCost !== null
      ? (analysis.avgCost - analysis.suggestedMetrics.avgCost) / 100 * pv : 0;
    const ret = analysis.weightedReturn3yr !== null && analysis.suggestedMetrics.weightedReturn3yr !== null
      ? (ann3yr(analysis.suggestedMetrics.weightedReturn3yr) - ann3yr(analysis.weightedReturn3yr)) / 100 * pv : 0;
    if (fee + ret > 100) potentialGainKr = fee + ret;
  }

  const scoreColor = score >= 7.5 ? "#16A34A" : score >= 5 ? "#F59E0B" : "#ef4444";

  const strengths: string[] = [];
  const warnings: string[] = [];
  if (analysis.avgCost !== null) {
    if (analysis.avgCost < 0.3) strengths.push("Låg avgift");
    else if (analysis.avgCost > 0.6) warnings.push("Hög avgift");
  }
  if (analysis.weightedSharpe !== null) {
    if (analysis.weightedSharpe > 0.7) strengths.push("Stark riskjusterad avkastning");
    else if (analysis.weightedSharpe < 0.3) warnings.push("Svag riskjusterad avkastning");
  }
  if (analysis.categoryBreakdown?.length) {
    const n = analysis.categoryBreakdown.filter(c => c.weight > 5).length;
    if (n >= 3) strengths.push("Bra riskspridning");
    else warnings.push("Låg riskspridning");
  }
  if (analysis.weightedReturn3yr !== null) {
    if (analysis.weightedReturn3yr > 10) strengths.push("Stark historisk avkastning");
    else if (analysis.weightedReturn3yr < 3) warnings.push("Låg historisk avkastning");
  }

  return (
    <div className="space-y-5">

      {/* Print-only header + score card */}
      <div className="print-only hidden">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
          <p className="text-base font-bold text-slate-900">Fondanalys</p>
          <p className="text-sm text-slate-400">{new Date().toLocaleDateString("sv-SE")}</p>
        </div>

        <div className="border border-slate-200 rounded-xl p-5 mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-slate-400 mb-1">Portföljbetyg</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold tabular-nums" style={{ color: scoreColor }}>
                  {score.toFixed(1).replace(".", ",")}
                </span>
                <span className="text-xl text-slate-300 font-light">/10</span>
              </div>
            </div>
            {potentialGainKr !== null && (
              <div className="text-right">
                <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-slate-400 mb-1">Förbättringspotential</p>
                <p className="text-2xl font-bold text-green-700">+{Math.round(potentialGainKr).toLocaleString("sv-SE")} kr</p>
                <p className="text-xs text-slate-400 mt-0.5">per år{assumed ? " (vid 100 000 kr)" : ""}</p>
              </div>
            )}
          </div>

          {analysis.summaryText && (
            <p className="mt-4 pt-4 border-t border-slate-100 text-slate-600 leading-relaxed text-sm">
              {analysis.summaryText}
            </p>
          )}

          {(strengths.length > 0 || warnings.length > 0) && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              {strengths.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">Styrkor</p>
                  {strengths.map(s => (
                    <p key={s} className="text-sm text-green-700 flex items-center gap-1.5 mb-1">✓ {s}</p>
                  ))}
                </div>
              )}
              {warnings.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">Förbättringsområden</p>
                  {warnings.map(w => (
                    <p key={w} className="text-sm text-amber-700 flex items-center gap-1.5 mb-1">⚠ {w}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hero card */}
      <section className="no-print rounded-2xl p-6 sm:p-8 text-white" style={{ background: "linear-gradient(135deg, #0D1F36 0%, #0F2744 100%)" }}>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="text-xs font-semibold tracking-[0.12em] uppercase text-white/40 mb-2">Portföljbetyg</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-5xl sm:text-6xl font-bold tabular-nums" style={{ color: scoreColor }}>
                {score.toFixed(1).replace(".", ",")}
              </span>
              <span className="text-2xl text-white/25 font-light">/10</span>
            </div>
          </div>
          {potentialGainKr !== null && (
            <div className="text-right">
              <p className="text-xs font-semibold tracking-[0.12em] uppercase text-white/40 mb-2">Förbättringspotential</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-400">+{Math.round(potentialGainKr).toLocaleString("sv-SE")} kr</p>
              <p className="text-xs text-white/35 mt-1">per år{assumed ? " (vid 100 000 kr)" : ""}</p>
              <p className="text-[10px] text-white/25 mt-0.5">inkl. historisk avkastningsskillnad</p>
            </div>
          )}
        </div>

        <p className="mt-5 pt-5 border-t border-white/10 text-white/70 leading-relaxed text-[15px]">
          {analysis.summaryText}
        </p>

        {(strengths.length > 0 || warnings.length > 0) && (
          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            {strengths.length > 0 && (
              <div>
                <p className="text-xs font-semibold tracking-[0.1em] uppercase text-white/40 mb-2">Styrkor</p>
                <div className="space-y-1.5">
                  {strengths.map(s => (
                    <p key={s} className="text-sm text-green-400 flex items-center gap-2">
                      <span className="shrink-0">✓</span> {s}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {warnings.length > 0 && (
              <div>
                <p className="text-xs font-semibold tracking-[0.1em] uppercase text-white/40 mb-2">Förbättringsområden</p>
                <div className="space-y-1.5">
                  {warnings.map(w => (
                    <p key={w} className="text-sm text-amber-400 flex items-center gap-2">
                      <span className="shrink-0">⚠</span> {w}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-xs text-white/35 hover:text-white/60 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Spara som PDF
          </button>
        </div>
      </section>

      {/* Key metrics + allocation */}
      <section className="bg-white rounded-2xl p-6 sm:p-8" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)", border: "1px solid #F1F5F9" }}>
        <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-6">Nyckeltal</p>
        <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
          <div className="grid grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-6">
            <Metric label="Snittavgift" value={analysis.avgCost !== null ? `${analysis.avgCost.toFixed(2)}%` : "–"} sub="per år" info="Den genomsnittliga årliga avgiften viktat efter din fördelning." />
            <Metric label="Avkastning 1 år" value={analysis.weightedReturn1yr !== null ? `${analysis.weightedReturn1yr.toFixed(1)}%` : "–"} sub="senaste 12 mån" info="Portföljens viktade avkastning de senaste 12 månaderna." />
            <Metric label="Avkastning 3 år" value={analysis.weightedReturn3yr !== null ? `${analysis.weightedReturn3yr.toFixed(1)}%` : "–"} sub="totalt" info="Portföljens viktade totalavkastning de senaste 3 åren." />
            <Metric label="Sharpe 3 år" value={analysis.weightedSharpe !== null ? analysis.weightedSharpe.toFixed(2) : "–"} sub="riskjusterad" info="Avkastning i förhållande till risk. Högre är bättre." />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-4">Fördelning</p>
            <DonutChart
              slices={(analysis.detailedBreakdown ?? []).map(c => ({ label: c.label, weight: c.weight }))}
              centerLabel={`${(analysis.detailedBreakdown ?? [])[0]?.weight.toFixed(0)}%`}
              centerSub={(analysis.detailedBreakdown ?? [])[0]?.label ?? ""}
              size={145}
              thickness={22}
              horizontal
            />
            <p className="text-[10px] text-slate-400 mt-2 leading-snug">* Baseras på fondkategori, inte underliggande innehav.</p>
          </div>
        </div>

        {/* Tillgångsslag + Förvaltningsstil */}
        <div className="mt-8 pt-6 border-t border-slate-50 grid sm:grid-cols-2 gap-8">
          {(analysis.categoryBreakdown?.length ?? 0) > 0 && (() => {
            const ASSET_COLORS: Record<string, string> = {
              Aktiefonder:          "#3B82F6",
              Räntefonder:          "#F59E0B",
              Blandfonder:          "#10B981",
              "Alternativa fonder": "#8B5CF6",
              Penningmarknadsfonder:"#06B6D4",
              Övrigt:               "#94A3B8",
            };
            const items = (analysis.categoryBreakdown ?? []).filter(c => c.weight > 0);
            return (
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-3">Tillgångsslag</p>
                <div className="h-3 rounded-full overflow-hidden flex">
                  {items.map((c) => (
                    <div key={c.label} style={{ width: `${c.weight}%`, backgroundColor: ASSET_COLORS[c.label] ?? "#94A3B8" }} />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                  {items.map((c) => (
                    <div key={c.label} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[c.label] ?? "#94A3B8" }} />
                      <span className="text-xs text-slate-500">{c.label}</span>
                      <span className="text-xs font-semibold text-slate-800 tabular-nums">{c.weight.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {(analysis.managementBreakdown.active + analysis.managementBreakdown.passive + analysis.managementBreakdown.unknown) > 0 && (() => {
            const items = [
              { label: "Aktivt förvaltad", value: analysis.managementBreakdown.active,  color: "#3B82F6" },
              { label: "Indexfond",         value: analysis.managementBreakdown.passive, color: "#F59E0B" },
              { label: "Oklassad",          value: analysis.managementBreakdown.unknown, color: "#94A3B8" },
            ].filter(i => i.value > 0);
            return (
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-3">Förvaltningsstil</p>
                <div className="h-3 rounded-full overflow-hidden flex">
                  {items.map((item) => (
                    <div key={item.label} style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                  {items.map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0 border border-slate-200" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-slate-500">{item.label}</span>
                      <span className="text-xs font-semibold text-slate-800 tabular-nums">{item.value.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      <div className="relative">
        <div className={`space-y-5${showBlur ? " blur-sm pointer-events-none select-none" : ""}`}>

      {/* Swap suggestions + best-in-category */}
      {((analysis.swapSuggestions?.length ?? 0) > 0 ||
        (analysis.bestInCategory?.length ?? 0) > 0) && (
        <section className="bg-white rounded-2xl p-6 sm:p-8" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)", border: "1px solid #F1F5F9" }}>
            <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-1">Fondbytesförslag</p>
            <p className="text-lg font-semibold text-[#111827] mb-4">Förslag på förbättringar</p>

            {(analysis.bestInCategory?.length ?? 0) > 0 && (() => {
              const bics = analysis.bestInCategory ?? [];
              const hasSwaps = (analysis.swapSuggestions?.length ?? 0) > 0;
              const label = bics.length === 1 ? "Redan bäst i sin kategori" : "Redan bäst i sina kategorier";
              return (
                <div className={`flex items-start gap-3 ${hasSwaps ? "mb-4 pb-4 border-b border-slate-200" : ""}`}>
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-green-600 mb-1">{label}</p>
                    {bics.map((bic, i) => (
                      <p key={i} className="text-sm font-semibold text-[#111827] leading-snug truncate">{bic.fundName}</p>
                    ))}
                  </div>
                </div>
              );
            })()}

            {(analysis.swapSuggestions?.length ?? 0) > 0 && (() => {
              const swaps = analysis.swapSuggestions ?? [];
              const groupMap = new Map<string, typeof swaps>();
              for (const s of swaps) {
                const key = s.suggestedFund.isin;
                if (!groupMap.has(key)) groupMap.set(key, []);
                groupMap.get(key)!.push(s);
              }
              const groups = Array.from(groupMap.values()).sort((a, b) => b.length - a.length);

              const VISIBLE = 3;
              const total = groupMap.size;
              return (
                <>
                  <div className="divide-y divide-slate-200">
                    {groups.map((group, gi) => {
                      const hidden = !showAllSwaps && gi >= VISIBLE;
                      const suggested = group[0].suggestedFund;
                      const isConsolidate = group[0].consolidate;
                      const s = group[0];
                      const isMultiGroup = group.length >= 2;
                      const showInfo = isMultiGroup || (s.reason || s.similarityNote);

                      let tooltipContent: React.ReactNode = null;
                      if (isMultiGroup) {
                        const totalW = group.reduce((sum, item) => sum + item.weight, 0);
                        if (totalW > 0) {
                          const items = group.map(item => ({
                            normW: item.weight / totalW,
                            cost: item.currentFund.ongoing_cost_actual ?? item.currentFund.ongoing_cost_estimated,
                            r1yr: item.currentFund.return_1yr,
                            sharpe: item.currentFund.sharpe_3yr,
                          }));
                          const compCost = items.every(x => x.cost !== null)
                            ? items.reduce((sum, x) => sum + x.normW * x.cost!, 0) : null;
                          const compReturn = items.every(x => x.r1yr !== null)
                            ? items.reduce((sum, x) => sum + x.normW * x.r1yr!, 0) : null;
                          const compSharpe = items.every(x => x.sharpe !== null)
                            ? items.reduce((sum, x) => sum + x.normW * x.sharpe!, 0) : null;
                          const sugCost = suggested.ongoing_cost_actual ?? suggested.ongoing_cost_estimated;
                          tooltipContent = (
                            <div>
                              <p className="font-semibold mb-1.5">Nuvarande (sammanvägt)</p>
                              {compCost !== null && <p>Avgift: {compCost.toFixed(2)}%</p>}
                              {compReturn !== null && <p>Avk. 1 år: {compReturn.toFixed(1)}%</p>}
                              {compSharpe !== null && <p>Sharpe: {compSharpe.toFixed(2)}</p>}
                              <div className="border-t border-white/20 my-2" />
                              <p className="font-semibold mb-1">Föreslagen</p>
                              {suggested.category && <p className="opacity-70 mb-1">{suggested.category}</p>}
                              {sugCost !== null && <p>Avgift: {sugCost.toFixed(2)}%</p>}
                              {suggested.return_1yr !== null && <p>Avk. 1 år: {suggested.return_1yr.toFixed(1)}%</p>}
                              {suggested.sharpe_3yr !== null && <p>Sharpe: {suggested.sharpe_3yr.toFixed(2)}</p>}
                            </div>
                          );
                        }
                      } else {
                        const curCost = s.currentFund.ongoing_cost_actual ?? s.currentFund.ongoing_cost_estimated;
                        const sugCost = s.suggestedFund.ongoing_cost_actual ?? s.suggestedFund.ongoing_cost_estimated;
                        tooltipContent = (
                          <div>
                            <p className="font-semibold mb-1.5">Nuvarande</p>
                            {s.currentFund.category && <p className="opacity-70 mb-1">{s.currentFund.category}</p>}
                            {curCost !== null && <p>Avgift: {curCost.toFixed(2)}%</p>}
                            {s.currentFund.return_1yr !== null && <p>Avk. 1 år: {s.currentFund.return_1yr.toFixed(1)}%</p>}
                            {s.currentFund.sharpe_3yr !== null && <p>Sharpe: {s.currentFund.sharpe_3yr.toFixed(2)}</p>}
                            <div className="border-t border-white/20 my-2" />
                            <p className="font-semibold mb-1.5">Föreslagen</p>
                            {s.suggestedFund.category && <p className="opacity-70 mb-1">{s.suggestedFund.category}</p>}
                            {sugCost !== null && <p>Avgift: {sugCost.toFixed(2)}%</p>}
                            {s.suggestedFund.return_1yr !== null && <p>Avk. 1 år: {s.suggestedFund.return_1yr.toFixed(1)}%</p>}
                            {s.suggestedFund.sharpe_3yr !== null && <p>Sharpe: {s.suggestedFund.sharpe_3yr.toFixed(2)}</p>}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={gi}
                          className={`py-4 first:pt-0 last:pb-0 cursor-pointer select-none${hidden ? " swap-hidden" : ""}`}
                          onClick={() => setOpenSwapTooltip(prev => prev === gi ? null : gi)}
                        >
                          {isConsolidate && isMultiGroup && (
                            <div className="mb-2">
                              <span className="inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB]">
                                Konsolidera {group.length} fonder
                              </span>
                            </div>
                          )}
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2563EB] mb-1">Nuvarande</p>
                              {group.map((item, si) => (
                                <p key={si} className="text-sm font-semibold text-[#111827] leading-snug break-words">{item.currentFund.name}</p>
                              ))}
                            </div>
                            <div className="flex flex-col items-center justify-start pt-4 shrink-0">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                </svg>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 text-right">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2563EB] mb-1">
                                {isConsolidate ? "Öka i" : "Föreslagen"}
                              </p>
                              <p className="text-sm font-semibold text-[#111827] leading-snug break-words">{suggested.name}</p>
                            </div>
                            {showInfo && (
                              <InfoButton open={openSwapTooltip === gi}>{tooltipContent}</InfoButton>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {total > VISIBLE && (
                    <button
                      onClick={() => setShowAllSwaps(v => !v)}
                      className="mt-2 w-full py-2.5 text-sm font-medium text-slate-500 hover:text-[#111827] border border-slate-100 hover:border-slate-200 rounded-xl transition-colors"
                    >
                      {showAllSwaps ? "Visa färre förslag" : `Visa alla ${total} förslag`}
                    </button>
                  )}
                </>
              );
            })()}

          </section>
      )}

      {analysis.suggestedMetrics && (
        <SuggestedPortfolio
          current={{ avgCost: analysis.avgCost, weightedReturn1yr: analysis.weightedReturn1yr, weightedReturn3yr: analysis.weightedReturn3yr, weightedSharpe: analysis.weightedSharpe }}
          suggested={analysis.suggestedMetrics}
          portfolioValue={portfolioValue}
        />
      )}

      {!analysis.suggestedMetrics && (analysis.swapSuggestions?.length ?? 0) === 0 && (
        <OptimalPortfolioProjection
          current={{ avgCost: analysis.avgCost, weightedReturn1yr: analysis.weightedReturn1yr, weightedReturn3yr: analysis.weightedReturn3yr, weightedSharpe: analysis.weightedSharpe }}
          portfolioValue={portfolioValue}
        />
      )}
        </div>

        {showBlur && (
          <div className="no-print absolute inset-0 flex items-center justify-center z-10">
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100 max-w-sm w-full mx-4 text-center space-y-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  {potentialGainKr !== null
                    ? `Logga in för att se fondbytena med +${Math.round(potentialGainKr).toLocaleString("sv-SE")} kr/år i förbättringspotential`
                    : "Logga in för att se personliga fondbytesförslag"}
                </p>
                <p className="text-xs text-slate-400">Gratis · Klart på under en minut</p>
              </div>
              <button
                onClick={onLoginClick}
                className="w-full bg-slate-900 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                Logga in
              </button>
            </div>
          </div>
        )}
      </div>

      {analysis.notFound.length > 0 && (
        <section className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-sm text-amber-800">
            <span className="font-medium">Hittades inte: </span>{analysis.notFound.join(", ")}
          </p>
        </section>
      )}
      {/* Print footer */}
      <div className="print-footer hidden">
        fondanalys.se — Historisk avkastning är ingen garanti för framtida resultat. Ej finansiell rådgivning.
      </div>

    </div>
  );
}

function InfoButton({ children, open }: { children: React.ReactNode; open: boolean }) {
  return (
    <div className="relative shrink-0 pt-1">
      <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-200 text-[9px] normal-case text-slate-500 pointer-events-none">i</span>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-56 bg-slate-700 text-white text-xs rounded-xl px-3 py-2.5 z-20 leading-relaxed shadow-lg whitespace-normal text-left pointer-events-none">
          {children}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, sub, info }: { label: string; value: string; sub: string; info: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative group cursor-pointer select-none"
      onClick={() => setOpen(o => !o)}
    >
      <div className={cn(
        "absolute bottom-full left-0 mb-2 w-52 z-20",
        "bg-slate-700 text-white text-xs rounded-xl px-3 py-2.5",
        "leading-snug shadow-lg pointer-events-none transition-opacity",
        open ? "opacity-100" : "opacity-0 sm:group-hover:opacity-100",
      )}>
        {info}
      </div>
      <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-1.5 flex items-center gap-1">
        {label}
        <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-200 text-[9px] normal-case text-slate-500">i</span>
      </p>
      <p className="text-2xl sm:text-3xl font-bold text-[#111827] leading-none tabular-nums">{value}</p>
      <p className="text-xs text-slate-400 mt-1.5">{sub}</p>
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
  const returnGainKr = current.weightedReturn3yr !== null && suggested.weightedReturn3yr !== null
    ? (ann3yr(suggested.weightedReturn3yr) - ann3yr(current.weightedReturn3yr)) / 100 * pv : null;

  const rows = [
    { label: "Snittavgift", sub: "per år", currentVal: current.avgCost, suggestedVal: suggested.avgCost, lowerIsBetter: true },
    { label: "Avkastning 1 år", sub: "viktad", currentVal: current.weightedReturn1yr, suggestedVal: suggested.weightedReturn1yr },
    { label: "Avkastning 3 år", sub: "totalt", currentVal: current.weightedReturn3yr, suggestedVal: suggested.weightedReturn3yr },
    { label: "Sharpe 3 år", sub: "riskjusterad", currentVal: current.weightedSharpe, suggestedVal: suggested.weightedSharpe },
  ];

  return (
    <section className="bg-white rounded-2xl p-6 sm:p-8" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)", border: "1px solid #F1F5F9" }}>
      <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-1">Föreslagen portfölj</p>
      <p className="text-lg font-semibold text-[#111827] mb-6">Nyckeltal efter föreslagna byten</p>

      <div className="mb-6">
        <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-3">Fondinnehav</p>
        <div className="space-y-0">
          {suggested.funds.map((f, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 gap-2">
              <div className="min-w-0">
                <span className="text-sm font-medium text-[#111827] break-words">{f.name}</span>
                <span className="hidden sm:inline text-xs text-slate-400 ml-2">{f.isin}</span>
              </div>
              <span className="text-sm font-semibold text-slate-500 tabular-nums shrink-0">{f.weight.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-3">Jämförelse</p>
        <div className="sm:hidden space-y-0">
          {rows.map((row) => {
            const d = delta(row.suggestedVal, row.currentVal, row.lowerIsBetter);
            return (
              <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                <p className="text-sm text-slate-500">{row.label}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400 tabular-nums">{fmt(row.currentVal)}</span>
                  <span className="text-slate-300">→</span>
                  <span className="font-semibold text-[#111827] tabular-nums">{fmt(row.suggestedVal)}</span>
                  {d && (
                    <span className={`text-xs font-semibold tabular-nums ${d.better ? "text-[#16A34A]" : "text-red-500"}`}>
                      {d.diff > 0 ? "▲" : "▼"}{Math.abs(d.diff).toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="hidden sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold tracking-[0.06em] uppercase text-slate-400 border-b border-slate-100">
                <th className="text-left pb-3 pr-4 font-semibold">Nyckeltal</th>
                <th className="text-right pb-3 px-4 font-semibold">Nuvarande</th>
                <th className="text-right pb-3 px-4 font-semibold">Föreslagen</th>
                <th className="text-right pb-3 pl-4 font-semibold">Förändring</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const d = delta(row.suggestedVal, row.currentVal, row.lowerIsBetter);
                return (
                  <tr key={row.label} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 pr-4 text-slate-600">{row.label}</td>
                    <td className="text-right py-3 px-4 text-slate-400 tabular-nums">{fmt(row.currentVal)}</td>
                    <td className="text-right py-3 px-4 font-semibold text-[#111827] tabular-nums">{fmt(row.suggestedVal)}</td>
                    <td className="text-right py-3 pl-4 font-semibold tabular-nums">
                      {d ? (
                        <span className={d.better ? "text-[#16A34A]" : "text-red-500"}>
                          {d.diff > 0 ? "▲" : "▼"} {Math.abs(d.diff).toFixed(2)}%
                        </span>
                      ) : <span className="text-slate-300">–</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(feeSavingsKr !== null || returnGainKr !== null) && (
        <div className="bg-slate-50 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-[#111827]">Beräknad effekt per år</p>
            <p className="text-xs text-slate-400 text-right">
              {assumed ? "vid 100 000 kr investerat" : `vid ${pv.toLocaleString("sv-SE")} kr investerat`}
            </p>
          </div>
          <div className="space-y-3">
            {feeSavingsKr !== null && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#111827]">Avgiftsbesparing</p>
                  <p className="text-xs text-slate-400">Garanterad vid fondbyte</p>
                </div>
                <p className={`text-base font-bold tabular-nums ${feeSavingsKr >= 0 ? "text-[#16A34A]" : "text-red-500"}`}>
                  {`${feeSavingsKr >= 0 ? "+" : ""}${Math.round(feeSavingsKr).toLocaleString("sv-SE")} kr`}
                </p>
              </div>
            )}
            {returnGainKr !== null && (
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <div>
                  <p className="text-sm font-medium text-[#111827]">Historisk avkastningsskillnad</p>
                  <p className="text-xs text-slate-400">Baserat på 3-årsavkastning, annualiserad</p>
                </div>
                <p className={`text-base font-bold tabular-nums ${returnGainKr >= 0 ? "text-[#16A34A]" : "text-red-500"}`}>
                  {`${returnGainKr >= 0 ? "+" : ""}${Math.round(returnGainKr).toLocaleString("sv-SE")} kr`}
                </p>
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-400 leading-snug border-t border-slate-200 pt-3">
            Avgiftsbesparing realiseras vid fondbyte. Historisk avkastning är ingen garanti för framtida resultat — avkastningssiffran ska ses som referens, inte som en prognos.
          </p>
        </div>
      )}
    </section>
  );
}

function OptimalPortfolioProjection({ current, portfolioValue }: { current: CurrentMetrics; portfolioValue: number | null }) {
  const assumed = portfolioValue === null;
  const pv = portfolioValue ?? 100_000;
  const returnKr = current.weightedReturn3yr !== null ? (ann3yr(current.weightedReturn3yr) / 100) * pv : null;
  const feeKr = current.avgCost !== null ? (current.avgCost / 100) * pv : null;
  const netKr = returnKr !== null && feeKr !== null ? returnKr - feeKr : null;

  return (
    <section className="bg-white rounded-2xl p-6 sm:p-8" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)", border: "1px solid #F1F5F9" }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-0.5">Analys</p>
          <p className="text-lg font-semibold text-[#111827]">Din portfölj är redan optimal</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-5">
        <div className="flex items-start justify-between gap-2 mb-4">
          <p className="text-sm font-semibold text-[#111827]">Uppskattad avkastning per år</p>
          <p className="text-xs text-slate-400 text-right">
            {assumed ? "vid 100 000 kr investerat" : `vid ${pv.toLocaleString("sv-SE")} kr investerat`}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex sm:block items-center justify-between sm:justify-start">
            <p className="text-xs text-slate-400 sm:mb-1">Avkastning (3 år, ann.)</p>
            <p className={`text-sm sm:text-base font-bold tabular-nums ${returnKr !== null ? returnKr >= 0 ? "text-[#16A34A]" : "text-red-500" : "text-slate-400"}`}>
              {returnKr !== null ? `${returnKr >= 0 ? "+" : ""}${Math.round(returnKr).toLocaleString("sv-SE")} kr` : "–"}
            </p>
          </div>
          <div className="flex sm:block items-center justify-between sm:justify-start">
            <p className="text-xs text-slate-400 sm:mb-1">Avgifter</p>
            <p className="text-sm sm:text-base font-bold tabular-nums text-red-500">
              {feeKr !== null ? `−${Math.round(feeKr).toLocaleString("sv-SE")} kr` : "–"}
            </p>
          </div>
          <div className="flex sm:block items-center justify-between sm:justify-start border-t border-slate-200/60 sm:border-0 pt-3 sm:pt-0">
            <p className="text-xs text-slate-400 sm:mb-1 font-semibold">Netto</p>
            <p className={`text-base sm:text-xl font-bold tabular-nums ${netKr !== null ? netKr >= 0 ? "text-[#16A34A]" : "text-red-500" : "text-slate-400"}`}>
              {netKr !== null ? `${netKr >= 0 ? "+" : ""}${Math.round(netKr).toLocaleString("sv-SE")} kr` : "–"}
            </p>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-3">Baserat på 3-årsavkastning (annualiserad), exklusive avgifter. Historisk avkastning är ingen garanti för framtida resultat.</p>
      </div>
    </section>
  );
}
