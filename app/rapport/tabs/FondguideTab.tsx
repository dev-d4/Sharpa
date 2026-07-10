"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Search, X, Plus, ChevronDown, ChevronUp } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type SearchResult = { name: string; isin: string };

type FundDetail = {
  isin: string;
  name: string;
  category_group: string | null;
  category: string | null;
  ongoing_cost_actual: number | null;
  ongoing_cost_estimated: number | null;
  return_1yr: number | null;
  return_3yr: number | null;
  return_5yr: number | null;
  sharpe_3yr: number | null;
  investment_type: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined, decimals = 2, suffix = "%") {
  if (v == null) return "–";
  return `${v.toFixed(decimals)}${suffix}`;
}

function cost(f: FundDetail) {
  return f.ongoing_cost_actual ?? f.ongoing_cost_estimated ?? null;
}

// Returns index of the best fund for a metric. lowerIsBetter=true for cost.
function bestIdx(details: FundDetail[], getter: (f: FundDetail) => number | null, lowerIsBetter = false): number {
  let bestI = -1;
  let bestV: number | null = null;
  details.forEach((f, i) => {
    const v = getter(f);
    if (v === null) return;
    if (bestV === null || (lowerIsBetter ? v < bestV : v > bestV)) { bestV = v; bestI = i; }
  });
  return bestI;
}

// Worst = best with inverted direction.
function worstIdx(details: FundDetail[], getter: (f: FundDetail) => number | null, lowerIsBetter = false): number {
  return bestIdx(details, getter, !lowerIsBetter);
}

// ── Fund search input ─────────────────────────────────────────────────────────

