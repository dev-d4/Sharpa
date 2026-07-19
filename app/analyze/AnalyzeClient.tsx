"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PortfolioAnalysis, SuggestedMetrics } from "@/lib/analysis";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight, FileUp, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react"
import type { SavedPortfolio } from "@/lib/portfolio"
import DonutChart from "@/components/ui/DonutChart"
import DataFreshness from "@/components/ui/DataFreshness"
import { computePortfolioScore } from "@/lib/portfolio-score"
import { CHART_PALETTE } from "@/lib/chart-palette"
import { useMobileBottomOverlay } from "@/lib/mobile-bottom-overlay"

// ── Types ─────────────────────────────────────────────────────────────────────

type Entry = { isin: string; name: string; weight: string; amount?: string };

// Builder-sparade portföljer har vikter som nummer i JSONB — Entry kräver strängar
function toEntries(holdings: { isin: string; name: string; weight: string | number; amount?: string | number }[]): Entry[] {
  return holdings.map((h) => ({
    isin: h.isin,
    name: h.name,
    weight: h.weight != null ? String(h.weight) : "",
    amount: h.amount != null ? String(h.amount) : undefined,
  }));
}
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
  { value: "equity", label: "Aktiefonder", desc: "Investerar i börsnoterade bolag" },
  { value: "fixed-income", label: "Räntefonder", desc: "Obligationer och penningmarknad" },
  { value: "allocation", label: "Blandfonder", desc: "Blandning av aktier och räntor" },
  { value: "alternative", label: "Alternativa fonder", desc: "Hedgefonder och råvaror" },
];

const MARKET_OPTIONS = [
  { value: "global", label: "Globalt" },
  { value: "sweden", label: "Sverige" },
  { value: "usa", label: "USA" },
  { value: "europe", label: "Europa" },
  { value: "nordic", label: "Norden" },
  { value: "emerging", label: "Tillväxtmarknader" },
  { value: "asia", label: "Asien" },
  { value: "sector", label: "Bransch/tema" },
];

const SECTOR_OPTIONS = [
  { value: "tech", label: "Teknik" },
  { value: "health", label: "Hälsa & biotech" },
  { value: "real-estate", label: "Fastigheter" },
  { value: "energy", label: "Energi & råvaror" },
  { value: "other-sector", label: "Annan bransch" },
];

const MANAGEMENT_OPTIONS = [
  { value: "any", label: "Spelar ingen roll", desc: "Visa alla förvaltningsstilar" },
  { value: "passive", label: "Indexfond", desc: "Följer ett index, låg avgift" },
  { value: "active", label: "Aktivt förvaltad", desc: "Fondförvaltare väljer placeringar" },
];

const COST_OPTIONS = [
  { value: null, label: "Ingen gräns", desc: "Visa alla avgiftsnivåer" },
  { value: 0.3, label: "Max 0,3%", desc: "Riktigt billiga fonder" },
  { value: 0.5, label: "Max 0,5%", desc: "Prisvärd nivå" },
  { value: 1.0, label: "Max 1,0%", desc: "Inkluderar aktiva fonder" },
];

