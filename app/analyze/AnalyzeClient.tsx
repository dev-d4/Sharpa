"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PortfolioAnalysis, SuggestedMetrics } from "@/lib/analysis";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Building2, Landmark, Search } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

type Entry = { isin: string; name: string; weight: string };
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

  const [user, setUser] = useState<User | null>(null);
  const [custodian, setCustodian] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([{ isin: "", name: "", weight: "" }]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Portfolio saving state
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [portfolioName, setPortfolioName] = useState<string | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [savingName, setSavingName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [portfolioLoading, setPortfolioLoading] = useState(() =>
    new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").has("portfolio")
  );

  // Warm up fund cache as soon as page loads so search is instant
  useEffect(() => {
    fetch("/api/funds/search?q=__warmup__").catch(() => {});
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
            setPortfolioName(p.name);
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
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  function addRow() { setEntries((p) => [...p, { isin: "", name: "", weight: "" }]); }
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

  async function analyze() {
    setError(null);
    setAnalysis(null);
    const valid = entries.filter((e) => e.isin.trim() && e.weight.trim());
    if (valid.length === 0) { setError("Lägg till minst en fond med vikt."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custodian, entries: valid.map((e) => ({ isin: e.isin.trim().toUpperCase(), weight: parseFloat(e.weight) })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Okänt fel");
      setAnalysis(data);

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
      setPortfolioName(data.name);
      setShowSaveForm(false);
      setSavingName("");
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    }
  }

  const totalWeight = entries.reduce((s, e) => s + (parseFloat(e.weight) || 0), 0);

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
        <div className="max-w-4xl mx-auto px-6 py-24 space-y-10">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Var förvaltar du dina fonder?
            </h1>
            <p className="text-slate-600 text-sm">
              Vi hämtar rätt fondutbud baserat på ditt val.
            </p>
          </div>

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

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      {portfolioId && (
        <div className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
          <span className="text-blue-700 font-medium">Redigerar: &ldquo;{portfolioName}&rdquo;</span>
          <span className="text-blue-400">·</span>
          <span className="text-blue-500">
            {saveStatus === "saving" && "Sparar…"}
            {saveStatus === "saved" && "Sparad ✓"}
            {saveStatus === "error" && "Kunde inte spara"}
            {saveStatus === "idle" && "Sparas automatiskt vid ny analys"}
          </span>
        </div>
      )}

      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Din portfölj</h2>
          <button
            onClick={() => { setCustodian(null); setAnalysis(null); setError(null); setPortfolioId(null); setPortfolioName(null); }}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            {CUSTODIANS.find((c) => c.value === custodian)?.label} · <span className="underline">Byt</span>
          </button>
        </div>
        <p className="text-sm text-slate-500">Sök på fondnamn eller ISIN och ange vikt (%) för varje fond.</p>

        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-[1fr_100px_36px] gap-2 text-xs font-semibold text-slate-500 px-1">
            <span>Fond</span><span>Vikt (%)</span><span />
          </div>
          {entries.map((entry, i) => (
            <div key={i} className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_100px_36px]">
              <FundSearchInput isin={entry.isin} name={entry.name} custodian={custodian} excludeIsins={entries.filter((_, idx) => idx !== i).map((e) => e.isin).filter(Boolean)} onSelect={(isin, name) => selectFund(i, isin, name)} onClear={() => clearFund(i)} />
              <div className="flex gap-2 sm:contents">
                <input
                  type="number" placeholder="Vikt %" min={0} max={100}
                  value={entry.weight} onChange={(e) => updateWeight(i, e.target.value)}
                  className="flex-1 sm:flex-none border border-slate-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
          <span className={`text-sm font-semibold ${Math.abs(totalWeight - 100) < 0.1 ? "text-green-600" : "text-slate-600"}`}>
            Summa: {totalWeight.toFixed(1)}%
          </span>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</p>}

        <button
          onClick={analyze} disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-blue-300 disabled:to-blue-300 text-white font-medium rounded-xl py-3 transition-all shadow-md shadow-blue-200"
        >
          {loading ? "Analyserar…" : "Analysera portfölj"}
        </button>
      </section>

      {analysis && <AnalysisResult analysis={analysis} user={user} onLoginClick={() => { saveSession(custodian, entries, analysis); router.push("/login"); }} />}

      {analysis && user && !portfolioId && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          {!showSaveForm ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Spara portföljen?</p>
                <p className="text-xs text-slate-400 mt-0.5">Kom åt den när som helst från Mitt konto.</p>
              </div>
              <button
                onClick={() => setShowSaveForm(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              >
                Spara portfölj
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

function AnalysisResult({ analysis, user, onLoginClick }: { analysis: PortfolioAnalysis; user: User | null; onLoginClick: () => void }) {
  const unlocked = !!user;
  const ctaText = buildLoginCTA(analysis);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <section className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-blue-900 mb-2">Sammanfattning</h2>
        <p className="text-sm text-blue-900 leading-relaxed">{analysis.summaryText}</p>
      </section>

      {/* Key metrics — always visible */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Nyckeltal</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metric label="Snittavgift" value={analysis.avgCost !== null ? `${analysis.avgCost.toFixed(2)}%` : "–"} sub="per år" info="Den genomsnittliga årliga avgiften viktat efter din fördelning." />
          <Metric label="Avkastning 1 år" value={analysis.weightedReturn1yr !== null ? `${analysis.weightedReturn1yr.toFixed(1)}%` : "–"} sub="viktad" info="Portföljens viktade avkastning de senaste 12 månaderna." />
          <Metric label="Avkastning 3 år" value={analysis.weightedReturn3yr !== null ? `${analysis.weightedReturn3yr.toFixed(1)}%` : "–"} sub="annualiserad" info="Genomsnittlig årlig avkastning de senaste 3 åren." />
          <Metric label="Sharpe 3 år" value={analysis.weightedSharpe !== null ? analysis.weightedSharpe.toFixed(2) : "–"} sub="riskjusterad" info="Avkastning i förhållande till risk. Högre är bättre." />
        </div>
      </section>

      {/* Category breakdown — always visible */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Fördelning</h2>
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
      </section>

      {/* Swap suggestions — blurred if not logged in */}
      {analysis.swapSuggestions.length > 0 && (
        <BlurGate unlocked={unlocked} ctaText={ctaText} onLoginClick={onLoginClick}>
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Fondbytesförslag</h2>
            <p className="text-sm text-slate-500 mb-4">Fonder i samma kategori med bättre nyckeltal.</p>
            <div className="space-y-4">
              {analysis.swapSuggestions.map((s, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50">
                  {s.consolidate ? (
                    <>
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Överväg att sälja</p>
                          <p className="font-semibold text-sm text-slate-900">{s.currentFund.name}</p>
                          <p className="text-xs text-slate-400">{s.currentFund.isin}</p>
                        </div>
                        <span className="text-slate-400 text-lg mt-3">→</span>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Öka i befintlig fond</p>
                          <p className="font-semibold text-sm text-slate-900">{s.suggestedFund.name}</p>
                          <p className="text-xs text-slate-400">{s.suggestedFund.isin}</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold text-blue-600">Konsolidera: </span>
                        Du har redan {s.suggestedFund.name} i portföljen och den är den bästa fonden i kategorin. Flytta kapitalet från {s.currentFund.name} dit istället.{s.reason && ` (${s.reason})`}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nuvarande fond</p>
                          <p className="font-semibold text-sm text-slate-900">{s.currentFund.name}</p>
                          <p className="text-xs text-slate-400">{s.currentFund.isin}</p>
                        </div>
                        <span className="text-slate-400 text-lg mt-3">→</span>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Föreslagen fond</p>
                          <p className="font-semibold text-sm text-slate-900">{s.suggestedFund.name}</p>
                          <p className="text-xs text-slate-400">{s.suggestedFund.isin}</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold text-green-600">Förbättring: </span>{s.reason}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        </BlurGate>
      )}

      {/* Best in category */}
      {analysis.bestInCategory.length > 0 && (
        <section className="bg-green-50 border border-green-100 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
            <h2 className="text-sm font-bold text-green-900">Redan bäst i sin kategori</h2>
          </div>
          <div className="space-y-1.5">
            {analysis.bestInCategory.map((f) => (
              <div key={f.isin} className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-green-900">{f.fundName}</span>
                <span className="text-xs text-green-600 ml-3 shrink-0">{f.category}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Suggested portfolio — only visible when logged in */}
      {analysis.suggestedMetrics && unlocked && (
        <SuggestedPortfolio
          current={{ avgCost: analysis.avgCost, weightedReturn1yr: analysis.weightedReturn1yr, weightedReturn3yr: analysis.weightedReturn3yr, weightedSharpe: analysis.weightedSharpe }}
          suggested={analysis.suggestedMetrics}
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

function SuggestedPortfolio({ current, suggested }: { current: CurrentMetrics; suggested: SuggestedMetrics }) {
  const rows = [
    { label: "Snittavgift", sub: "per år", currentVal: current.avgCost, suggestedVal: suggested.avgCost, lowerIsBetter: true },
    { label: "Avkastning 1 år", sub: "viktad", currentVal: current.weightedReturn1yr, suggestedVal: suggested.weightedReturn1yr },
    { label: "Avkastning 3 år", sub: "annualiserad", currentVal: current.weightedReturn3yr, suggestedVal: suggested.weightedReturn3yr },
    { label: "Sharpe 3 år", sub: "riskjusterad", currentVal: current.weightedSharpe, suggestedVal: suggested.weightedSharpe },
  ];

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Föreslagen portfölj</h2>
        <p className="text-sm text-slate-400 mt-0.5">Nyckeltal om du genomför alla förslag ovan.</p>
      </div>
      <div className="overflow-x-auto">
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
    </section>
  );
}
