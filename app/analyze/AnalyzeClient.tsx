"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PortfolioAnalysis, SuggestedMetrics, SwapSuggestion } from "@/lib/analysis";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, ChevronDown, FileUp, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react"
import type { SavedPortfolio } from "@/lib/portfolio"
import { Button } from "@/components/ui/button"
import DonutChart from "@/components/ui/DonutChart"
import { CHART_PALETTE } from "@/lib/chart-palette"
import { AllocationRow, CardTitle, Divider, KeyValueRow, Label, MetricGrid, ShareBar, Stat, StatusDot } from "@/components/ui/primitives"
import { Disclosure } from "@/components/ui/Disclosure"
import DataFreshness from "@/components/ui/DataFreshness"
import { FileDropzone } from "@/components/ui/FileDropzone"
import { ResponsiveDrawer } from "@/components/ui/ResponsiveDrawer"
import { computePortfolioScore } from "@/lib/portfolio-score"
import { useMobileBottomOverlay } from "@/lib/mobile-bottom-overlay"
import { BEFORE_LOGIN_EVENT, prepareLoginResume, saveResume, takeResumeData } from "@/lib/resume-session"
import { track } from "@vercel/analytics"
import {
  ACCEPT_ATTRIBUTE,
  ImportError,
  MAX_HOLDINGS,
  parseHoldingsFile,
  toWeights,
  type ParsedHolding,
} from "@/lib/portfolio-import"

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
    <div className="rounded-md border border-slate-200 overflow-hidden">

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
                className="flex items-center gap-3 px-4 py-3 rounded-md border border-slate-200 bg-white hover:border-accent hover:bg-slate-50 transition-all text-left group"
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
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-slate-200 bg-white hover:border-accent hover:bg-slate-50 transition-all text-left group"
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
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-slate-200 bg-white hover:border-accent hover:bg-slate-50 transition-all text-left group"
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
                className="flex items-center gap-3 px-4 py-3 rounded-md border border-slate-200 bg-white hover:border-accent hover:bg-slate-50 transition-all text-left group"
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
                className="flex flex-col gap-0.5 px-4 py-3 rounded-md border border-slate-200 bg-white hover:border-accent hover:bg-slate-50 transition-all text-left group"
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
                className="flex items-center gap-3 px-4 py-3 rounded-md border border-slate-200 bg-white hover:border-accent hover:bg-slate-50 transition-all text-left group"
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
      <div className="flex min-w-0 items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{name}</span>
          <span className="mt-0.5 block truncate font-mono text-[10px] text-ink-3">{isin}</span>
        </span>
        <button type="button" onClick={onClear} aria-label="Ta bort vald fond" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-neg-soft hover:text-neg">
          <X className="h-4 w-4" />
        </button>
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
  selectedFunds,
  onAdd,
  onRemove,
  onClose,
}: {
  custodian: string;
  selectedFunds: FundSuggestion[];
  onAdd: (isin: string, name: string) => void;
  onRemove: (isin: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<FundSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [showSelected, setShowSelected] = useState(false);
  const [recent] = useState<FundSuggestion[]>(() => readRecentFunds());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqSeq = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleChange(q: string) {
    setQuery(q);
    setShowSelected(false);
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
  const selectedIsins = selectedFunds.map((fund) => fund.isin);
  const count = selectedFunds.length;

  return (
    <ResponsiveDrawer
      open
      onClose={onClose}
      title="Lägg till fonder"
      description="Sök och välj flera fonder utan att lämna portföljen."
      initialFocusRef={inputRef}
      className="sm:max-w-2xl"
      footer={
        <div className="flex gap-2">
          {count > 0 && (
            <button
              type="button"
              onClick={() => setShowSelected((visible) => !visible)}
              aria-expanded={showSelected}
              className="min-w-0 flex-1 rounded-md border border-line-strong bg-white px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-section"
            >
              {count} {count === 1 ? "vald fond" : "valda fonder"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-w-0 flex-1 rounded-md bg-accent px-4 py-3 font-semibold text-white transition-colors hover:bg-accent-hover active:bg-accent-press"
          >
            Klar
          </button>
        </div>
      }
    >
      <div className="relative flex min-h-[62dvh] flex-col">
        {/* Search */}
        <div className="border-b border-line bg-white px-5 py-4 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
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
              className="w-full rounded-md border border-line-strong bg-section/35 py-3.5 pl-11 pr-10 text-base text-ink placeholder:text-ink-3 focus:border-accent focus:bg-white focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => handleChange("")}
                aria-label="Rensa sökning"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-3 hover:bg-section hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
          {showRecent && recent.length > 0 && (
            <p className="label-meta px-3 pb-2 pt-1">
              Senast använda
            </p>
          )}
          {showRecent && recent.length === 0 && (
            <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-16 text-center">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-section text-ink-3">
                <Search className="h-4 w-4" />
              </span>
              <p className="text-sm leading-relaxed text-ink-3">
              Sök på fondnamn eller ISIN för att lägga till fonder i din portfölj.
              </p>
            </div>
          )}
          {!showRecent && loading && list.length === 0 && (
            <div className="flex items-center justify-center gap-2 px-3 py-12 text-sm text-ink-3">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
              Söker…
            </div>
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
                      "flex w-full items-center gap-3 rounded-md border px-3.5 py-3 text-left transition-colors",
                      i > 0 && "mt-2",
                      isSelected
                        ? "border-accent/25 bg-blue-50"
                        : "border-transparent hover:border-line hover:bg-section/60 active:bg-section"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm leading-none",
                        isSelected ? "border-accent bg-accent text-white" : "border-line-strong bg-white text-ink-3"
                      )}
                      aria-hidden="true"
                    >
                      {isSelected ? <Check className="h-3.5 w-3.5" /> : "+"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{f.name}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-ink-3">{f.isin}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* On-demand overlay: the search results keep their full height. */}
        {showSelected && selectedFunds.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 z-20 max-h-[70%] overflow-y-auto border-t border-line-strong bg-white shadow-[0_-12px_32px_rgba(20,20,30,.12)]">
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-white px-5 py-3 sm:px-6">
              <div>
                <p className="text-sm font-semibold text-ink">Valda fonder</p>
                <p className="mt-0.5 text-xs text-ink-3">{count} {count === 1 ? "fond" : "fonder"}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSelected(false)}
                aria-label="Stäng listan med valda fonder"
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-section hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="divide-y divide-line px-5 sm:px-6">
              {selectedFunds.map((fund) => (
                <li key={fund.isin} className="flex min-w-0 items-center gap-3 py-3">
                  <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{fund.name}</span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] text-ink-3">{fund.isin}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(fund.isin)}
                    aria-label={`Ta bort ${fund.name}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-neg-soft hover:text-neg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </ResponsiveDrawer>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const SESSION_KEY = "fondanalys_state";

type AnalyzeSnapshot = { custodian: string | null; entries: Entry[]; analysis: PortfolioAnalysis | null };

function loadSession(): AnalyzeSnapshot | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AnalyzeSnapshot;
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
  // ISIN för alternativ som lagts in i portföljen men ännu inte analyserats om.
  const [appliedSwaps, setAppliedSwaps] = useState<Set<string>>(new Set());
  const [inputCollapsed, setInputCollapsed] = useState(false);

  // Input method: how the user wants to populate their portfolio
  const [inputMethod, setInputMethod] = useState<"ai" | "manual" | null>(null);

  // Mobile full-screen fund search sheet
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);

  // Filimport (CSV / Excel)
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<
    { matched: number; unmatched: string[]; skipped: number; truncated: number } | null
  >(null);
  const [importError, setImportError] = useState<string | null>(null);
  // Namn på fonder importen inte kunde matcha — visas som popup efter importen
  const [unmatchedNotice, setUnmatchedNotice] = useState<string[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import wizard state
  type ImportWizardState = { open: boolean; file: File | null };
  const [importWizard, setImportWizard] = useState<ImportWizardState>({ open: false, file: null });

  // Portfolio saving state
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [savingName, setSavingName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedPortfolios, setSavedPortfolios] = useState<SavedPortfolio[]>([]);
  const [savedPortfoliosLoading, setSavedPortfoliosLoading] = useState(false);
  // Portföljbevakning: förifylls med användarens befintliga val i stället för
  // ett tyst ja, och skickas med när portföljen sparas.
  // Opt-in: rutan ska vara omarkerad tills användaren aktivt kryssar i den.
  // En förvald kryssruta är inget giltigt samtycke (GDPR art. 4.11, MFL 19 §).
  const [watchAlerts, setWatchAlerts] = useState(false);
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
      // Utan session går portföljen inte att hämta. Att falla tillbaka på ett
      // tomt formulär ser ut som att portföljen försvunnit — skicka till
      // inloggningen och tillbaka hit i stället. Mejlen länkar hit, och de
      // öppnas ofta i en webbläsare där sessionen saknas.
      let sentToLogin = false;
      fetch(`/api/portfolios/${portfolioParam}`)
        .then((r) => {
          if (r.status === 401) {
            sentToLogin = true;
            const target = `/analyze?portfolio=${encodeURIComponent(portfolioParam)}`;
            router.replace(`/login?next=${encodeURIComponent(target)}`);
            return null;
          }
          return r.ok ? r.json() : null;
        })
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
          if (!sentToLogin) router.replace("/analyze");
        })
        .catch(() => { if (!sentToLogin) router.replace("/analyze"); })
        .finally(() => { if (!sentToLogin) setPortfolioLoading(false); });
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

    // Efter inloggning: sessionStorage finns bara kvar om vi är i samma flik.
    // En magisk länk öppnas ofta i en ny flik — då ligger arbetet i resume-posten.
    const saved = loadSession() ?? takeResumeData<AnalyzeSnapshot>("/analyze");
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
        fetch("/api/notification-preferences")
          .then((r) => r.ok ? r.json() : null)
          .then((p) => setWatchAlerts(p?.email_score_alerts ?? false))
          .catch(() => {});
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
      const snapshot: AnalyzeSnapshot = { custodian, entries, analysis };
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
      } catch { /* ignore */ }
      saveResume("/analyze", snapshot);
    }

    window.addEventListener(BEFORE_LOGIN_EVENT, saveBeforeLogin);
    return () => window.removeEventListener(BEFORE_LOGIN_EVENT, saveBeforeLogin);
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
    // En uttryckligen angiven nolla är fortfarande en ofördelad fond.
    // Tidigare räknades strängen "0" som en giltig vikt och följde därför
    // med in i alternativscenariot som en grå 0,0 %-post.
    const unweighted = withIsins.filter(
      (e) => !e.weight.trim() || (parseFloat(e.weight) || 0) <= 0
    );
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
        if (!e.isin.trim() || (e.weight.trim() && (parseFloat(e.weight) || 0) > 0)) return e;
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

  // ── Filimport (CSV / Excel) ───────────────────────────────────────────────

  /** Slår upp ett innehav i fondregistret — ISIN först, fondnamn som fallback. */
  async function resolveHolding(h: ParsedHolding): Promise<{ isin: string; name: string } | null> {
    async function search(q: string): Promise<{ isin: string; name: string }[]> {
      const res = await fetch(`/api/funds/search?q=${encodeURIComponent(q)}&custodian=${custodian}`);
      if (!res.ok) return [];
      return res.json();
    }

    try {
      if (h.isin) {
        const byIsin = await search(h.isin);
        const exact = byIsin.find((m) => m.isin.toUpperCase() === h.isin);
        if (exact) return exact;
      }
      const byName = await search(h.name.slice(0, 40));
      const exactName = byName.find((m) => m.name.toLowerCase() === h.name.toLowerCase());
      return exactName ?? byName[0] ?? null;
    } catch {
      return null;
    }
  }

  async function handleFileImport(file: File): Promise<Entry[] | null> {
    setImporting(true);
    setImportResult(null);
    setImportError(null);
    try {
      const parsed = await parseHoldingsFile(file);
      const weights = toWeights(parsed.holdings);

      const results: Entry[] = await Promise.all(
        parsed.holdings.map(async (h, i) => {
          const match = await resolveHolding(h);
          return match
            ? { isin: match.isin, name: match.name, weight: String(weights[i]) }
            : { isin: "", name: h.name, weight: String(weights[i]) };
        })
      );

      const unmatched = results.filter((r) => !r.isin).map((r) => r.name);
      setEntries(results);
      setInputMode("weight");
      setImportResult({
        matched: results.length - unmatched.length,
        unmatched,
        skipped: parsed.skipped.length,
        truncated: parsed.truncated,
      });
      if (unmatched.length > 0) setUnmatchedNotice(unmatched);
      return results;
    } catch (err) {
      setImportError(
        err instanceof ImportError
          ? err.code === "no-columns"
            ? `${err.message} Filen måste innehålla en kolumn med fondens namn och en med marknadsvärde.${err.headers?.length ? ` Hittade: ${err.headers.join(", ")}.` : ""}`
            : err.message
          : "Kunde inte läsa filen. Kontrollera att det är en CSV- eller Excel-export från din depå."
      );
      return null;
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function addRow() { setEntries((p) => [...p, { isin: "", name: "", weight: "", amount: "" }]); }
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
    setAppliedSwaps(new Set());

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
        const hasUnweighted = workingEntries.some(
          (e) => e.isin.trim() && (!e.weight.trim() || (parseFloat(e.weight) || 0) <= 0)
        );
        if (Math.abs(currentTotal - 100) > 0.1 || hasUnweighted) {
          workingEntries = distributeWeights(workingEntries);
        }
      }
    }

    const valid = workingEntries.filter((e) => e.isin.trim() && e.weight.trim());
    if (valid.length === 0) { setError("Lägg till minst en fond med vikt."); return; }
    track("analysis_started", {
      source: portfolioId ? "saved_portfolio" : "portfolio_analyzer",
      kind: "portfolio",
    });
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
      track("analysis_completed", {
        source: portfolioId ? "saved_portfolio" : "portfolio_analyzer",
        kind: "portfolio",
      });
      setInputCollapsed(true);
      setTimeout(() => {
        if (resultsRef.current) {
          const top = resultsRef.current.getBoundingClientRect().top + window.scrollY - 88;
          window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        }
      }, 150);

      // Auto-save if editing an existing portfolio. Spara workingEntries, inte
      // entries: vikter som räknats fram här (fördelning, belopp → procent,
      // tillämpat fondalternativ) finns ännu inte i state.
      if (portfolioId) {
        setSaveStatus("saving");
        fetch(`/api/portfolios/${portfolioId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ holdings: workingEntries, analysis: data }),
        })
          .then((r) => setSaveStatus(r.ok ? "saved" : "error"))
          .catch(() => setSaveStatus("error"));
      }
    } catch (err: unknown) {
      clearInterval(stepInterval);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  /**
   * Lägg in en grupps alternativ i portföljen i stället för dess nuvarande
   * fonder. Ändrar bara innehavslistan — analysen körs om när användaren själv
   * väljer det, så att flera byten kan göras innan portföljen räknas om.
   *
   * Åtgärden är alltid användarinitierad och rör bara portföljen här i Sharpa —
   * inga innehav hos depåinstitutet ändras. Alla fall hanteras likadant: de
   * ersatta fondernas vikt läggs på alternativet, oavsett om det redan finns i
   * portföljen eller inte.
   */
  function applySwapGroup(group: SwapSuggestion[]) {
    const suggested = group[0].suggestedFund;
    const replaced = new Set(group.map((s) => s.currentFund.isin));
    replaced.delete(suggested.isin);

    const num = (v: string | undefined) => parseFloat(v || "0") || 0;
    const freed = entries.filter((e) => replaced.has(e.isin));
    if (freed.length === 0) return;

    const weight = freed.reduce((sum, e) => sum + num(e.weight), 0);
    const amount = freed.reduce((sum, e) => sum + num(e.amount), 0);

    // De ersatta posterna faller bort och alternativet tar den förstas plats.
    // Finns alternativet redan i portföljen växer den posten i stället.
    let placed = entries.some((e) => e.isin === suggested.isin);
    const next = entries.flatMap<Entry>((e) => {
      if (e.isin === suggested.isin) {
        return [{
          ...e,
          weight: (num(e.weight) + weight).toFixed(1),
          ...(amount > 0 ? { amount: String(num(e.amount) + amount) } : {}),
        }];
      }
      if (!replaced.has(e.isin)) return [e];
      if (placed) return [];
      placed = true;
      return [{
        isin: suggested.isin,
        name: suggested.name,
        weight: weight.toFixed(1),
        ...(amount > 0 ? { amount: String(amount) } : {}),
      }];
    });

    setEntries(next);
    setAppliedSwaps((prev) => new Set(prev).add(suggested.isin));
  }

  async function handleSaveNew() {
    if (!savingName.trim() || !analysis || !custodian) return;
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: savingName.trim(),
          custodian,
          holdings: entries,
          analysis,
          emailScoreAlerts: watchAlerts,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPortfolioId(data.id);
      setSavedPortfolios((prev) => [...prev, data]);
      setShowSaveForm(false);
      setSavingName("");
      setSaveStatus("saved");
      track("portfolio_saved", { source: "portfolio_analyzer" });
    } catch {
      setSaveStatus("error");
    }
  }

  async function handleWizardComplete() {
    if (!importWizard.file) return;
    const parsed = await handleFileImport(importWizard.file);
    // Vid parsningsfel: håll guiden öppen så att felet syns
    if (!parsed) return;

    setImportWizard({ open: false, file: null });
    setInputMethod("manual");
    if (parsed.some(e => e.isin)) {
      await analyze(parsed);
    }
  }

  const totalWeight = entries.reduce((s, e) => s + (parseFloat(e.weight) || 0), 0);
  const totalAmount = entries.reduce((s, e) => s + (parseFloat(e.amount || "0") || 0), 0);
  const portfolioValue = inputMode === "amount" && totalAmount > 0 ? totalAmount : null;

  function handleLoginFromBlur() {
    track("save_cta_clicked", { source: "analysis_result", authenticated: false });
    prepareLoginResume("/analyze");
    router.push("/login?next=/analyze&skip_onboarding=1&intent=save");
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
          <div className="h-[3px] overflow-hidden bg-fill-muted">
            <div
              className="h-full bg-ink transition-all duration-200"
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
              <div className="absolute z-20 top-full left-0 mt-1 min-w-[180px] bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden">
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

      {/* Inmatningen hålls i en smal, centrerad kolumn; resultatet får hela bredden. */}
      <section className={cn("no-print space-y-6", !analysis && "mx-auto max-w-[720px]")}>
        {analysis && inputCollapsed ? (
          /* Sidhuvudsrad — titel + sekundärknapp, avdelad av en hårlinje. Inget kort. */
          <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-display text-[26px] leading-tight text-ink sm:text-[32px]">Din portfölj</h2>
              <p className="mt-1 text-sm text-ink-3">
                {entries.filter((e) => e.isin).length} fonder analyserade
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setInputCollapsed(false)}
              className="w-full sm:w-auto"
            >
              Ändra fonder
            </Button>
          </div>
        ) : (
          <>
        {/* Sidhuvud */}
        <div>
          <h2 className="font-display text-[26px] leading-tight text-ink sm:text-[32px]">Din portfölj</h2>
          <p className="mt-1 text-sm text-ink-2">Var finns dina fonder?</p>
        </div>

        {/* Depåval — tre likvärdiga linjeknappar i en grupp, ingen omslutande kortyta */}
        <div>
          <div className="grid grid-cols-1 divide-y divide-line overflow-hidden rounded-md border border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              { value: "avanza", label: "Avanza" },
              { value: "nordnet", label: "Nordnet" },
              { value: "övrigt", label: "Annat ställe" },
            ].map((c) => (
              <button
                key={c.value}
                type="button"
                aria-label={c.label}
                aria-pressed={custodian === c.value}
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
                  "flex min-h-[56px] items-center justify-center px-4 py-3 text-center text-sm transition-colors duration-150",
                  custodian === c.value
                    ? "bg-section font-medium text-ink"
                    : "bg-white text-ink-2 hover:bg-section"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-3">
            Äger du inga fonder?{" "}
            <Link href="/bygg-portfolj" className="text-accent underline decoration-line-strong underline-offset-2 transition-colors duration-150 hover:decoration-accent">
              Skapa ett portföljexempel
            </Link>
          </p>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
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
            <div className="h-px bg-line" />

            {/* Metodval — tre likvärdiga linjeknappar i en grupp */}
            <div className="space-y-4">
              <div>
                <p className="text-lg font-medium text-ink">Hur vill du lägga in innehaven?</p>
                <p className="mt-1 text-sm text-ink-3">
                  Sök själv, ladda upp en fil eller låt guiden hjälpa dig hitta fonder.
                </p>
              </div>
              <div className="grid grid-cols-1 divide-y divide-line overflow-hidden rounded-md border border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {/* Manual */}
              <button
                type="button"
                onClick={() => setInputMethod("manual")}
                className={cn(
                  "group flex min-h-[64px] items-center justify-start gap-3 px-5 py-3 text-left transition-colors duration-150",
                  inputMethod === "manual" ? "bg-section" : "bg-white hover:bg-section/60"
                )}
              >
                <span className={cn("shrink-0 transition-colors duration-150", inputMethod === "manual" ? "text-accent" : "text-ink-3")}>
                  <Search className="h-4 w-4" />
                </span>
                <span>
                  <span className={cn("block text-sm", inputMethod === "manual" ? "font-medium text-ink" : "text-ink")}>
                    Sök manuellt
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-ink-3">
                    Sök på fondnamn
                  </span>
                </span>
              </button>

              {/* Import — CSV eller Excel från Avanza, Nordnet eller annan depå */}
              <button
                type="button"
                onClick={() => { setImportResult(null); setImportError(null); setImportWizard({ open: true, file: null }); }}
                disabled={importing}
                className={cn(
                  "group flex min-h-[64px] items-center justify-start gap-3 px-5 py-3 text-left transition-colors duration-150 disabled:cursor-wait",
                  importing ? "bg-section" : "bg-white hover:bg-section/60"
                )}
              >
                <span className={cn("shrink-0 transition-colors duration-150", importing ? "text-accent" : "text-ink-3")}>
                  {importing ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-3 border-t-transparent" />
                  ) : (
                    <FileUp className="h-4 w-4" />
                  )}
                </span>
                <span>
                  <span className={cn("block text-sm", importing ? "font-medium text-ink" : "text-ink")}>
                    {importing ? "Importerar…" : "Importera fil"}
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-ink-3">
                    CSV eller Excel
                  </span>
                </span>
              </button>

              {/* AI */}
              <button
                type="button"
                onClick={() => setInputMethod("ai")}
                className={cn(
                  "group flex min-h-[64px] items-center justify-start gap-3 px-5 py-3 text-left transition-colors duration-150",
                  inputMethod === "ai" ? "bg-section" : "bg-white hover:bg-section/60"
                )}
              >
                <span className={cn("shrink-0 transition-colors duration-150", inputMethod === "ai" ? "text-accent" : "text-ink-3")}>
                  <SlidersHorizontal className="h-4 w-4" />
                </span>
                <span>
                  <span className={cn("block text-sm", inputMethod === "ai" ? "font-medium text-ink" : "text-ink")}>
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
              <p className="label-meta">Innehav</p>
              <div className="flex items-center overflow-hidden rounded-xs border border-line-strong" role="group" aria-label="Ange innehav i vikt eller belopp">
                {([["weight", "Vikt (%)"], ["amount", "Belopp (kr)"]] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setInputMode(mode)}
                    className={`whitespace-nowrap px-3 py-1.5 text-xs transition-colors duration-150 ${
                      inputMode === mode ? "bg-section font-medium text-ink" : "bg-white text-ink-3 hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {importError && (
              <p className="rounded-md border border-neg/25 bg-neg-soft px-3 py-2 text-xs text-neg">
                {importError}
              </p>
            )}

            {importResult && (
              <div className="space-y-0.5 text-xs text-slate-400">
                <p>
                  {importResult.matched} av {importResult.matched + importResult.unmatched.length} innehav matchade
                  {importResult.unmatched.length > 0 && " — sök manuellt för de resterande"}
                </p>
                {importResult.skipped > 0 && (
                  <p>{importResult.skipped} rader hoppades över — aktier, ETF:er och certifikat ingår inte i fondanalysen.</p>
                )}
                {importResult.truncated > 0 && (
                  <p>{importResult.truncated} av de minsta innehaven utelämnades — max {MAX_HOLDINGS} per analys.</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              {entries.map((entry, i) => {
                if (!entry.isin && !entry.name) return null;
                return (
                <div key={i} className="rounded-md border border-line bg-white p-3 sm:grid sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center sm:gap-4">
                  <FundSearchInput isin={entry.isin} name={entry.name} custodian={custodian} excludeIsins={entries.filter((_, idx) => idx !== i).map((e) => e.isin).filter(Boolean)} onSelect={(isin, name) => selectFund(i, isin, name)} onClear={() => clearFund(i)} />
                  <div className="mt-3 flex items-center gap-3 border-t border-line pt-3 sm:mt-0 sm:border-0 sm:pt-0">
                    <label htmlFor={`entry-value-${i}`} className="w-24 shrink-0 text-xs text-ink-3 sm:w-auto">
                      {inputMode === "weight" ? "Vikt (%)" : "Belopp (kr)"}
                    </label>
                    {inputMode === "weight" ? (
                      <input
                        id={`entry-value-${i}`}
                        type="number" inputMode="decimal" placeholder="%" min={0} max={100}
                        value={entry.weight} onChange={(e) => updateWeight(i, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRow(); } }}
                        className="min-w-0 flex-1 rounded-md border border-line-strong bg-section/30 px-3 py-2 text-right text-base text-ink focus:border-accent focus:bg-white focus:outline-none"
                      />
                    ) : (
                      <input
                        id={`entry-value-${i}`}
                        type="number" inputMode="numeric" placeholder="kr" min={0}
                        value={entry.amount ?? ""} onChange={(e) => updateAmount(i, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRow(); } }}
                        className="min-w-0 flex-1 rounded-md border border-line-strong bg-section/30 px-3 py-2 text-right text-base text-ink focus:border-accent focus:bg-white focus:outline-none"
                      />
                    )}
                  </div>
                </div>
                );
              })}
            </div>

            {/* Gemensam fondväljare: bottom drawer på mobil, dialog på desktop. */}
            {inputMethod !== "ai" && (
              <button
                type="button"
                onClick={() => setSearchSheetOpen(true)}
                className="group flex w-full items-center justify-between rounded-md border border-dashed border-line-strong bg-section/35 px-4 py-4 text-left transition-colors hover:border-ink-3 hover:bg-section"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink-3 transition-colors group-hover:text-ink">
                    <Search className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-ink">
                      {entries.some((e) => e.isin) ? "Lägg till eller ändra fonder" : "Välj fonder"}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-3">Sök på fondnamn eller ISIN</span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
              </button>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-ink-3">
                {entries.filter((entry) => entry.isin).length || "Inga"} {entries.filter((entry) => entry.isin).length === 1 ? "fond" : "fonder"}
              </span>
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

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-md p-3">{error}</p>}

            </>)}

            <button
              onClick={() => analyze()} disabled={loading || inputMethod === null}
              className="w-full bg-accent hover:bg-accent-hover active:bg-accent-press disabled:bg-blue-300 text-white font-semibold rounded-md py-3 transition-colors"
            >
              {loading ? "Analyserar…" : "Analysera portfölj"}
            </button>

            {searchSheetOpen && (
              <FundSearchSheet
                custodian={custodian}
                selectedFunds={entries
                  .filter((entry) => entry.isin)
                  .map((entry) => ({ isin: entry.isin, name: entry.name }))}
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
      {analysis && (
        <AnalysisResult
          analysis={analysis}
          portfolioValue={portfolioValue}
          user={user}
          onLoginClick={handleLoginFromBlur}
          onApplySwap={applySwapGroup}
          appliedSwaps={appliedSwaps}
        />
      )}

      {analysis && user && !portfolioId && (
        <section className="no-print bg-white rounded-md shadow-sm border border-slate-200 p-4 sm:p-6">
          {!showSaveForm ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Spara och bevaka portföljen?</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kom åt den från Mitt konto — och få veta om betyget försämras.
                </p>
              </div>
              <button
                onClick={() => {
                  track("save_cta_clicked", { source: "analysis_result", authenticated: true });
                  setShowSaveForm(true);
                }}
                className="shrink-0 bg-accent hover:bg-accent-hover active:bg-accent-press text-white text-sm font-semibold px-4 py-2.5 rounded-md transition-colors"
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

              {/* Bevakning — användaren tar aktivt ställning innan portföljen sparas */}
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={watchAlerts}
                    onChange={(e) => setWatchAlerts(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#1F3A5F]"
                  />
                  <span className="text-xs leading-relaxed text-slate-600">
                    <span className="font-medium text-slate-900">Mejla mig efter portföljkontroller.</span>{" "}
                    Vi granskar alla dina sparade portföljer när fondinformationen uppdateras. Om
                    någon sjunker minst 0,5 poäng berättar vi vad som förändrats; annars bekräftar
                    vi att kontrollen är klar. Du kan ändra detta när som helst under Mitt konto.
                  </span>
                </label>
              </div>

              {saveStatus === "error" && <p className="text-xs text-red-600">Något gick fel. Försök igen.</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNew}
                  disabled={!savingName.trim() || saveStatus === "saving"}
                  className="bg-accent hover:bg-accent-hover active:bg-accent-press disabled:bg-blue-300 text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors"
                >
                  {saveStatus === "saving" ? "Sparar…" : "Spara"}
                </button>
                <button
                  onClick={() => { setShowSaveForm(false); setSavingName(""); }}
                  className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-md border border-slate-200 transition-colors"
                >
                  Avbryt
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {analysis && user && portfolioId && saveStatus === "saved" && (
        <div className="no-print text-center">
          <p className="text-sm text-green-600 font-medium">Portföljen sparades ✓</p>
          <p className="mt-1 text-xs text-slate-500">
            {watchAlerts
              ? "Bevakning är på — vi håller koll på portföljen och mejlar dig om betyget försämras tydligt."
              : "Bevakning är av — vi håller fortfarande koll, men mejlar dig inte. Du kan slå på notiser under Mitt konto."}
          </p>
        </div>
      )}

      {analysis && (
        <p className="no-print text-[11px] leading-relaxed text-slate-400">
          Analysen är automatiskt genererad utifrån historiska nyckeltal och generella kriterier och
          utgör varken investeringsrådgivning eller en personlig rekommendation. Den tar inte hänsyn
          till din ekonomiska situation. Sharpa står inte under Finansinspektionens tillsyn och har
          inget tillstånd att bedriva investeringsrådgivning. Historisk avkastning är ingen garanti
          för framtida resultat; fondandelar kan både öka och minska i värde och du kan förlora hela
          eller delar av det investerade kapitalet. Läs fondens faktablad (KID) hos fondbolaget eller
          din depåplattform innan du fattar beslut — investeringsbeslut fattas på egen risk.
        </p>
      )}

      {analysis && <DataFreshness className="no-print pt-2" />}
    </div></div>

    {/* Import wizard modal */}
    <ResponsiveDrawer
      open={importWizard.open}
      onClose={() => setImportWizard({ open: false, file: null })}
      title="Importera portfölj"
      description="Ladda upp en export från din depå. Vi matchar fonderna och räknar ut deras vikter automatiskt."
      footer={
        <button
          disabled={!importWizard.file || importing}
          onClick={handleWizardComplete}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-accent py-3 font-semibold text-white transition-colors hover:bg-accent-hover active:bg-accent-press disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {importing ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Importerar…
            </>
          ) : "Importera och analysera"}
        </button>
      }
    >
          <div className="space-y-5 p-5 sm:p-6">
            <FileDropzone
              accept={ACCEPT_ATTRIBUTE}
              file={importWizard.file}
              disabled={importing}
              onFile={(file) => {
                setImportError(null);
                setImportWizard((current) => ({ ...current, file }));
              }}
            />
            {importError && (
              <p className="rounded-md border border-neg/25 bg-neg-soft px-3 py-2 text-xs text-neg">
                {importError}
              </p>
            )}

            <p className="text-xs leading-relaxed text-ink-3">
              Filen behöver en rubrikrad med <span className="font-medium text-ink-2">Namn</span> och{" "}
              <span className="font-medium text-ink-2">Marknadsvärde</span>. Finns även{" "}
              <span className="font-medium text-ink-2">ISIN</span> och{" "}
              <span className="font-medium text-ink-2">Typ</span> blir matchningen exakt och aktier,
              ETF:er och certifikat sorteras bort automatiskt.
            </p>
          </div>
    </ResponsiveDrawer>

    {/* Popup: fonder som importen inte kunde matcha */}
    {unmatchedNotice && (
      <div
        className="fixed inset-0 z-[75] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
        onClick={(e) => { if (e.target === e.currentTarget) setUnmatchedNotice(null); }}
      >
        <div className="bg-white rounded-md shadow-xl w-full max-w-md overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              {unmatchedNotice.length === 1 ? "En fond kunde inte läsas in" : `${unmatchedNotice.length} fonder kunde inte läsas in`}
            </h2>
            <button
              onClick={() => setUnmatchedNotice(null)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-500">
              Vi hittade dem inte i fondlistan för {custodian === "nordnet" ? "Nordnet" : custodian === "avanza" ? "Avanza" : "din depå"}.
              Sök upp dem manuellt i listan — vikterna ligger redan på plats.
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              {unmatchedNotice.map((n, i) => <li key={`${n}-${i}`}>{n}</li>)}
            </ul>
            <button
              onClick={() => setUnmatchedNotice(null)}
              className="w-full bg-accent hover:bg-accent-hover active:bg-accent-press text-white font-semibold py-3 rounded-md transition-colors text-sm"
            >
              Okej
            </button>
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

function AnalysisResult({
  analysis,
  portfolioValue,
  user,
  onLoginClick,
  onApplySwap,
  appliedSwaps,
}: {
  analysis: PortfolioAnalysis;
  portfolioValue: number | null;
  user: User | null | undefined;
  onLoginClick: () => void;
  onApplySwap: (group: SwapSuggestion[]) => void;
  appliedSwaps: Set<string>;
}) {
  const showBlur = !user;
  const score = computePortfolioScore(analysis).score;
  const [showAllSwaps, setShowAllSwaps] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const pv = portfolioValue ?? 100_000;
  const assumed = portfolioValue === null;

  let potentialGainKr: number | null = null;
  if (analysis.suggestedMetrics) {
    const feeDifferenceKr = analysis.avgCost !== null && analysis.suggestedMetrics.avgCost !== null
      ? (analysis.avgCost - analysis.suggestedMetrics.avgCost) / 100 * pv : 0;
    const historicalReturnDifferenceKr = analysis.weightedReturn3yr !== null && analysis.suggestedMetrics.weightedReturn3yr !== null
      ? (ann3yr(analysis.suggestedMetrics.weightedReturn3yr) - ann3yr(analysis.weightedReturn3yr)) / 100 * pv : 0;
    if (feeDifferenceKr + historicalReturnDifferenceKr > 100) {
      potentialGainKr = feeDifferenceKr + historicalReturnDifferenceKr;
    }
  }

  // Nollposter skulle rita osynliga segment och skräpa ned legenden
  const allocationSlices = (analysis.detailedBreakdown ?? [])
    .filter(c => c.weight > 0)
    .map(c => ({ label: c.label, weight: c.weight }));
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

  const scoreVerdict = score >= 8
    ? "En stark helhet"
    : score >= 6
      ? "En bra grund med några förbättringsmöjligheter"
      : score >= 4
        ? "Flera delar kan förbättras"
        : "Portföljen har tydliga svagheter i jämförelsen";

  const diversityCount = diversitySource?.filter(c => c.weight > 5).length ?? null;
  const quickAssessments: Array<{
    label: string;
    value: string;
    explanation: string;
    tone: "pos" | "warn" | "neutral";
  }> = [
    analysis.avgCost === null
      ? { label: "Avgift", value: "Saknar data", explanation: "Vi kan inte bedöma portföljens avgiftsnivå.", tone: "neutral" }
      : analysis.avgCost < 0.3
        ? { label: "Avgift", value: "Låg", explanation: `${analysis.avgCost.toFixed(2).replace(".", ",")} % per år.`, tone: "pos" }
        : analysis.avgCost <= 0.6
          ? { label: "Avgift", value: "Rimlig", explanation: `${analysis.avgCost.toFixed(2).replace(".", ",")} % per år.`, tone: "neutral" }
          : { label: "Avgift", value: "Hög", explanation: `${analysis.avgCost.toFixed(2).replace(".", ",")} % per år.`, tone: "warn" },
    analysis.weightedSharpe === null
      ? { label: "Avkastning i förhållande till risk", value: "Saknar data", explanation: "Underlaget räcker inte för en bedömning.", tone: "neutral" }
      : analysis.weightedSharpe > 0.7
        ? { label: "Avkastning i förhållande till risk", value: "Stark", explanation: "Portföljen har historiskt fått bra betalt för risken.", tone: "pos" }
        : analysis.weightedSharpe >= 0.3
          ? { label: "Avkastning i förhållande till risk", value: "Okej", explanation: "Historiken är varken tydligt stark eller svag.", tone: "neutral" }
          : { label: "Avkastning i förhållande till risk", value: "Svag", explanation: "Portföljen har historiskt fått svagt betalt för risken.", tone: "warn" },
    diversityCount === null
      ? { label: "Riskspridning", value: "Saknar data", explanation: "Vi kan inte bedöma spridningen mellan kategorier.", tone: "neutral" }
      : diversityCount >= 3
        ? { label: "Riskspridning", value: "Bra", explanation: "Portföljen är spridd över flera fondkategorier.", tone: "pos" }
        : { label: "Riskspridning", value: "Begränsad", explanation: "En större del är samlad i få fondkategorier.", tone: "warn" },
  ];
  const mainStrength = quickAssessments.find(item => item.tone === "pos");
  const mainConcern = quickAssessments.find(item => item.tone === "warn");
  const simpleSummary = mainConcern
    ? `${mainStrength ? `${mainStrength.label} är en tydlig styrka. ` : ""}${mainConcern.label} är det viktigaste förbättringsområdet i den här jämförelsen.`
    : "Inget av de tre viktigaste områdena sticker ut som tydligt svagt i jämförelsen.";

  return (
    <div className="space-y-8 animate-fade sm:space-y-10">

      {/* Print-only header + score card */}
      <div className="print-only hidden">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
          <p className="text-base font-bold text-slate-900">Sharpa</p>
          <p className="text-sm text-slate-400">{new Date().toLocaleDateString("sv-SE")}</p>
        </div>

        <div className="border border-slate-200 rounded-md p-5 mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-slate-400 mb-1">Portföljbetyg</p>
              <div className="flex items-baseline gap-1">
                <span className="figure text-5xl text-ink">
                  {score.toFixed(1).replace(".", ",")}
                </span>
                <span className="text-xl text-slate-300 font-light">/10</span>
              </div>
            </div>
            {potentialGainKr !== null && (
              <div className="text-right">
                <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-slate-400 mb-1">Historisk jämförelse</p>
                <p className="figure text-2xl text-pos">+{Math.round(potentialGainKr).toLocaleString("sv-SE")} kr</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  per år{assumed ? " (vid 100 000 kr)" : ""}, baserat på de senaste 3 åren
                </p>
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
                    <p key={s} className="mb-1 text-sm text-ink">{s}</p>
                  ))}
                </div>
              )}
              {warnings.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">Förbättringsområden</p>
                  {warnings.map(w => (
                    <p key={w} className="mb-1 text-sm text-ink">{w}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Första nivån svarar bara på: hur ser helheten ut och vad betyder det? */}
      <div id="analysis-overview" className="no-print animate-fade">
      <section className="overflow-hidden rounded-md border border-line bg-white">
        <div className="px-5 py-7 sm:px-8 sm:py-9">
          <Label className="mb-3">Ditt resultat</Label>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="figure text-[48px] leading-none text-ink sm:text-[58px]">
                  {score.toFixed(1).replace(".", ",")}
                </span>
                <span className="figure text-xl text-ink-3">/10</span>
              </div>
              <h2 className="mt-4 font-display text-[22px] leading-tight text-ink sm:text-[26px]">
                {scoreVerdict}
              </h2>
            </div>
            <p className="max-w-xl text-[15px] leading-[1.7] text-ink-2 sm:max-w-[58%]">
              {simpleSummary}
            </p>
          </div>
        </div>

        <Divider />

        <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="px-5 py-6 sm:px-8 sm:py-7">
            <Label className="mb-4">Styrkor</Label>
            {strengths.length > 0 ? (
              <ul className="space-y-2.5">
                {strengths.map(strength => (
                  <li key={strength} className="flex gap-2.5 text-[15px] leading-snug text-ink">
                    <StatusDot tone="pos" /> {strength}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Inga tydliga styrkor utmärker sig.</p>
            )}
          </div>
          <div className="px-5 py-6 sm:px-8 sm:py-7">
            <Label className="mb-4">Förbättringsområden</Label>
            {warnings.length > 0 ? (
              <ul className="space-y-2.5">
                {warnings.map(warning => (
                  <li key={warning} className="flex gap-2.5 text-[15px] leading-snug text-ink">
                    <StatusDot tone="warn" /> {warning}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Inget som sticker ut som svagt.</p>
            )}
          </div>
        </div>

        <Divider />

        <div className="px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => setShowDetails(value => !value)}
            aria-expanded={showDetails}
            aria-controls="full-analysis-details"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xs border border-line-strong bg-white px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:border-accent hover:bg-info"
          >
            {showDetails ? "Dölj detaljerad analys" : "Visa detaljerad analys"}
            <ChevronDown
              aria-hidden="true"
              className={cn("h-4 w-4 transition-transform duration-200", showDetails && "rotate-180")}
            />
          </button>
        </div>

      </section>
      </div>

      {/* Nyckeltal + fördelning — linjerat rutnät, inga inre kort */}
      {showDetails && <div id="full-analysis-details" className="scroll-mt-24 animate-fade">
      <CardTitle title="Nyckeltal" />
      <section className="overflow-hidden rounded-md border border-line bg-white">
        <MetricGrid>
          <Metric label="Snittavgift" value={analysis.avgCost !== null ? `${analysis.avgCost.toFixed(2).replace(".", ",")} %` : "–"} sub="per år" info="Den genomsnittliga årliga avgiften viktat efter din fördelning." />
          <Metric label="Avkastning 1 år" value={analysis.weightedReturn1yr !== null ? `${analysis.weightedReturn1yr.toFixed(1).replace(".", ",")} %` : "–"} sub="senaste 12 mån" info="Portföljens viktade avkastning de senaste 12 månaderna." />
          <Metric label="Avkastning 3 år" value={analysis.weightedReturn3yr !== null ? `${analysis.weightedReturn3yr.toFixed(1).replace(".", ",")} %` : "–"} sub="totalt" info="Portföljens viktade totalavkastning de senaste 3 åren." />
          <Metric label="Sharpe 3 år" value={analysis.weightedSharpe !== null ? analysis.weightedSharpe.toFixed(2).replace(".", ",") : "–"} sub="riskjusterad" info="Avkastning i förhållande till risk. Högre är bättre." />
        </MetricGrid>

        <Divider />

        {/* Fördelning, Tillgångsslag och Förvaltningsstil på samma rad på desktop. */}
        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="px-5 py-6 sm:px-8 sm:py-8">
            <Label className="mb-4">Fördelning</Label>
            {/* Donut i stället för staplar — med många kategorier blev
                stapellistan tung, och ringen visar helheten på en gång. */}
            <DonutChart
              palette={CHART_PALETTE}
              legendValueColor="#1A1D21"
              slices={allocationSlices}
              centerLabel={allocationCenter ? `${allocationCenter.weight.toFixed(0)} %` : ""}
              centerSub={allocationCenter?.label ?? ""}
              size={132}
              thickness={20}
            />
            <p className="mt-4 text-xs text-ink-3">* Baseras på fondkategori, inte underliggande innehav.</p>
          </div>

          <div className="border-t border-line px-5 py-6 sm:px-8 sm:py-8 lg:border-l lg:border-t-0">
            <Label className="mb-4">Tillgångsslag</Label>
            <ShareBar items={(analysis.categoryBreakdown ?? []).filter(c => c.weight > 0)} />
          </div>

          <div className="border-t border-line px-5 py-6 sm:px-8 sm:py-8 lg:border-l lg:border-t-0">
            <Label className="mb-4">Förvaltningsstil</Label>
            <ShareBar
              items={[
                { label: "Aktivt förvaltad", weight: analysis.managementBreakdown.active },
                { label: "Indexfond", weight: analysis.managementBreakdown.passive },
                { label: "Oklassad", weight: analysis.managementBreakdown.unknown },
              ].filter(i => i.weight > 0)}
            />
          </div>
        </div>
      </section>
      <div className="flex justify-end pt-3">
        <button
          onClick={user ? () => window.print() : onLoginClick}
          className="text-xs text-ink-3 transition-colors duration-150 hover:text-ink"
        >
          {user ? "Spara som PDF" : "Logga in för att spara som PDF"}
        </button>
      </div>
      </div>}

      {showBlur && (
        <section className="no-print flex flex-col items-start justify-between gap-4 rounded-md border border-info-line bg-info px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div className="max-w-xl">
            <p className="font-semibold text-ink">Spara resultatet och hitta tillbaka</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              Logga in gratis för att spara portföljen. Du kommer tillbaka direkt efteråt.
            </p>
          </div>
          <button
            type="button"
            onClick={onLoginClick}
            className="h-11 shrink-0 rounded-xs bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-hover active:bg-accent-press"
          >
            Spara min portfölj
          </button>
        </section>
      )}

      {/* Swap suggestions + best-in-category */}
      {((analysis.swapSuggestions?.length ?? 0) > 0 ||
        (analysis.bestInCategory?.length ?? 0) > 0) && (
        <div id="foreslagna-alternativ" className={cn("scroll-mt-24", showBlur && "no-print")}>
          <CardTitle
            title="Jämförbara alternativ"
            sub="Fonder som har starkare historiska nyckeltal enligt samma generella jämförelsekriterier."
          />
          <section className={cn("relative", showBlur && "overflow-hidden rounded-md border border-line bg-white")}>
          <div className={cn(showBlur && "p-5 sm:p-8")}>

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
                      <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
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

              <div className="no-print absolute inset-0 rounded-md backdrop-blur-[8px] bg-white/50" />
              <div className="no-print absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6 space-y-3">
                <p className="text-base font-semibold text-ink leading-snug max-w-md">
                  {potentialGainKr !== null
                    ? `Logga in för att se jämförbara alternativ med +${Math.round(potentialGainKr).toLocaleString("sv-SE")} kr/år i beräknad skillnad`
                    : "Logga in för att se jämförbara fondalternativ"}
                </p>
                {potentialGainKr !== null && assumed && (
                  <p className="text-xs text-ink-3 max-w-sm">Beräknat på ett antaget sparkapital om 100 000 kr.</p>
                )}
                <p className="text-xs text-ink-3">Spara portföljen ovan för att låsa upp alternativen.</p>
              </div>
            </div>
            ) : (
              <>

            {(analysis.bestInCategory?.length ?? 0) > 0 && (() => {
              const bics = analysis.bestInCategory ?? [];
              return (
                <div className="mb-4 rounded-md border border-line bg-white px-4 py-4 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-pos">
                      {bics.length === 1 ? "Redan bäst i sin kategori" : "Redan bäst i sina kategorier"}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {bics.map((bic, i) => (
                        <li key={i} className="text-sm font-semibold leading-snug text-ink">{bic.fundName}</li>
                      ))}
                    </ul>
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
                  <div className="grid gap-3 sm:gap-4">
                    {groups.map((group, gi) => {
                      const hidden = !showAllSwaps && gi >= VISIBLE;
                      const suggested = group[0].suggestedFund;
                      const isConsolidate = group[0].consolidate;
                      const isMultiGroup = group.length >= 2;

                      // Jämförelsedata för infopanelen — sammanvägt över gruppens
                      // nuvarande fonder, som efter lika-vikt-fixen väger lika.
                      const sugCost = suggested.ongoing_cost_actual ?? suggested.ongoing_cost_estimated;
                      const totalW = group.reduce((sum, item) => sum + item.weight, 0);
                      const items = group.map(item => ({
                        normW: totalW > 0 ? item.weight / totalW : 0,
                        cost: item.currentFund.ongoing_cost_actual ?? item.currentFund.ongoing_cost_estimated,
                        r3yr: item.currentFund.return_3yr,
                        sharpe: item.currentFund.sharpe_3yr,
                      }));
                      const curCost = totalW > 0 && items.every(x => x.cost !== null)
                        ? items.reduce((sum, x) => sum + x.normW * x.cost!, 0) : null;
                      const curReturn = totalW > 0 && items.every(x => x.r3yr != null)
                        ? items.reduce((sum, x) => sum + x.normW * x.r3yr!, 0) : null;
                      const curSharpe = totalW > 0 && items.every(x => x.sharpe !== null)
                        ? items.reduce((sum, x) => sum + x.normW * x.sharpe!, 0) : null;

                      const infoPanel = (
                        <InfoPopover
                          title="Jämförelse"
                          width={340}
                          ariaLabel={`Visa nyckeltalsjämförelse med ${suggested.name}`}
                        >
                          {suggested.category && (
                            <p className="mb-2.5 text-[11px] text-ink-3">{suggested.category}</p>
                          )}
                          <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-5 gap-y-2">
                            <span />
                            <span className="label-meta text-right">Nuvarande</span>
                            <span className="label-meta text-right">Jämförbar fond</span>

                            <span className="text-xs text-ink-2">Avgift</span>
                            <span className="figure text-xs text-ink-2">{curCost !== null ? `${curCost.toFixed(2).replace(".", ",")} %` : "–"}</span>
                            <span className="figure text-xs text-accent">{sugCost !== null ? `${sugCost.toFixed(2).replace(".", ",")} %` : "–"}</span>

                            <span className="whitespace-nowrap text-xs text-ink-2">Avkastning 3 år</span>
                            <span className="figure text-xs text-ink-2">{curReturn != null ? `${curReturn.toFixed(1).replace(".", ",")} %` : "–"}</span>
                            <span className="figure text-xs text-accent">{suggested.return_3yr != null ? `${suggested.return_3yr.toFixed(1).replace(".", ",")} %` : "–"}</span>

                            <span className="text-xs text-ink-2">Sharpe</span>
                            <span className="figure text-xs text-ink-2">{curSharpe !== null ? curSharpe.toFixed(2).replace(".", ",") : "–"}</span>
                            <span className="figure text-xs text-accent">{suggested.sharpe_3yr !== null ? suggested.sharpe_3yr.toFixed(2).replace(".", ",") : "–"}</span>
                          </div>
                          {isMultiGroup && (
                            <p className="mt-2.5 text-[11px] leading-snug text-ink-3">
                              Nuvarande = sammanvägt över {group.length} fonder, som viktas lika i scenariot.
                            </p>
                          )}
                        </InfoPopover>
                      );

                      return (
                        <div
                          key={gi}
                          className={`rounded-md border border-line bg-white px-4 py-4 sm:px-5 sm:py-5${hidden ? " swap-hidden" : ""}`}
                        >
                          {isConsolidate && isMultiGroup && (
                            <p className="mb-3 text-xs text-ink-3">Jämförelsen omfattar {group.length} nuvarande fonder.</p>
                          )}
                          <div className="relative">
                            <p className="label-meta mb-3">Jämförelse {gi + 1}</p>
                            <div className="absolute right-0 top-0">{infoPanel}</div>
                            <div className="min-w-0 pr-8">
                              <p className="text-xs text-ink-3 mb-1">Nuvarande {group.length > 1 ? "fonder" : "fond"}</p>
                              {group.map((item, si) => (
                                <p
                                  key={si}
                                  className="text-sm font-semibold text-ink leading-snug break-words"
                                >
                                  {item.currentFund.name}
                                </p>
                              ))}
                            </div>
                            <div className="mt-4 min-w-0">
                              <p className="text-xs text-ink-3 mb-1">Jämförbar fond</p>
                              <p className="text-sm font-semibold text-ink leading-snug break-words">
                                {suggested.name}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-col items-start gap-3 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-end">
                            {appliedSwaps.has(suggested.isin) ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-pos">
                                <Check className="h-3.5 w-3.5" />
                                Inlagd i portföljen
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onApplySwap(group)}
                                className="rounded-xs border border-line-strong px-3 py-2 text-xs font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent"
                              >
                                Lägg in den jämförbara fonden i din portfölj
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {total > VISIBLE && (
                    <button
                      type="button"
                      onClick={() => setShowAllSwaps(v => !v)}
                      className="mt-2 w-full py-2.5 text-sm font-medium text-slate-500 hover:text-ink border border-slate-100 hover:border-slate-200 rounded-md transition-colors"
                    >
                      {showAllSwaps ? "Visa färre jämförelser" : `Visa alla ${total} jämförelser`}
                    </button>
                  )}
                </>
              );
            })()}

              </>
            )}
          </div>
          </section>
        </div>
      )}

      {showDetails && !showBlur && analysis.suggestedMetrics && (
        <SuggestedPortfolio
          current={{ avgCost: analysis.avgCost, weightedReturn1yr: analysis.weightedReturn1yr, weightedReturn3yr: analysis.weightedReturn3yr, weightedSharpe: analysis.weightedSharpe }}
          suggested={analysis.suggestedMetrics}
          portfolioValue={portfolioValue}
        />
      )}

      {showDetails && !showBlur && !analysis.suggestedMetrics && (analysis.swapSuggestions?.length ?? 0) === 0 && (
        <OptimalPortfolioProjection
          current={{ avgCost: analysis.avgCost, weightedReturn1yr: analysis.weightedReturn1yr, weightedReturn3yr: analysis.weightedReturn3yr, weightedSharpe: analysis.weightedSharpe }}
          portfolioValue={portfolioValue}
        />
      )}

      {analysis.notFound.length > 0 && (
        <section className="rounded-md border border-line bg-warn-soft p-4">
          <p className="text-sm text-amber-800">
            <span className="font-medium">Hittades inte: </span>{analysis.notFound.join(", ")}
          </p>
        </section>
      )}
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

function InfoPopover({
  title,
  ariaLabel,
  width = POPOVER_WIDTH,
  children,
}: {
  title?: string;
  ariaLabel?: string;
  width?: number;
  children: React.ReactNode;
}) {
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
        className="no-print inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors duration-150 hover:text-ink"
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
            className="max-h-[80vh] overflow-y-auto overscroll-contain rounded-t-lg bg-white px-5 pb-8 pt-4 text-left"
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
          className="fixed z-50 bg-white border border-slate-200 rounded-md p-4 text-left normal-case tracking-normal font-normal text-xs text-slate-600 leading-relaxed whitespace-normal"
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
    <Stat
      label={label}
      value={value}
      sub={sub}
      action={
        <InfoPopover title={label} ariaLabel={`Vad betyder ${label.toLowerCase()}?`}>
          {info}
        </InfoPopover>
      }
    />
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
  const netKr = (feeSavingsKr ?? 0) + (returnGainKr ?? 0);
  const hasEffect = feeSavingsKr !== null || returnGainKr !== null;

  const kr = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(Math.round(v)).toLocaleString("sv-SE")} kr`;
  const tone = (v: number) => (v >= 0 ? "pos" as const : "neg" as const);

  const rows = [
    { label: "Snittavgift", currentVal: current.avgCost, suggestedVal: suggested.avgCost, lowerIsBetter: true },
    { label: "Avkastning 1 år", currentVal: current.weightedReturn1yr, suggestedVal: suggested.weightedReturn1yr },
    { label: "Avkastning 3 år", currentVal: current.weightedReturn3yr, suggestedVal: suggested.weightedReturn3yr },
    { label: "Sharpe 3 år", currentVal: current.weightedSharpe, suggestedVal: suggested.weightedSharpe },
  ];

  const allocation = [...suggested.funds].sort((a, b) => b.weight - a.weight);

  const comparison = (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className="label-meta py-2 pr-3 text-left font-medium">Nyckeltal</th>
            <th className="label-meta py-2 px-3 text-right font-medium">Nuvarande</th>
            <th className="label-meta py-2 px-3 text-right font-medium">Scenario</th>
            <th className="label-meta py-2 pl-3 text-right font-medium">
              <span className="sm:hidden">Δ</span>
              <span className="hidden sm:inline">Ändring</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const d = delta(row.suggestedVal, row.currentVal, row.lowerIsBetter);
            return (
              <tr key={row.label} className="border-b border-line last:border-0">
                <td className="py-3 pr-3 text-ink-2">{row.label}</td>
                <td className="figure py-3 px-3 text-right text-xs text-ink-3 sm:text-sm">{fmt(row.currentVal)}</td>
                <td className="figure py-3 px-3 text-right text-xs text-ink sm:text-sm">{fmt(row.suggestedVal)}</td>
                <td className="figure py-3 pl-3 text-right text-xs sm:text-sm">
                  {d ? (
                    <span className={d.better ? "text-pos" : "text-neg"}>
                      {d.diff >= 0 ? "+" : "−"}{fmt(Math.abs(d.diff))}
                    </span>
                  ) : <span className="text-ink-3">–</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <CardTitle
        title="Alternativt scenario"
        sub="Nyckeltal om innehaven byttes mot de jämförbara alternativen."
      />

      <section className="overflow-hidden rounded-md border border-line bg-white">
        <div className="p-5 sm:p-8">
      {/* Effekten först, detaljerna på begäran. På desktop ligger fondinnehavet
          till vänster; på mobil kommer effekten först i läsordningen. */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start lg:gap-12">
        <div className="lg:order-2">
          {hasEffect && (
            <>
              <div className="flex items-baseline justify-between gap-4">
                <p className="label-meta">Beräknad effekt per år</p>
                <p className="text-xs text-ink-3">
                  {assumed ? "vid 100 000 kr investerat" : `vid ${pv.toLocaleString("sv-SE")} kr investerat`}
                </p>
              </div>

              <div className="mt-2 divide-y divide-line border-b border-line">
                {feeSavingsKr !== null && (
                  <KeyValueRow
                    label="Avgiftsbesparing"
                    note="Beräknad utifrån redovisad avgift"
                    value={kr(feeSavingsKr)}
                    tone={tone(feeSavingsKr)}
                  />
                )}
                {returnGainKr !== null && (
                  <KeyValueRow
                    label="Historisk avkastningsskillnad"
                    note="Baserat på 3-årsavkastning, annualiserad"
                    value={kr(returnGainKr)}
                    tone={tone(returnGainKr)}
                  />
                )}
              </div>

              <KeyValueRow label="Netto per år" value={kr(netKr)} tone={tone(netKr)} emphasis className="pt-4" />
            </>
          )}

          <Disclosure
            className="mt-6"
            showLabel="Visa jämförelse"
            hideLabel="Dölj jämförelse"
          >
            <p className="label-meta mb-3">Jämförelse</p>
            {comparison}
          </Disclosure>
        </div>

        <div className="lg:order-1">
          <p className="label-meta mb-2">Fondinnehav</p>
          <div className="divide-y divide-line border-t border-line">
            {allocation.map((f, i) => (
              <AllocationRow key={i} name={f.name} weight={f.weight} />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-ink-3">
        Avgiftsbesparing är en beräkning utifrån redovisade avgifter. Kontrollera alltid aktuella
        villkor hos fondbolag eller depåplattform. Historisk avkastning är ingen garanti för
        framtida resultat — avkastningssiffran ska ses som referens, inte som en prognos.
      </p>
        </div>
      </section>
    </div>
  );
}

function OptimalPortfolioProjection({ current, portfolioValue }: { current: CurrentMetrics; portfolioValue: number | null }) {
  const assumed = portfolioValue === null;
  const pv = portfolioValue ?? 100_000;
  const returnKr = current.weightedReturn3yr !== null ? (ann3yr(current.weightedReturn3yr) / 100) * pv : null;
  const feeKr = current.avgCost !== null ? (current.avgCost / 100) * pv : null;
  const netKr = returnKr !== null && feeKr !== null ? returnKr - feeKr : null;

  return (
    <section className="bg-white rounded-md p-6 sm:p-8" style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04)", border: "1px solid #D9E0E6" }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-md bg-green-100 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-pos" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400 mb-0.5">Analys</p>
          <p className="text-lg font-semibold text-ink">Inga bättre fondalternativ hittades</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-md p-5">
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
