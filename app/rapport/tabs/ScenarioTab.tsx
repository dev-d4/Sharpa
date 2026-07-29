"use client";

import { useState, useEffect, useRef } from "react";
import type { PortfolioAnalysis } from "@/lib/analysis";
import { cn } from "@/lib/utils";
import { Search, X, Plus, RotateCcw } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ScenarioEntry = { isin: string; name: string; weight: string };
type SearchResult  = { name: string; isin: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPct(v: number | null, decimals = 2) {
  return v != null ? `${v.toFixed(decimals)}%` : "–";
}

function delta(next: number | null, prev: number | null, lowerIsBetter = false) {
  if (next === null || prev === null) return null;
  const diff = next - prev;
  return { diff, better: lowerIsBetter ? diff < 0 : diff > 0 };
}

// ── Inline fund search ────────────────────────────────────────────────────────

function InlineFundSearch({ custodian, excludeIsins, onSelect }: {
  custodian: string;
  excludeIsins: string[];
  onSelect: (isin: string, name: string) => void;
}) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/funds/search?q=${encodeURIComponent(query)}&custodian=${custodian}`);
        const data: SearchResult[] = await res.json();
        setResults(data.filter(d => !excludeIsins.includes(d.isin)).slice(0, 10));
        setOpen(true);
      } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [query, custodian, excludeIsins]);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function select(isin: string, name: string) {
    onSelect(isin, name);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 border border-dashed border-slate-300 hover:border-blue-400 rounded-md bg-slate-50 px-3 py-2.5 transition-colors focus-within:border-blue-500 focus-within:bg-white">
        <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Lägg till fond..."
          className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400 min-w-0"
        />
        {loading && <div className="w-3 h-3 rounded-full border border-blue-400 border-t-transparent animate-spin shrink-0" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-30 overflow-hidden">
          {results.map(r => (
            <button
              key={r.isin}
              onClick={() => select(r.isin, r.name)}
              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
            >
              <p className="text-sm font-medium text-slate-900 truncate">{r.name}</p>
              <p className="text-xs text-slate-400 font-mono">{r.isin}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Comparison row ────────────────────────────────────────────────────────────

function CompareRow({ label, sub, current, scenario, lowerIsBetter = false }: {
  label: string; sub: string;
  current: number | null; scenario: number | null;
  lowerIsBetter?: boolean;
}) {
  const d = delta(scenario, current, lowerIsBetter);
  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="py-3 pr-4">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </td>
      <td className="py-3 px-3 text-right text-sm text-slate-400 tabular-nums">{fmtPct(current)}</td>
      <td className="py-3 px-3 text-right text-sm font-semibold text-slate-900 tabular-nums">{fmtPct(scenario)}</td>
      <td className="py-3 pl-3 text-right tabular-nums">
        {d ? (
          <span className={cn("text-sm font-semibold", d.better ? "text-emerald-600" : "text-red-500")}>
            {d.diff > 0 ? "+" : ""}{d.diff.toFixed(2)}%
          </span>
        ) : (
          <span className="text-sm text-slate-300">–</span>
        )}
      </td>
    </tr>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ScenarioTab({
  initialFunds,
  nameMap,
  custodian,
  originalAnalysis,
}: {
  initialFunds: { isin: string; weight: number }[];
  nameMap: Map<string, string>;
  custodian: string;
  originalAnalysis: PortfolioAnalysis | null;
}) {
  const [entries, setEntries] = useState<ScenarioEntry[]>(() =>
    initialFunds.map(f => ({
      isin: f.isin,
      name: nameMap.get(f.isin) ?? f.isin,
      weight: f.weight.toFixed(1),
    }))
  );

  const [scenarioAnalysis, setScenarioAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [hasRun, setHasRun]     = useState(false);

  const totalWeight = entries.reduce((s, e) => s + (parseFloat(e.weight) || 0), 0);
  const totalOk     = Math.abs(totalWeight - 100) < 0.15;

  function updateWeight(i: number, val: string) {
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, weight: val } : e));
    setScenarioAnalysis(null);
  }

  function removeEntry(i: number) {
    setEntries(prev => prev.filter((_, idx) => idx !== i));
    setScenarioAnalysis(null);
  }

  function addFund(isin: string, name: string) {
    setEntries(prev => [...prev, { isin, name, weight: "" }]);
    setScenarioAnalysis(null);
  }

  function normalize() {
    const valid = entries.filter(e => e.isin && (parseFloat(e.weight) || 0) > 0);
    const total = valid.reduce((s, e) => s + (parseFloat(e.weight) || 0), 0);
    if (total === 0) {
      // Even split
      const n = entries.filter(e => e.isin).length;
      if (!n) return;
      const w = (100 / n).toFixed(1);
      setEntries(prev => prev.map(e => e.isin ? { ...e, weight: w } : e));
    } else {
      setEntries(prev => prev.map(e => {
        const w = parseFloat(e.weight) || 0;
        return { ...e, weight: ((w / total) * 100).toFixed(1) };
      }));
    }
    setScenarioAnalysis(null);
  }

  function reset() {
    setEntries(initialFunds.map(f => ({
      isin: f.isin,
      name: nameMap.get(f.isin) ?? f.isin,
      weight: f.weight.toFixed(1),
    })));
    setScenarioAnalysis(null);
    setHasRun(false);
    setError(null);
  }

  async function runAnalysis() {
    const valid = entries.filter(e => e.isin.trim() && (parseFloat(e.weight) || 0) > 0);
    if (!valid.length) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custodian,
          entries: valid.map(e => ({ isin: e.isin.trim().toUpperCase(), weight: parseFloat(e.weight) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Okänt fel");
      setScenarioAnalysis(data);
      setHasRun(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const compRows = [
    { label: "Snittavgift",     sub: "per år",       key: "cost" as const,      cur: originalAnalysis?.avgCost,           scen: scenarioAnalysis?.avgCost,           lower: true  },
    { label: "Avkastning 1 år", sub: "viktad",        key: "ret1" as const,      cur: originalAnalysis?.weightedReturn1yr, scen: scenarioAnalysis?.weightedReturn1yr, lower: false },
    { label: "Avkastning 3 år", sub: "totalt",        key: "ret3" as const,      cur: originalAnalysis?.weightedReturn3yr, scen: scenarioAnalysis?.weightedReturn3yr, lower: false },
    { label: "Sharpe 3 år",     sub: "riskjusterad",  key: "sharpe" as const,    cur: originalAnalysis?.weightedSharpe,    scen: scenarioAnalysis?.weightedSharpe,    lower: false },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Scenarioanalys</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Justera vikter, byt fonder och se hur portföljens nyckeltal förändras.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">

        {/* ── Left: portfolio editor ─────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Fund rows */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_100px_40px] gap-3 px-4 py-2.5 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-widest">
              <span>Fond</span>
              <span className="text-right">Vikt (%)</span>
              <span />
            </div>
            <div className="divide-y divide-slate-50">
              {entries.map((e, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_40px] gap-3 items-center px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{e.name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{e.isin}</p>
                  </div>
                  <input
                    type="number"
                    value={e.weight}
                    onChange={ev => updateWeight(i, ev.target.value)}
                    min={0} max={100} step={0.1} placeholder="0"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-right tabular-nums font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => removeEntry(i)}
                    disabled={entries.length <= 1}
                    className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-20 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add fund — outside overflow-hidden so the dropdown is never clipped */}
          <InlineFundSearch
            custodian={custodian}
            excludeIsins={entries.map(e => e.isin)}
            onSelect={addFund}
          />

          {/* Weight summary + controls */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className={cn(
                "text-sm font-semibold",
                totalOk ? "text-emerald-600" : "text-amber-600"
              )}>
                Summa: {totalWeight.toFixed(1)}%
              </span>
              {!totalOk && (
                <button
                  onClick={normalize}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
                >
                  Normalisera till 100%
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-2 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Återställ
              </button>
              <button
                onClick={runAnalysis}
                disabled={loading || entries.filter(e => parseFloat(e.weight) > 0).length === 0}
                className="flex items-center gap-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-md px-5 py-2.5 transition-colors shadow-sm shadow-blue-200"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Analyserar…
                  </>
                ) : (
                  "Kör analys"
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-md px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* ── Right: comparison ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {!hasRun && !loading && (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-8 text-center">
              <p className="text-sm font-medium text-slate-500">Justera portföljen och kör analysen</p>
              <p className="text-xs text-slate-400 mt-1">Resultatet jämförs mot den ursprungliga portföljens nyckeltal</p>
            </div>
          )}

          {loading && (
            <div className="bg-white border border-slate-200 rounded-lg p-8 flex items-center justify-center gap-3 shadow-sm">
              <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <span className="text-sm text-slate-500">Beräknar scenario…</span>
            </div>
          )}

          {scenarioAnalysis && !loading && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jämförelse</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">Nuvarande vs scenario</p>
              </div>
              <div className="px-5 py-3">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="text-left py-2 pr-4">Nyckeltal</th>
                      <th className="text-right py-2 px-3">Nu</th>
                      <th className="text-right py-2 px-3">Scenario</th>
                      <th className="text-right py-2 pl-3">Skillnad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compRows.map(row => (
                      <CompareRow
                        key={row.key}
                        label={row.label}
                        sub={row.sub}
                        current={row.cur ?? null}
                        scenario={row.scen ?? null}
                        lowerIsBetter={row.lower}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {(scenarioAnalysis.notFound?.length ?? 0) > 0 && (
                <div className="mx-5 mb-4 bg-amber-50 border border-amber-100 rounded-md px-3 py-2.5">
                  <p className="text-xs text-amber-800">
                    <span className="font-semibold">Hittades ej: </span>
                    {scenarioAnalysis.notFound.join(", ")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