const SORT_OPTIONS = [
  { value: "sharpe", label: "Bäst riskjusterad avkastning", desc: "Avkastning i förhållande till risk" },
  { value: "return", label: "Bäst historisk avkastning", desc: "Högst 3-årsavkastning" },
  { value: "cost", label: "Lägst avgift", desc: "Billigast fondavgift" },
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
    if (asset) pills.push(asset.label);
    if (a.assetClass === "equity" && a.market) {
      const m = MARKET_OPTIONS.find((o) => o.value === a.market);
      if (m) pills.push(m.label);
    }
    if (a.market === "sector" && a.sector) {
      const s = SECTOR_OPTIONS.find((o) => o.value === a.sector);
      if (s) pills.push(s.label);
    }
    if (a.management && a.management !== "any") {
      const m = MANAGEMENT_OPTIONS.find((o) => o.value === a.management);
      if (m) pills.push(m.label);
    }
    if (a.maxCost !== null && a.maxCost !== undefined) {
      pills.push(`Max ${String(a.maxCost).replace(".", ",")}% avgift`);
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
          <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Guidad sökning
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
            className="h-full bg-accent transition-all duration-300"
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
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-accent hover:bg-slate-50 transition-all text-left group"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{o.label}</p>
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
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-accent hover:bg-slate-50 transition-all text-left group"
              >
                <span className="text-sm font-medium text-slate-700">{o.label}</span>
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
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-accent hover:bg-slate-50 transition-all text-left group"
              >
                <span className="text-sm font-medium text-slate-700">{o.label}</span>
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
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-accent hover:bg-slate-50 transition-all text-left group"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{o.label}</p>
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
                className="flex flex-col gap-0.5 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-accent hover:bg-slate-50 transition-all text-left group"
              >
                <span className="text-sm font-semibold text-slate-800">{o.label}</span>
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
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-accent hover:bg-slate-50 transition-all text-left group"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{o.label}</p>
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
                  <span key={pill} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
                    {pill}
                  </span>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center gap-2.5 py-8">
                <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
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
                        className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-slate-200 text-accent hover:border-accent hover:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400"
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
                className="w-full text-xs font-medium text-slate-500 hover:text-slate-700 py-2 transition-colors"
              >
                Visa fler ({allResults.length - visibleCount} kvar)
              </button>
            )}

            {!loading && (
              <div className="border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={resetQuiz}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
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
      <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white min-w-0">
        <span className="flex-1 truncate font-medium text-slate-900">{name}</span>
        <span className="hidden sm:inline text-xs text-slate-400 shrink-0">{isin}</span>
        <button type="button" onClick={onClear} aria-label="Rensa vald fond" className="-m-1 p-1 text-slate-400 hover:text-red-500 shrink-0 transition-colors">✕</button>
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

// ── Recently used funds (localStorage) ────────────────────────────────────────

const RECENT_FUNDS_KEY = "fondanalys_recent_funds";

function readRecentFunds(): FundSuggestion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_FUNDS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr)
      ? arr.filter((f) => f && typeof f.isin === "string" && typeof f.name === "string").slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

function recordRecentFund(fund: FundSuggestion) {
  if (typeof window === "undefined") return;
  try {
    const existing = readRecentFunds().filter((f) => f.isin !== fund.isin);
    const next = [{ name: fund.name, isin: fund.isin }, ...existing].slice(0, 8);
    localStorage.setItem(RECENT_FUNDS_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

// ── Full-screen fund search sheet (mobile) ────────────────────────────────────
// Lets the user pick several funds in one session without the on-screen keyboard
// clipping the results list. Toggles selection live in the parent; "Klar" closes.

function FundSearchSheet({
  custodian,
  selectedIsins,
  onAdd,
  onRemove,
  onClose,
}: {
  custodian: string;
  selectedIsins: string[];
  onAdd: (isin: string, name: string) => void;
  onRemove: (isin: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<FundSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [recent] = useState<FundSuggestion[]>(() => readRecentFunds());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqSeq = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function handleChange(q: string) {
    setQuery(q);
    if (debounce.current) clearTimeout(debounce.current);
    if (q.trim().length < 2) {
      setSuggestions([]);
      setNoResults(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const seq = ++reqSeq.current;
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/funds/search?q=${encodeURIComponent(q)}&custodian=${encodeURIComponent(custodian)}`);
        const data: FundSuggestion[] = await res.json();
        if (seq !== reqSeq.current) return; // a newer query already fired
        setSuggestions(data);
        setNoResults(data.length === 0);
      } catch {
        if (seq === reqSeq.current) {
          setSuggestions([]);
          setNoResults(true);
        }
      } finally {
        if (seq === reqSeq.current) setLoading(false);
      }
    }, 200);
  }

  function toggle(fund: FundSuggestion) {
    if (selectedIsins.includes(fund.isin)) {
      onRemove(fund.isin);
    } else {
      onAdd(fund.isin, fund.name);
      recordRecentFund(fund);
    }
  }

  const showRecent = query.trim().length < 2;
  const list = showRecent ? recent : suggestions;
  const count = selectedIsins.length;

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-white sm:items-center sm:justify-center sm:bg-slate-900/40 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Lägg till fonder"
    >
      <div className="flex h-full w-full flex-col overflow-hidden bg-white sm:h-[85vh] sm:max-w-md sm:rounded-2xl sm:shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="-m-2 p-2 text-slate-400 transition-colors hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="font-semibold text-slate-900">Lägg till fonder</span>
        </div>

        {/* Search */}
        <div className="px-4 pb-2 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Sök fondnamn eller ISIN…"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-9 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => handleChange("")}
                aria-label="Rensa sökning"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
          {showRecent && recent.length > 0 && (
            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Senast använda
            </p>
          )}
          {showRecent && recent.length === 0 && (
            <p className="px-3 py-12 text-center text-sm text-slate-400">
              Sök på fondnamn eller ISIN för att lägga till fonder i din portfölj.
            </p>
          )}
          {!showRecent && loading && list.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-slate-400">Söker…</p>
          )}
          {!showRecent && !loading && noResults && (
            <p className="px-3 py-8 text-center text-sm text-slate-500">
              Ingen fond hittades för &ldquo;{query}&rdquo;.
            </p>
          )}
          <ul>
            {list.map((f, i) => {
              const isSelected = selectedIsins.includes(f.isin);
              return (
                <li key={`${f.isin}-${i}`}>
                  <button
                    type="button"
                    onClick={() => toggle(f)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                      isSelected ? "bg-blue-50" : "hover:bg-slate-50 active:bg-slate-100"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm leading-none",
                        isSelected ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300 text-slate-400"
                      )}
                      aria-hidden="true"
                    >
                      {isSelected ? "✓" : "+"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">{f.name}</span>
                      <span className="block text-xs text-slate-400">{f.isin}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-[10px] bg-accent py-3 font-semibold text-white transition-colors hover:bg-accent-hover active:bg-accent-press"
          >
            {count > 0 ? `Klar · ${count} ${count === 1 ? "fond vald" : "fonder valda"}` : "Klar"}
          </button>
        </div>
      </div>
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

function hasMeaningfulAnalyzeState(custodian: string | null, entries: Entry[], analysis: PortfolioAnalysis | null) {
  return Boolean(
    custodian ||
    analysis ||
    entries.some((entry) => entry.isin.trim() || entry.name.trim() || entry.weight.trim() || entry.amount?.trim())
  );
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
  const [inputMode, setInputMode] = useState<"weight" | "amount">("weight");
  const [inputCollapsed, setInputCollapsed] = useState(false);

  // Input method: how the user wants to populate their portfolio
  const [inputMethod, setInputMethod] = useState<"ai" | "manual" | null>(null);

  // Mobile full-screen fund search sheet
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);

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
  const autoRunPendingRef = useRef(false);

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
            setEntries(toEntries(p.holdings));
            // Snapshoten kan vara gammal — kör om analysen mot aktuell fonddata
            setAnalysis(null);
            autoRunPendingRef.current = true;
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
        autoRunPendingRef.current = true;
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
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Dela custodian-valet med portföljbyggaren, som förifyller sin plattformsfråga
  useEffect(() => {
    if (!custodian) return;
    try { sessionStorage.setItem("fondanalys_custodian", custodian); } catch { /* ignore */ }
  }, [custodian]);

  useEffect(() => {
    function saveBeforeLogin() {
      if (!hasMeaningfulAnalyzeState(custodian, entries, analysis)) return;
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ custodian, entries, analysis }));
      } catch { /* ignore */ }
    }

    window.addEventListener("fondanalys:before-login", saveBeforeLogin);
    return () => window.removeEventListener("fondanalys:before-login", saveBeforeLogin);
  }, [custodian, entries, analysis]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (portfolioDropdownRef.current && !portfolioDropdownRef.current.contains(e.target as Node)) {
        setPortfolioDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Auto-run analysis when navigating here from the portfolio builder
  useEffect(() => {
    if (autoRunPendingRef.current && custodian && entries.some((e) => e.isin)) {
      autoRunPendingRef.current = false;
      analyze();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [custodian, entries]);

  function loadPortfolio(p: SavedPortfolio) {
    setCustodian(p.custodian);
    setEntries(toEntries(p.holdings));
    // Visa inte den sparade analys-snapshoten — den kan vara månader gammal.
    // Kör om analysen mot aktuell fonddata i stället.
    setAnalysis(null);
    autoRunPendingRef.current = true;
    setPortfolioId(p.id);
    setInputMethod("manual");
    setInputCollapsed(true);
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
    recordRecentFund({ isin, name });
  }
  function clearFund(i: number) {
    setEntries((p) => p.map((e, idx) => idx === i ? { ...e, isin: "", name: "" } : e));
  }

  // Mobile search sheet: add / remove funds by ISIN, then even-split weights on close.
  function addFundFromSheet(isin: string, name: string) {
    setEntries((prev) => {
      if (prev.some((e) => e.isin === isin)) return prev;
      const empty = prev.findIndex((e) => !e.isin);
      if (empty !== -1) return prev.map((e, idx) => idx === empty ? { ...e, isin, name } : e);
      return [...prev, { isin, name, weight: "", amount: "" }];
    });
  }
  function removeFundByIsin(isin: string) {
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.isin !== isin);
      return filtered.length ? filtered : [{ isin: "", name: "", weight: "" }];
    });
  }
  function closeSearchSheet() {
    setSearchSheetOpen(false);
    if (inputMode === "weight") distributeWeights();
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
    "Jämför med liknande alternativ…",
    "Sammanställer analysen…",
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
      setInputCollapsed(true);
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
    router.push("/login?next=/analyze&skip_onboarding=1");
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
      <div className="fixed inset-x-0 top-14 bottom-0 z-40 flex items-center justify-center bg-white px-4 sm:top-16">
        <div className="mx-auto w-full max-w-xs space-y-6 text-center">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
          <p className="flex min-h-6 items-center justify-center text-center text-base font-medium text-slate-700">
            {LOADING_STEPS[loadingStep]}
          </p>
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
                    onClick={() => { setPortfolioId(null); setCustodian(null); setEntries([{ isin: "", name: "", weight: "" }]); setAnalysis(null); setInputCollapsed(false); setError(null); setInputMethod(null); setPortfolioDropdownOpen(false); }}
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

      <section className="no-print bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-5">
        {analysis && inputCollapsed ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-heading text-base font-bold text-slate-900">Din portfölj</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {entries.filter((e) => e.isin).length} fonder analyserade.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInputCollapsed(false)}
              className="inline-flex w-full items-center justify-center rounded-[10px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:border-accent hover:bg-info sm:w-auto"
            >
              Ändra fonder
            </button>
          </div>
        ) : (
          <>
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-bold text-slate-900 shrink-0">Din portfölj</h2>
        </div>

        {/* Custodian selector */}
        <div className="rounded-xl border border-line-soft bg-section/60 p-3 sm:p-4">
          <div className="pb-3">
            <p className="font-heading text-base font-bold text-ink">Var finns dina fonder?</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { value: "avanza", label: "Avanza" },
              { value: "nordnet", label: "Nordnet" },
              { value: "övrigt", label: "Annat ställe" },
            ].map((c) => (
              <button
                key={c.value}
                type="button"
                aria-label={c.label}
                onClick={() => {
                  if (custodian !== c.value) {
                    setEntries([{ isin: "", name: "", weight: "" }]);
                    setInputMethod(null);
                    setAnalysis(null);
                    setInputCollapsed(false);
                    setError(null);
                    setPortfolioId(null);
                  }
                  setCustodian(c.value);
                }}
                className={cn(
                  "flex min-h-[46px] items-center justify-center rounded-[10px] border px-4 py-2.5 text-center text-sm font-bold transition-all",
                  custodian === c.value
                    ? "border-accent bg-accent text-white shadow-sm"
                    : "border-line-soft bg-white text-ink-2 hover:border-info-line hover:bg-white hover:text-accent"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
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
            <div className="space-y-3">
              <div>
                <p className="font-heading text-base font-bold text-ink">Hur vill du lägga in innehaven?</p>
                <p className="mt-1 text-sm text-ink-3">Sök själv, ladda upp en CSV eller låt guiden hjälpa dig hitta fonder.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {/* Manual */}
              <button
                type="button"
                onClick={() => setInputMethod("manual")}
                className={cn(
                  "group flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-center transition-all",
                  inputMethod === "manual"
                    ? "border-accent bg-info shadow-sm ring-1 ring-accent/15"
                    : "border-line-soft bg-white hover:border-info-line hover:bg-section/60"
                )}
              >
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border transition-colors", inputMethod === "manual" ? "border-accent bg-accent text-white" : "border-line-soft bg-section text-ink-3 group-hover:text-accent")}>
                  <Search className="h-4 w-4" />
                </span>
                <span>
                  <span className={cn("block text-sm font-semibold", inputMethod === "manual" ? "text-accent" : "text-ink")}>
                    Sök manuellt
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-ink-3">
                    Sök på fondnamn eller ISIN
                  </span>
                </span>
              </button>

              {/* Import */}
              <button
                type="button"
                onClick={() => { setImportResult(null); setImportWizard({ open: true, step: 1, file: null, name: "" }); }}
                disabled={importing}
                className={cn(
                  "group flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-center transition-all disabled:cursor-wait",
                  importing
                    ? "border-accent bg-info shadow-sm ring-1 ring-accent/15"
                    : "border-line-soft bg-white hover:border-info-line hover:bg-section/60"
                )}
              >
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border transition-colors", importing ? "border-accent bg-accent text-white" : "border-line-soft bg-section text-ink-3 group-hover:text-accent")}>
                  {importing ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <FileUp className="h-4 w-4" />
                  )}
                </span>
                <span>
                  <span className={cn("block text-sm font-semibold", importing ? "text-accent" : "text-ink")}>
                    {importing ? "Importerar…" : "Importera fil"}
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-ink-3">
                    Ladda upp en CSV-fil
                  </span>
                </span>
              </button>

              {/* AI */}
              <button
                type="button"
                onClick={() => setInputMethod("ai")}
                className={cn(
                  "group flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-center transition-all",
                  inputMethod === "ai"
                    ? "border-accent bg-info shadow-sm ring-1 ring-accent/15"
                    : "border-line-soft bg-white hover:border-info-line hover:bg-section/60"
                )}
              >
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border transition-colors", inputMethod === "ai" ? "border-accent bg-accent text-white" : "border-line-soft bg-section text-ink-3 group-hover:text-accent")}>
                  <SlidersHorizontal className="h-4 w-4" />
                </span>
                <span>
                  <span className={cn("block text-sm font-semibold", inputMethod === "ai" ? "text-accent" : "text-ink")}>
                    Guidad sökning
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-ink-3">
                    Svara på några snabba frågor
                  </span>
                </span>
              </button>
              </div>
            </div>

            {/* AI widget — shown when AI method selected */}
            {inputMethod === "ai" && (
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
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Innehav</p>
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label="Ange innehav i vikt eller belopp">
                {([["weight", "Vikt (%)"], ["amount", "Belopp (kr)"]] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setInputMode(mode)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                      inputMode === mode ? "bg-white text-ink shadow-sm" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

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
                <div key={i} className={cn("space-y-2.5 sm:space-y-0 sm:grid sm:grid-cols-[1fr_100px_44px] sm:gap-2 bg-slate-50 sm:bg-transparent rounded-xl sm:rounded-none p-4 sm:p-0 border border-slate-100 sm:border-0", !entry.isin && "hidden sm:grid")}>
                  {/* Mobil: rubrikrad med ta bort-knapp — desktop har egen knappkolumn */}
                  <div className="flex items-center justify-between sm:hidden">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Fond {i + 1}</p>
                    <button
                      onClick={() => removeRow(i)} disabled={entries.length === 1} aria-label={`Ta bort fond ${i + 1}`}
                      className="-m-2 p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                    >✕</button>
                  </div>
                  <FundSearchInput isin={entry.isin} name={entry.name} custodian={custodian} excludeIsins={entries.filter((_, idx) => idx !== i).map((e) => e.isin).filter(Boolean)} onSelect={(isin, name) => selectFund(i, isin, name)} onClear={() => clearFund(i)} />
                  <div className="flex items-center gap-3 sm:contents">
                    <label htmlFor={`entry-value-${i}`} className="sm:hidden w-24 shrink-0 text-[13px] font-medium text-slate-500">
                      {inputMode === "weight" ? "Vikt (%)" : "Belopp (kr)"}
                    </label>
                    {inputMode === "weight" ? (
                      <input
                        id={`entry-value-${i}`}
                        type="number" inputMode="decimal" placeholder="%" min={0} max={100}
                        value={entry.weight} onChange={(e) => updateWeight(i, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRow(); } }}
                        className="flex-1 min-w-0 sm:w-auto sm:flex-none border border-slate-300 rounded-lg px-3 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <input
                        id={`entry-value-${i}`}
                        type="number" inputMode="numeric" placeholder="kr" min={0}
                        value={entry.amount ?? ""} onChange={(e) => updateAmount(i, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRow(); } }}
                        className="flex-1 min-w-0 sm:flex-none border border-slate-300 rounded-lg px-3 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                    <button
                      onClick={() => removeRow(i)} disabled={entries.length === 1} aria-label={`Ta bort fond ${i + 1}`}
                      className="hidden sm:flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 disabled:opacity-30 transition-colors shrink-0"
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile: fund selection happens in a full-screen search sheet */}
            {inputMethod !== "ai" && (
              <button
                type="button"
                onClick={() => setSearchSheetOpen(true)}
                className="sm:hidden flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-3.5 text-sm font-semibold text-blue-600 active:bg-slate-50 transition-colors"
              >
                <Search className="w-4 h-4" />
                {entries.some((e) => e.isin) ? "Lägg till fler fonder" : "Lägg till fonder"}
              </button>
            )}

            <div className="flex items-center justify-between pt-1">
              {inputMethod !== "ai" && (
                <button onClick={addRow} className="hidden sm:inline text-sm text-blue-600 hover:underline py-2">+ Lägg till fond</button>
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
              className="w-full bg-accent hover:bg-accent-hover active:bg-accent-press disabled:bg-blue-300 text-white font-semibold rounded-[10px] py-3 transition-colors"
            >
              {loading ? "Analyserar…" : "Analysera portfölj"}
            </button>

            {searchSheetOpen && (
              <FundSearchSheet
                custodian={custodian}
                selectedIsins={entries.map((e) => e.isin).filter(Boolean)}
                onAdd={addFundFromSheet}
                onRemove={removeFundByIsin}
                onClose={closeSearchSheet}
              />
            )}
          </>
        )}
        </>
        )}
      </section>

      <div ref={resultsRef} />
      {analysis && <AnalysisResult analysis={analysis} portfolioValue={portfolioValue} user={user} onLoginClick={handleLoginFromBlur} />}

      {analysis && user && !portfolioId && (
        <section className="no-print bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          {!showSaveForm ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Spara portföljen?</p>
                <p className="text-xs text-slate-400 mt-0.5">Kom åt den när som helst från Mitt konto.</p>
              </div>
              <button
                onClick={() => setShowSaveForm(true)}
                className="shrink-0 bg-accent hover:bg-accent-hover active:bg-accent-press text-white text-sm font-semibold px-4 py-2.5 rounded-[10px] transition-colors"
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
                  className="bg-accent hover:bg-accent-hover active:bg-accent-press disabled:bg-blue-300 text-white text-sm font-semibold px-4 py-2 rounded-[10px] transition-colors"
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

      {analysis && <DataFreshness className="no-print pt-2" />}
    </div></div>

    {/* Import wizard modal */}
    {importWizard.open && (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
        onClick={(e) => { if (e.target === e.currentTarget) setImportWizard(w => ({ ...w, open: false })); }}
      >
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
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
                        <div className="w-10 h-10 rounded-[10px] bg-blue-100 flex items-center justify-center mx-auto">
                          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="font-medium text-slate-900 text-sm">{importWizard.file.name}</p>
                        <p className="text-xs text-slate-400">Klicka för att byta fil</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-[10px] bg-slate-100 flex items-center justify-center mx-auto">
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
                  className="w-full bg-accent hover:bg-accent-hover active:bg-accent-press disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-[10px] transition-colors text-sm"
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
                    className="flex-1 bg-accent hover:bg-accent-hover active:bg-accent-press disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-[10px] transition-colors text-sm flex items-center justify-center gap-2"
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

  const scoreColor = score >= 7.5 ? "#18864B" : score >= 5 ? "#B97818" : "#C23A32";
  const allocationSlices = (analysis.detailedBreakdown ?? []).map(c => ({ label: c.label, weight: c.weight }));
  const allocationCenter = allocationSlices[0];

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
  // Riskspridning mäts på de detaljerade kategorierna (regioner/byggkategorier) —
  // samma källa som portföljbetyget använder — inte de grova tillgångsslagen, så
  // en portfölj spridd över många kategorier räknas som välspridd och etiketten
  // blir konsekvent med betyget.
  const diversitySource = analysis.detailedBreakdown ?? analysis.categoryBreakdown;
  if (diversitySource?.length) {
    const n = diversitySource.filter(c => c.weight > 5).length;
    if (n >= 3) strengths.push("Bra riskspridning");
    else warnings.push("Låg riskspridning");
  }
  if (analysis.weightedReturn3yr !== null) {
    if (analysis.weightedReturn3yr > 10) strengths.push("Stark historisk avkastning");
    else if (analysis.weightedReturn3yr < 3) warnings.push("Låg historisk avkastning");
  }

  return (
    <div className="space-y-5 animate-fade">

      {/* Print-only header + score card */}
      <div className="print-only hidden">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
          <p className="text-base font-bold text-slate-900">Sharpa</p>
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
                <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-slate-400 mb-1">Beräknad skillnad</p>
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

      {/* Sammanfattande betygskort */}
      <section className="no-print bg-white rounded-xl border border-line p-4 sm:p-8" style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04)" }}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] uppercase text-ink-3 mb-2">Portföljbetyg</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-5xl sm:text-6xl font-bold tabular-nums" style={{ color: scoreColor }}>
                {score.toFixed(1).replace(".", ",")}
              </span>
              <span className="text-2xl text-ink-4 font-light">/10</span>
            </div>
          </div>
          {potentialGainKr !== null && (
            <div className="sm:text-right">
              <p className="text-xs font-semibold tracking-[0.08em] uppercase text-ink-3 mb-2">Beräknad skillnad</p>
              <p className="text-2xl sm:text-3xl font-bold text-pos tabular-nums">+{Math.round(potentialGainKr).toLocaleString("sv-SE")} kr</p>
              <p className="text-xs text-ink-3 mt-1">per år{assumed ? " (vid 100 000 kr)" : ""}</p>
              <p className="text-[10px] text-ink-4 mt-0.5">inkl. historisk avkastningsskillnad</p>
            </div>
          )}
        </div>

        <p className="mt-5 pt-5 border-t border-line-soft text-ink-2 leading-relaxed text-[15px]">
          {analysis.summaryText}
        </p>

        {(strengths.length > 0 || warnings.length > 0) && (
          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            {strengths.length > 0 && (
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] uppercase text-ink-3 mb-2">Styrkor</p>
                <div className="space-y-1.5">
                  {strengths.map(s => (
                    <p key={s} className="text-sm text-pos flex items-center gap-2">
                      <span className="shrink-0">✓</span> {s}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {warnings.length > 0 && (
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] uppercase text-ink-3 mb-2">Förbättringsområden</p>
                <div className="space-y-1.5">
                  {warnings.map(w => (
                    <p key={w} className="text-sm text-warn flex items-center gap-2">
                      <span className="shrink-0">⚠</span> {w}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-line-soft flex justify-end">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-xs text-ink-3 hover:text-ink transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Spara som PDF
          </button>
        </div>
      </section>

      {/* Key metrics + allocation */}
      <section className="overflow-hidden bg-white rounded-xl p-4 sm:p-8" style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04)", border: "1px solid #D9E0E6" }}>
        <p className="mb-5 text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 sm:mb-6">Nyckeltal</p>
        <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 lg:items-start">
          <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-8">
            <Metric label="Snittavgift" value={analysis.avgCost !== null ? `${analysis.avgCost.toFixed(2)}%` : "–"} sub="per år" info="Den genomsnittliga årliga avgiften viktat efter din fördelning." />
            <Metric label="Avkastning 1 år" value={analysis.weightedReturn1yr !== null ? `${analysis.weightedReturn1yr.toFixed(1)}%` : "–"} sub="senaste 12 mån" info="Portföljens viktade avkastning de senaste 12 månaderna." />
            <Metric label="Avkastning 3 år" value={analysis.weightedReturn3yr !== null ? `${analysis.weightedReturn3yr.toFixed(1)}%` : "–"} sub="totalt" info="Portföljens viktade totalavkastning de senaste 3 åren." />
            <Metric label="Sharpe 3 år" value={analysis.weightedSharpe !== null ? analysis.weightedSharpe.toFixed(2) : "–"} sub="riskjusterad" info="Avkastning i förhållande till risk. Högre är bättre." />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-4">Fördelning</p>
            <div className="sm:hidden">
              <DonutChart
                palette={CHART_PALETTE}
                slices={allocationSlices}
                centerLabel={allocationCenter ? `${allocationCenter.weight.toFixed(0)}%` : ""}
                centerSub={allocationCenter?.label ?? ""}
                size={132}
                thickness={20}
                disableHover
              />
            </div>
            <div className="hidden sm:block">
              <DonutChart
                palette={CHART_PALETTE}
                slices={allocationSlices}
                centerLabel={allocationCenter ? `${allocationCenter.weight.toFixed(0)}%` : ""}
                centerSub={allocationCenter?.label ?? ""}
                size={145}
                thickness={22}
                horizontal
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-snug">* Baseras på fondkategori, inte underliggande innehav.</p>
          </div>
        </div>

        {/* Tillgångsslag + Förvaltningsstil */}
        <div className="mt-8 pt-6 border-t border-slate-50 grid sm:grid-cols-2 gap-8">
          {(analysis.categoryBreakdown?.length ?? 0) > 0 && (() => {
            const ASSET_COLORS: Record<string, string> = {
              Aktiefonder:          "#0B6E99",
              Räntefonder:          "#D9A542",
              Blandfonder:          "#18864B",
              "Alternativa fonder": "#5D6B78",
              Penningmarknadsfonder:"#7FB3CC",
              Övrigt:               "#9CA8B3",
            };
            const items = (analysis.categoryBreakdown ?? []).filter(c => c.weight > 0);
            return (
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-3">Tillgångsslag</p>
                <div className="h-3 rounded-full overflow-hidden flex">
                  {items.map((c) => (
                    <div key={c.label} style={{ width: `${c.weight}%`, backgroundColor: ASSET_COLORS[c.label] ?? "#9CA8B3" }} />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                  {items.map((c) => (
                    <div key={c.label} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[c.label] ?? "#9CA8B3" }} />
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
              { label: "Aktivt förvaltad", value: analysis.managementBreakdown.active,  color: "#0B6E99" },
              { label: "Indexfond",         value: analysis.managementBreakdown.passive, color: "#D9A542" },
              { label: "Oklassad",          value: analysis.managementBreakdown.unknown, color: "#9CA8B3" },
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

      {/* Swap suggestions + best-in-category */}
      {((analysis.swapSuggestions?.length ?? 0) > 0 ||
        (analysis.bestInCategory?.length ?? 0) > 0) && (
        <section className="relative bg-white rounded-xl p-6 sm:p-8" style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04)", border: "1px solid #D9E0E6" }}>
            <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-1">Jämförbara alternativ</p>
            <p className="text-lg font-semibold text-ink mb-4">Alternativ med starkare nyckeltal</p>

            {showBlur ? (
            <div>
              <div aria-hidden className="pointer-events-none select-none divide-y divide-slate-200">
                {[
                  ["Swedbank Robur Ny Teknik A", "TIN Ny Teknik A"],
                  ["Länsförsäkringar Global Aktiv A", "Avanza Global"],
                  ["SEB Sverigefond Stora bolag", "PLUS Allabolag Sverige Index"],
                ].map(([cur, sug], i) => (
                  <div key={i} className="py-4 flex flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-2">
                    <div className="min-w-0 sm:flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-accent mb-1">Nuvarande</p>
                      <p className="text-sm font-semibold text-ink leading-snug">{cur}</p>
                    </div>
                    <div className="flex shrink-0 items-center justify-center sm:px-1">
                      <div className="w-7 h-7 rounded-[10px] bg-slate-100 flex items-center justify-center">
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-90 sm:rotate-0" />
                      </div>
                    </div>
                    <div className="min-w-0 sm:flex-1 sm:text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-accent mb-1">Alternativ</p>
                      <p className="text-sm font-semibold text-ink leading-snug">{sug}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="no-print absolute inset-0 rounded-xl backdrop-blur-[8px] bg-white/50" />
              <div className="no-print absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6 space-y-3">
                <p className="text-base font-semibold text-ink leading-snug max-w-md">
                  {potentialGainKr !== null
                    ? `Logga in för att se jämförbara alternativ med +${Math.round(potentialGainKr).toLocaleString("sv-SE")} kr/år i beräknad skillnad`
                    : "Logga in för att se jämförbara fondalternativ"}
                </p>
                {potentialGainKr !== null && assumed && (
                  <p className="text-xs text-ink-3 max-w-sm">Beräknat på ett antaget sparkapital om 100 000 kr.</p>
                )}
                <p className="text-xs text-ink-3">Gratis · Klart på under en minut</p>
                <button
                  onClick={onLoginClick}
                  className="inline-flex items-center justify-center bg-accent hover:bg-accent-hover active:bg-accent-press text-white text-sm font-semibold px-7 py-2.5 rounded-[10px] transition-colors"
                >
                  Logga in
                </button>
              </div>
            </div>
            ) : (
              <>

            {(analysis.bestInCategory?.length ?? 0) > 0 && (() => {
              const bics = analysis.bestInCategory ?? [];
              const hasSwaps = (analysis.swapSuggestions?.length ?? 0) > 0;
              const label = bics.length === 1 ? "Redan bäst i sin kategori" : "Redan bäst i sina kategorier";
              return (
                <div className={`flex items-start gap-3 ${hasSwaps ? "mb-4 pb-4 border-b border-slate-200" : ""}`}>
                  <div className="w-8 h-8 rounded-[10px] bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-green-600 mb-1">{label}</p>
                    {bics.map((bic, i) => (
                      <p key={i} className="text-sm font-semibold text-ink leading-snug truncate">{bic.fundName}</p>
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

                      // Jämförelsedata för infopanelen — sammanvägt när flera fonder byts mot samma
                      const sugCost = suggested.ongoing_cost_actual ?? suggested.ongoing_cost_estimated;
                      let curCost: number | null = s.currentFund.ongoing_cost_actual ?? s.currentFund.ongoing_cost_estimated;
                      let curReturn: number | null = s.currentFund.return_3yr;
                      let curSharpe: number | null = s.currentFund.sharpe_3yr;
                      if (isMultiGroup) {
                        const totalW = group.reduce((sum, item) => sum + item.weight, 0);
                        const items = group.map(item => ({
                          normW: totalW > 0 ? item.weight / totalW : 0,
                          cost: item.currentFund.ongoing_cost_actual ?? item.currentFund.ongoing_cost_estimated,
                          r3yr: item.currentFund.return_3yr,
                          sharpe: item.currentFund.sharpe_3yr,
                        }));
                        curCost = totalW > 0 && items.every(x => x.cost !== null)
                          ? items.reduce((sum, x) => sum + x.normW * x.cost!, 0) : null;
                        curReturn = totalW > 0 && items.every(x => x.r3yr != null)
                          ? items.reduce((sum, x) => sum + x.normW * x.r3yr!, 0) : null;
                        curSharpe = totalW > 0 && items.every(x => x.sharpe !== null)
                          ? items.reduce((sum, x) => sum + x.normW * x.sharpe!, 0) : null;
                      }

                      return (
                        <div
                          key={gi}
                          className={`py-4 first:pt-0 last:pb-0${hidden ? " swap-hidden" : ""}`}
                        >
                          {isConsolidate && isMultiGroup && (
                            <div className="mb-2">
                              <span className="inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-info text-accent">
                                Konsolidera {group.length} fonder
                              </span>
                            </div>
                          )}
                          <div className="relative flex flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-2">
                            <div className="min-w-0 pr-8 sm:pr-0 sm:flex-1">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-accent mb-1">Nuvarande</p>
                              {group.map((item, si) => (
                                <p key={si} className="text-sm font-semibold text-ink leading-snug break-words">{item.currentFund.name}</p>
                              ))}
                            </div>
                            <div className="flex shrink-0 items-center justify-center sm:px-1">
                              <div className="w-7 h-7 rounded-[10px] bg-slate-100 flex items-center justify-center">
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-90 sm:rotate-0" />
                              </div>
                            </div>
                            <div className="min-w-0 sm:flex-1 sm:text-right">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-accent mb-1">
                                {isConsolidate ? "Alternativt ökad vikt i befintlig fond" : "Alternativ"}
                              </p>
                              <p className="text-sm font-semibold text-ink leading-snug break-words">{suggested.name}</p>
                            </div>
                            <div className="absolute top-0 right-0 sm:static sm:shrink-0 sm:pt-0.5">
                              <InfoPopover title="Jämförelse" width={340} ariaLabel="Visa jämförelse mellan nuvarande fond och alternativ fond">
                                {suggested.category && (
                                  <p className="text-[11px] text-slate-400 mb-2.5">{suggested.category}</p>
                                )}
                                <div className="grid grid-cols-[1fr_auto_auto] gap-x-5 gap-y-2 items-baseline">
                                  <span />
                                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 text-right whitespace-nowrap">Nuvarande</span>
                                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 text-right whitespace-nowrap">{isConsolidate ? "Ökad vikt" : "Alternativ"}</span>

                                  <span className="text-xs text-slate-500">Avgift</span>
                                  <span className="text-xs font-semibold text-ink tabular-nums text-right">{curCost !== null ? `${curCost.toFixed(2)}%` : "–"}</span>
                                  <span className="text-xs font-semibold text-accent tabular-nums text-right">{sugCost !== null ? `${sugCost.toFixed(2)}%` : "–"}</span>

                                  <span className="text-xs text-slate-500 whitespace-nowrap">Avkastning 3 år</span>
                                  <span className="text-xs font-semibold text-ink tabular-nums text-right">{curReturn != null ? `${curReturn.toFixed(1)}%` : "–"}</span>
                                  <span className="text-xs font-semibold text-accent tabular-nums text-right">{suggested.return_3yr != null ? `${suggested.return_3yr.toFixed(1)}%` : "–"}</span>

                                  <span className="text-xs text-slate-500">Sharpe</span>
                                  <span className="text-xs font-semibold text-ink tabular-nums text-right">{curSharpe !== null ? curSharpe.toFixed(2) : "–"}</span>
                                  <span className="text-xs font-semibold text-accent tabular-nums text-right">{suggested.sharpe_3yr !== null ? suggested.sharpe_3yr.toFixed(2) : "–"}</span>
                                </div>
                                {isMultiGroup && (
                                  <p className="text-[10px] text-slate-400 mt-2.5">Nuvarande = sammanvägt över {group.length} fonder utifrån dina vikter.</p>
                                )}
                              </InfoPopover>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {total > VISIBLE && (
                    <button
                      onClick={() => setShowAllSwaps(v => !v)}
                      className="mt-2 w-full py-2.5 text-sm font-medium text-slate-500 hover:text-ink border border-slate-100 hover:border-slate-200 rounded-xl transition-colors"
                    >
                      {showAllSwaps ? "Visa färre förslag" : `Visa alla ${total} förslag`}
                    </button>
                  )}
                </>
              );
            })()}

              </>
            )}

          </section>
      )}

      {!showBlur && analysis.suggestedMetrics && (
        <SuggestedPortfolio
          current={{ avgCost: analysis.avgCost, weightedReturn1yr: analysis.weightedReturn1yr, weightedReturn3yr: analysis.weightedReturn3yr, weightedSharpe: analysis.weightedSharpe }}
          suggested={analysis.suggestedMetrics}
          portfolioValue={portfolioValue}
        />
      )}

      {!showBlur && !analysis.suggestedMetrics && (analysis.swapSuggestions?.length ?? 0) === 0 && (
        <OptimalPortfolioProjection
          current={{ avgCost: analysis.avgCost, weightedReturn1yr: analysis.weightedReturn1yr, weightedReturn3yr: analysis.weightedReturn3yr, weightedSharpe: analysis.weightedSharpe }}
          portfolioValue={portfolioValue}
        />
      )}

      {showBlur && (analysis.swapSuggestions?.length ?? 0) === 0 && (analysis.bestInCategory?.length ?? 0) === 0 && (
        <section className="no-print bg-white rounded-xl p-6 sm:p-8 text-center space-y-3" style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04)", border: "1px solid #D9E0E6" }}>
          <p className="text-base font-semibold text-ink leading-snug max-w-md mx-auto">Logga in för att se jämförbara fondalternativ</p>
          <p className="text-xs text-ink-4">Gratis · Klart på under en minut</p>
          <button
            onClick={onLoginClick}
            className="inline-flex items-center justify-center bg-accent hover:bg-accent-hover active:bg-accent-press text-white text-sm font-semibold px-7 py-2.5 rounded-[10px] transition-colors"
          >
            Logga in
          </button>
        </section>
      )}

      {analysis.notFound.length > 0 && (
        <section className="bg-warn-soft border border-amber-100 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            <span className="font-medium">Hittades inte: </span>{analysis.notFound.join(", ")}
          </p>
        </section>
      )}
      {/* Friskrivning */}
      <p className="no-print text-[11px] text-slate-400 leading-relaxed">
        Analysen är automatiskt genererad utifrån historiska nyckeltal och generella kriterier och
        utgör inte finansiell rådgivning. Sharpa står inte under Finansinspektionens tillsyn och
        har inget tillstånd att bedriva investeringsrådgivning. Historisk avkastning är ingen garanti
        för framtida resultat — investeringsbeslut fattas på egen risk.
      </p>

      {/* Print footer */}
      <div className="print-footer hidden">
        sharpa.se — Automatiskt genererad analys. Historisk avkastning är ingen garanti för framtida resultat. Ej finansiell rådgivning.
      </div>

    </div>
  );
}

// ── InfoPopover ───────────────────────────────────────────────────────────────
// Gemensam infoknapp för nyckeltal och jämförelser. På pekarenheter (hover)
// visas en tooltip som anchoras under knappen och stängs vid tap utanför,
// Escape, scroll eller resize. På touch öppnas istället en bottom sheet med
// dimmer och stängkryss — den stängs INTE av scroll, så man hinner läsa klart.

const POPOVER_WIDTH = 288;

function InfoPopover({ title, ariaLabel, width = POPOVER_WIDTH, children }: { title?: string; ariaLabel?: string; width?: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // Touch devices (no hover) get a bottom sheet; pointer devices get a tooltip.
  // Read once at mount — the panel only renders after interaction, so there is
  // no hydration mismatch even though the server can't know the device.
  const [isTouch] = useState(() =>
    typeof window !== "undefined" && !window.matchMedia("(hover: hover)").matches
  );
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  function show() {
    // Touch → bottom sheet, no anchoring needed
    if (isTouch) { setOpen(true); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const margin = 12;
    const w = Math.min(width, window.innerWidth - margin * 2);
    const left = Math.max(margin, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - margin));
    setPos({ top: r.bottom + 8, left });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);

    // Touch: lock body scroll behind the sheet; do NOT close on scroll
    if (isTouch) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
        document.removeEventListener("keydown", onKey);
      };
    }

    // Desktop tooltip: dismiss on outside tap, scroll or resize
    function onDown(e: MouseEvent | TouchEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function close() { setOpen(false); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, isTouch]);

  useMobileBottomOverlay(open && isTouch, sheetRef, "info-popover");

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel ?? "Mer information"}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          if (open && isTouch) setOpen(false);
          else show();
        }}
        onMouseEnter={() => { if (!isTouch) show(); }}
        onMouseLeave={() => { if (!isTouch) setOpen(false); }}
        className="no-print shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      </button>

      {/* Touch: bottom sheet */}
      {open && isTouch && (
        <div
          className="no-print fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/40 normal-case tracking-normal font-normal"
          onClick={() => setOpen(false)}
        >
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "Information"}
            className="max-h-[80vh] overflow-y-auto overscroll-contain rounded-t-2xl bg-white px-5 pb-8 pt-4 text-left"
            style={{ boxShadow: "0 -8px 24px rgba(16,24,40,.12)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <p className="text-sm font-semibold text-ink">{title ?? "Information"}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Stäng"
                className="-m-2 shrink-0 p-2 text-slate-400 transition-colors hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-sm leading-relaxed text-slate-600 whitespace-normal">
              {children}
            </div>
          </div>
        </div>
      )}

      {/* Hover: anchored tooltip */}
      {open && !isTouch && pos && (
        <div
          ref={panelRef}
          role="tooltip"
          style={{ top: pos.top, left: pos.left, width: Math.min(width, typeof window !== "undefined" ? window.innerWidth - 24 : width), boxShadow: "0 8px 24px rgba(16,24,40,.12)" }}
          className="fixed z-50 bg-white border border-slate-200 rounded-xl p-4 text-left normal-case tracking-normal font-normal text-xs text-slate-600 leading-relaxed whitespace-normal"
          onClick={(e) => e.stopPropagation()}
        >
          {title && <p className="text-xs font-semibold text-ink mb-1.5">{title}</p>}
          {children}
        </div>
      )}
    </>
  );
}

function Metric({ label, value, sub, info }: { label: string; value: string; sub: string; info: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex min-w-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:text-xs">
        <span className="min-w-0 break-words leading-snug">{label}</span>
        <InfoPopover title={label} ariaLabel={`Vad betyder ${label.toLowerCase()}?`}>
          {info}
        </InfoPopover>
      </div>
      <p className="text-[28px] sm:text-3xl font-bold text-ink leading-none tabular-nums">{value}</p>
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
    <section className="bg-white rounded-xl p-6 sm:p-8" style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04)", border: "1px solid #D9E0E6" }}>
      <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-1">Alternativt scenario</p>
      <p className="text-lg font-semibold text-ink mb-6">Nyckeltal med jämförbara alternativ</p>

      <div className="mb-6">
        <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-3">Fondinnehav</p>
        <div className="space-y-0">
          {suggested.funds.map((f, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 gap-2">
              <div className="min-w-0">
                <span className="text-sm font-medium text-ink break-words">{f.name}</span>
                <span className="hidden sm:inline text-xs text-slate-400 ml-2">{f.isin}</span>
              </div>
              <span className="text-sm font-semibold text-slate-500 tabular-nums shrink-0">{f.weight.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-3">Jämförelse</p>
        <div className="overflow-hidden rounded-[10px] border border-slate-100">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] sm:text-xs font-semibold tracking-[0.06em] uppercase text-slate-400">
                <th className="text-left py-2.5 px-3 sm:px-4 font-semibold">Nyckeltal</th>
                <th className="text-right py-2.5 px-2 sm:px-4 font-semibold">Nuvarande</th>
                <th className="text-right py-2.5 px-2 sm:px-4 font-semibold">Scenario</th>
                <th className="text-right py-2.5 px-3 sm:px-4 font-semibold">Förändring</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const d = delta(row.suggestedVal, row.currentVal, row.lowerIsBetter);
                return (
                  <tr key={row.label} className="border-t border-slate-100">
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-slate-600">{row.label}</td>
                    <td className="text-right py-2.5 sm:py-3 px-2 sm:px-4 text-slate-400 tabular-nums">{fmt(row.currentVal)}</td>
                    <td className="text-right py-2.5 sm:py-3 px-2 sm:px-4 font-semibold text-ink tabular-nums">{fmt(row.suggestedVal)}</td>
                    <td className="text-right py-2.5 sm:py-3 px-3 sm:px-4 font-semibold tabular-nums">
                      {d ? (
                        <span className={d.better ? "text-pos" : "text-neg"}>
                          {d.diff > 0 ? "+" : "−"}{Math.abs(d.diff).toFixed(2)}%
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
            <p className="text-sm font-semibold text-ink">Beräknad effekt per år</p>
            <p className="text-xs text-slate-400 text-right">
              {assumed ? "vid 100 000 kr investerat" : `vid ${pv.toLocaleString("sv-SE")} kr investerat`}
            </p>
          </div>
          <div className="space-y-3">
            {feeSavingsKr !== null && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">Avgiftsbesparing</p>
                  <p className="text-xs text-slate-400">Beräknad utifrån redovisad avgift</p>
                </div>
                <p className={`text-base font-bold tabular-nums ${feeSavingsKr >= 0 ? "text-pos" : "text-red-500"}`}>
                  {`${feeSavingsKr >= 0 ? "+" : ""}${Math.round(feeSavingsKr).toLocaleString("sv-SE")} kr`}
                </p>
              </div>
            )}
            {returnGainKr !== null && (
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <div>
                  <p className="text-sm font-medium text-ink">Historisk avkastningsskillnad</p>
                  <p className="text-xs text-slate-400">Baserat på 3-årsavkastning, annualiserad</p>
                </div>
                <p className={`text-base font-bold tabular-nums ${returnGainKr >= 0 ? "text-pos" : "text-red-500"}`}>
                  {`${returnGainKr >= 0 ? "+" : ""}${Math.round(returnGainKr).toLocaleString("sv-SE")} kr`}
                </p>
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-400 leading-snug border-t border-slate-200 pt-3">
            Avgiftsbesparing är en beräkning utifrån redovisade avgifter. Kontrollera alltid aktuella villkor hos fondbolag eller depåplattform. Historisk avkastning är ingen garanti för framtida resultat — avkastningssiffran ska ses som referens, inte som en prognos.
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
    <section className="bg-white rounded-xl p-6 sm:p-8" style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04)", border: "1px solid #D9E0E6" }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-[10px] bg-green-100 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-pos" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-0.5">Analys</p>
          <p className="text-lg font-semibold text-ink">Inga bättre fondalternativ hittades</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-5">
        <div className="flex items-start justify-between gap-2 mb-4">
          <p className="text-sm font-semibold text-ink">Uppskattad avkastning per år</p>
          <p className="text-xs text-slate-400 text-right">
            {assumed ? "vid 100 000 kr investerat" : `vid ${pv.toLocaleString("sv-SE")} kr investerat`}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex sm:block items-center justify-between sm:justify-start">
            <p className="text-xs text-slate-400 sm:mb-1">Avkastning (3 år, ann.)</p>
            <p className={`text-sm sm:text-base font-bold tabular-nums ${returnKr !== null ? returnKr >= 0 ? "text-pos" : "text-red-500" : "text-slate-400"}`}>
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
            <p className={`text-base sm:text-xl font-bold tabular-nums ${netKr !== null ? netKr >= 0 ? "text-pos" : "text-red-500" : "text-slate-400"}`}>
              {netKr !== null ? `${netKr >= 0 ? "+" : ""}${Math.round(netKr).toLocaleString("sv-SE")} kr` : "–"}
            </p>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-3">Baserat på 3-årsavkastning (annualiserad), exklusive avgifter. Historisk avkastning är ingen garanti för framtida resultat.</p>
      </div>
    </section>
  );
}