function FundSearch({ custodian, excludeIsins, onSelect }: {
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
        setResults(data.filter(d => !excludeIsins.includes(d.isin)).slice(0, 12));
        setOpen(true);
      } finally {
        setLoading(false);
      }
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

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 border border-slate-200 rounded-xl bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Sök fond att jämföra..."
          className="flex-1 text-sm outline-none text-slate-900 placeholder-slate-400 min-w-0"
        />
        {loading && <div className="w-3.5 h-3.5 rounded-full border border-blue-500 border-t-transparent animate-spin shrink-0" />}
        {query && !loading && (
          <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }}>
            <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden">
          {results.map(r => (
            <button
              key={r.isin}
              onClick={() => { onSelect(r.isin, r.name); setQuery(""); setResults([]); setOpen(false); }}
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

// ── Metric cell ───────────────────────────────────────────────────────────────

function Cell({ value, isBest, isWorst }: { value: string; isBest: boolean; isWorst: boolean }) {
  return (
    <td className={cn(
      "px-4 py-3 text-sm tabular-nums font-semibold text-right",
      isBest  && "text-emerald-600",
      isWorst && "text-red-500",
      !isBest && !isWorst && "text-slate-700"
    )}>
      {value}
    </td>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FondguideTab({
  custodian,
  portfolioIsins,
}: {
  custodian: string;
  portfolioIsins: string[];
}) {
  const MAX_COMPARE = Math.max(8, portfolioIsins.length);
  const [compared, setCompared]       = useState<string[]>(portfolioIsins);
  const [details, setDetails]         = useState<FundDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showMeta, setShowMeta]       = useState(false);

  // Load details whenever compared list changes
  useEffect(() => {
    if (!compared.length) { queueMicrotask(() => setDetails([])); return; }
    queueMicrotask(() => setLoadingDetails(true));
    fetch(`/api/funds/details?isins=${compared.join(",")}&custodian=${custodian}`)
      .then(r => r.json())
      .then((data: FundDetail[]) => {
        // Preserve the order of `compared`
        const map = new Map(data.map(f => [f.isin, f]));
        setDetails(compared.map(isin => map.get(isin)).filter(Boolean) as FundDetail[]);
      })
      .finally(() => setLoadingDetails(false));
  }, [compared, custodian]);

  function addFund(isin: string, name: string) {
    if (compared.includes(isin) || compared.length >= MAX_COMPARE) return;
    setCompared(prev => [...prev, isin]);
  }

  function removeFund(isin: string) {
    setCompared(prev => prev.filter(i => i !== isin));
  }

  // Column best/worst indices — only color when ≥2 funds have non-null data
  const bCost   = bestIdx (details, f => cost(f),       true);
  const wCost   = worstIdx(details, f => cost(f),       true);
  const bRet1   = bestIdx (details, f => f.return_1yr,  false);
  const wRet1   = worstIdx(details, f => f.return_1yr,  false);
  const bRet3   = bestIdx (details, f => f.return_3yr,  false);
  const wRet3   = worstIdx(details, f => f.return_3yr,  false);
  const bSharpe = bestIdx (details, f => f.sharpe_3yr,  false);
  const wSharpe = worstIdx(details, f => f.sharpe_3yr,  false);
  const countWith = (getter: (f: FundDetail) => number | null) =>
    details.filter(f => getter(f) !== null).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Fondguide</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Jämför fonder sida vid sida. Portföljens fonder är förvalda — sök för att lägga till fler.
          </p>
        </div>
        <span className="text-xs text-slate-400">{compared.length}/{MAX_COMPARE} fonder valda</span>
      </div>

      {/* Search */}
      <FundSearch
        custodian={custodian}
        excludeIsins={compared}
        onSelect={addFund}
      />

      {/* Loading */}
      {loadingDetails && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="w-4 h-4 rounded-full border border-blue-400 border-t-transparent animate-spin" />
          Hämtar fonddata…
        </div>
      )}

      {/* Comparison table */}
      {details.length > 0 && !loadingDetails && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest w-[200px]">
                    Nyckeltal
                  </th>
                  {details.map(f => (
                    <th key={f.isin} className="px-4 py-3 text-right min-w-[160px]">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => removeFund(f.isin)}
                            className="text-slate-300 hover:text-red-400 transition-colors"
                            title="Ta bort"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-semibold text-slate-900 text-right leading-tight max-w-[130px] truncate block">
                            {f.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{f.isin}</span>
                        {portfolioIsins.includes(f.isin) && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
                            I portföljen
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {/* Avgift */}
                <tr className="group hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-500">Avgift / år</p>
                    <p className="text-[10px] text-slate-400">Lägre är bättre</p>
                  </td>
                  {details.map((f, i) => {
                    const n = countWith(fd => cost(fd));
                    return <Cell key={f.isin} value={fmt(cost(f))} isBest={n >= 2 && i === bCost} isWorst={n >= 2 && i === wCost && bCost !== wCost} />;
                  })}
                </tr>

                {/* Avkastning 1 år */}
                <tr className="group hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-500">Avkastning 1 år</p>
                    <p className="text-[10px] text-slate-400">Viktad</p>
                  </td>
                  {details.map((f, i) => {
                    const n = countWith(fd => fd.return_1yr);
                    return <Cell key={f.isin} value={fmt(f.return_1yr, 1)} isBest={n >= 2 && i === bRet1} isWorst={n >= 2 && i === wRet1 && bRet1 !== wRet1} />;
                  })}
                </tr>

                {/* Avkastning 3 år */}
                <tr className="group hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-500">Avkastning 3 år</p>
                    <p className="text-[10px] text-slate-400">Annualiserad</p>
                  </td>
                  {details.map((f, i) => {
                    const n = countWith(fd => fd.return_3yr);
                    return <Cell key={f.isin} value={fmt(f.return_3yr, 1)} isBest={n >= 2 && i === bRet3} isWorst={n >= 2 && i === wRet3 && bRet3 !== wRet3} />;
                  })}
                </tr>

                {/* Sharpe */}
                <tr className="group hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-500">Sharpe 3 år</p>
                    <p className="text-[10px] text-slate-400">Högre är bättre</p>
                  </td>
                  {details.map((f, i) => {
                    const n = countWith(fd => fd.sharpe_3yr);
                    return <Cell key={f.isin} value={fmt(f.sharpe_3yr, 2, "")} isBest={n >= 2 && i === bSharpe} isWorst={n >= 2 && i === wSharpe && bSharpe !== wSharpe} />;
                  })}
                </tr>

                {/* Expandable: Kategori + Förvaltning + 5yr */}
                {showMeta && (
                  <>
                    <tr className="group hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-500">Kategori</td>
                      {details.map(f => (
                        <td key={f.isin} className="px-4 py-3 text-sm text-right text-slate-600">
                          {f.category_group ?? "–"}
                        </td>
                      ))}
                    </tr>
                    <tr className="group hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-500">Förvaltning</td>
                      {details.map(f => {
                        const t = f.investment_type?.toUpperCase() ?? "";
                        const label = t.includes("PASSIVE") || t.includes("INDEX") ? "Passiv" : t.includes("ACTIVE") ? "Aktiv" : "–";
                        return <td key={f.isin} className="px-4 py-3 text-sm text-right text-slate-600">{label}</td>;
                      })}
                    </tr>
                    <tr className="group hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-500">Avkastning 5 år</p>
                        <p className="text-[10px] text-slate-400">Annualiserad</p>
                      </td>
                      {details.map(f => (
                        <td key={f.isin} className="px-4 py-3 text-sm tabular-nums font-semibold text-right text-slate-700">
                          {fmt(f.return_5yr, 1)}
                        </td>
                      ))}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-slate-50 flex items-center justify-between gap-5 bg-slate-50/50 flex-wrap">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Bäst i kategorin
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                Sämst i kategorin
              </div>
            </div>
            <button
              onClick={() => setShowMeta(v => !v)}
              className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showMeta ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showMeta ? "Visa färre" : "Visa mer"}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {details.length === 0 && !loadingDetails && (
        <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-10 text-center">
          <p className="text-sm font-medium text-slate-500">Inga fonder att jämföra</p>
          <p className="text-xs text-slate-400 mt-1">Sök ovan för att lägga till fonder i jämförelsen</p>
        </div>
      )}
    </div>
  );
}
