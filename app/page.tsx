"use client";

import { useRef, useState } from "react";
import type { PortfolioAnalysis, SuggestedMetrics } from "@/lib/analysis";

// ── Types ─────────────────────────────────────────────────────────────────────

type Entry = { isin: string; name: string; weight: string };
type FundSuggestion = { name: string; isin: string };

const CUSTODIANS = [{ value: "avanza", label: "Avanza" }];

// ── Fund search input with autocomplete ───────────────────────────────────────

function FundSearchInput({
  isin,
  name,
  onSelect,
  onClear,
}: {
  isin: string;
  name: string;
  onSelect: (isin: string, name: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<FundSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fund already selected — show as a chip
  if (isin) {
    return (
      <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-0">
        <span className="flex-1 truncate font-medium text-gray-900">{name}</span>
        <span className="text-xs text-gray-400 shrink-0">{isin}</span>
        <button
          type="button"
          onClick={onClear}
          className="text-gray-400 hover:text-red-500 shrink-0 transition-colors"
        >
          ✕
        </button>
      </div>
    );
  }

  function handleChange(q: string) {
    setQuery(q);
    if (debounce.current) clearTimeout(debounce.current);
    if (q.length < 2) {
      setSuggestions([]);
      setNoResults(false);
      setOpen(false);
      return;
    }
    debounce.current = setTimeout(async () => {
      const res = await fetch(`/api/funds/search?q=${encodeURIComponent(q)}`);
      const data: FundSuggestion[] = await res.json();
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
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={`${s.isin}-${i}`}
              onMouseDown={() => {
                onSelect(s.isin, s.name);
                setQuery("");
                setOpen(false);
                setNoResults(false);
              }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex items-baseline justify-between gap-3"
            >
              <span className="font-medium text-gray-900">{s.name}</span>
              <span className="text-xs text-gray-400 shrink-0">{s.isin}</span>
            </li>
          ))}
        </ul>
      )}
      {open && noResults && (
        <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 px-3 py-3 text-sm text-gray-500">
          Ingen fond hittades för &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [custodian, setCustodian] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([
    { isin: "", name: "", weight: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addRow() {
    setEntries((prev) => [...prev, { isin: "", name: "", weight: "" }]);
  }

  function removeRow(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
  }

  function selectFund(i: number, isin: string, name: string) {
    setEntries((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, isin, name } : e))
    );
  }

  function clearFund(i: number) {
    setEntries((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, isin: "", name: "" } : e))
    );
  }

  function updateWeight(i: number, value: string) {
    setEntries((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, weight: value } : e))
    );
  }

  async function analyze() {
    setError(null);
    setAnalysis(null);

    const valid = entries.filter((e) => e.isin.trim() && e.weight.trim());
    if (valid.length === 0) {
      setError("Lägg till minst en fond med vikt.");
      return;
    }

    const payload = valid.map((e) => ({
      isin: e.isin.trim().toUpperCase(),
      weight: parseFloat(e.weight),
    }));

    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Okänt fel");
      setAnalysis(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const totalWeight = entries.reduce(
    (s, e) => s + (parseFloat(e.weight) || 0),
    0
  );

  // ── Step 1: choose custodian ───────────────────────────────────────────────
  if (!custodian) {
    return (
      <div className="space-y-8">
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Välj depåinstitut</h2>
          <p className="text-sm text-gray-600">
            Välj var du förvaltar dina fonder.
          </p>
          <select
            defaultValue=""
            onChange={(e) => setCustodian(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="" disabled>
              Välj depåinstitut…
            </option>
            {CUSTODIANS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </section>
      </div>
    );
  }

  // ── Step 2: portfolio input ────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Din portfölj</h2>
          <button
            onClick={() => { setCustodian(null); setAnalysis(null); setError(null); }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {CUSTODIANS.find((c) => c.value === custodian)?.label} ·{" "}
            <span className="underline">Byt</span>
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Sök på fondnamn eller ISIN och ange vikt (%) för varje fond.
        </p>

        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_100px_36px] gap-2 text-xs font-semibold text-gray-600 px-1">
            <span>Fond</span>
            <span>Vikt (%)</span>
            <span />
          </div>

          {entries.map((entry, i) => (
            <div key={i} className="grid grid-cols-[1fr_100px_36px] gap-2">
              <FundSearchInput
                isin={entry.isin}
                name={entry.name}
                onSelect={(isin, name) => selectFund(i, isin, name)}
                onClear={() => clearFund(i)}
              />
              <input
                type="number"
                placeholder="25"
                min={0}
                max={100}
                value={entry.weight}
                onChange={(e) => updateWeight(i, e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => removeRow(i)}
                disabled={entries.length === 1}
                className="flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 disabled:opacity-30 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={addRow}
            className="text-sm text-blue-600 hover:underline"
          >
            + Lägg till fond
          </button>
          <span
            className={`text-sm font-semibold ${
              Math.abs(totalWeight - 100) < 0.1
                ? "text-green-700"
                : "text-gray-700"
            }`}
          >
            Summa: {totalWeight.toFixed(1)}%
          </span>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
            {error}
          </p>
        )}

        <button
          onClick={analyze}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-xl py-3 transition-colors"
        >
          {loading ? "Analyserar…" : "Analysera portfölj"}
        </button>
      </section>

      {analysis && <AnalysisResult analysis={analysis} />}
    </div>
  );
}

// ── Results component ─────────────────────────────────────────────────────────

function AnalysisResult({ analysis }: { analysis: PortfolioAnalysis }) {
  return (
    <div className="space-y-6">
      <section className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-blue-900 mb-2">Sammanfattning</h2>
        <p className="text-sm text-blue-950 leading-relaxed">
          {analysis.summaryText}
        </p>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Nyckeltal</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metric
            label="Snittavgift"
            value={
              analysis.avgCost !== null
                ? `${analysis.avgCost.toFixed(2)}%`
                : "–"
            }
            sub="per år"
          />
          <Metric
            label="Avkastning 1 år"
            value={
              analysis.weightedReturn1yr !== null
                ? `${analysis.weightedReturn1yr.toFixed(1)}%`
                : "–"
            }
            sub="viktad"
          />
          <Metric
            label="Avkastning 3 år"
            value={
              analysis.weightedReturn3yr !== null
                ? `${analysis.weightedReturn3yr.toFixed(1)}%`
                : "–"
            }
            sub="annualiserad, viktad"
          />
          <Metric
            label="Sharpe 3 år"
            value={
              analysis.weightedSharpe !== null
                ? analysis.weightedSharpe.toFixed(2)
                : "–"
            }
            sub="riskjusterad avkastning"
          />
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Fördelning</h2>
        <div className="space-y-3">
          {analysis.categoryBreakdown.map((cat) => (
            <div key={cat.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-800">{cat.label}</span>
                <span className="font-semibold text-gray-900">
                  {cat.weight.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${cat.weight}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {analysis.swapSuggestions.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Fondbyteförslag
          </h2>
          <p className="text-sm font-medium text-gray-600 mb-4">
            Fonder i samma kategori med bättre nyckeltal.
          </p>
          <div className="space-y-4">
            {analysis.swapSuggestions.map((s, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-xl p-4 space-y-2 bg-gray-50"
              >
                {s.consolidate ? (
                  <>
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Överväg att sälja
                        </p>
                        <p className="font-semibold text-sm text-gray-900">
                          {s.currentFund.name}
                        </p>
                        <p className="text-xs font-medium text-gray-500">
                          {s.currentFund.isin}
                        </p>
                      </div>
                      <span className="text-gray-400 text-lg mt-3">→</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                          Öka i befintlig fond
                        </p>
                        <p className="font-semibold text-sm text-gray-900">
                          {s.suggestedFund.name}
                        </p>
                        <p className="text-xs font-medium text-gray-500">
                          {s.suggestedFund.isin}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-blue-700">
                        Konsolidera:
                      </span>{" "}
                      Du har redan {s.suggestedFund.name} i portföljen och den
                      är den bästa fonden i kategorin. Flytta kapitalet från{" "}
                      {s.currentFund.name} dit istället.{" "}
                      {s.reason && `(${s.reason})`}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Nuvarande fond
                        </p>
                        <p className="font-semibold text-sm text-gray-900">
                          {s.currentFund.name}
                        </p>
                        <p className="text-xs font-medium text-gray-500">
                          {s.currentFund.isin}
                        </p>
                      </div>
                      <span className="text-gray-400 text-lg mt-3">→</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                          Föreslagen fond
                        </p>
                        <p className="font-semibold text-sm text-gray-900">
                          {s.suggestedFund.name}
                        </p>
                        <p className="text-xs font-medium text-gray-500">
                          {s.suggestedFund.isin}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-green-700">
                        Förbättring:
                      </span>{" "}
                      {s.reason}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {analysis.suggestedMetrics && (
        <SuggestedPortfolio
          current={{
            avgCost: analysis.avgCost,
            weightedReturn1yr: analysis.weightedReturn1yr,
            weightedReturn3yr: analysis.weightedReturn3yr,
            weightedSharpe: analysis.weightedSharpe,
          }}
          suggested={analysis.suggestedMetrics}
        />
      )}

      {analysis.notFound.length > 0 && (
        <section className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4">
          <p className="text-sm text-yellow-800">
            <span className="font-medium">Hittades inte:</span>{" "}
            {analysis.notFound.join(", ")}
          </p>
        </section>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-gray-100 rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

// ── Suggested portfolio comparison ────────────────────────────────────────────

type CurrentMetrics = {
  avgCost: number | null;
  weightedReturn1yr: number | null;
  weightedReturn3yr: number | null;
  weightedSharpe: number | null;
};

function delta(next: number | null, prev: number | null, lowerIsBetter = false) {
  if (next === null || prev === null) return null;
  const diff = next - prev;
  const better = lowerIsBetter ? diff < 0 : diff > 0;
  return { diff, better };
}

function fmt(v: number | null, decimals = 2, suffix = "%") {
  return v !== null ? `${v.toFixed(decimals)}${suffix}` : "–";
}

function SuggestedPortfolio({
  current,
  suggested,
}: {
  current: CurrentMetrics;
  suggested: SuggestedMetrics;
}) {
  const rows: {
    label: string;
    currentVal: number | null;
    suggestedVal: number | null;
    sub: string;
    lowerIsBetter?: boolean;
    decimals?: number;
  }[] = [
    { label: "Snittavgift", currentVal: current.avgCost, suggestedVal: suggested.avgCost, sub: "per år", lowerIsBetter: true },
    { label: "Avkastning 1 år", currentVal: current.weightedReturn1yr, suggestedVal: suggested.weightedReturn1yr, sub: "viktad" },
    { label: "Avkastning 3 år", currentVal: current.weightedReturn3yr, suggestedVal: suggested.weightedReturn3yr, sub: "annualiserad" },
    { label: "Sharpe 3 år", currentVal: current.weightedSharpe, suggestedVal: suggested.weightedSharpe, sub: "riskjusterad", decimals: 2 },
  ];

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Föreslagen portfölj</h2>
        <p className="text-sm text-gray-500 mt-0.5">Nyckeltal om du genomför alla förslag ovan.</p>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <th className="text-left py-2 pr-4">Nyckeltal</th>
              <th className="text-right py-2 px-4">Nuvarande</th>
              <th className="text-right py-2 px-4">Föreslagen</th>
              <th className="text-right py-2 pl-4">Förändring</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => {
              const d = delta(row.suggestedVal, row.currentVal, row.lowerIsBetter);
              return (
                <tr key={row.label} className="text-gray-800">
                  <td className="py-3 pr-4">
                    <span className="font-medium">{row.label}</span>
                    <span className="text-xs text-gray-400 ml-1">{row.sub}</span>
                  </td>
                  <td className="text-right py-3 px-4 text-gray-500">
                    {fmt(row.currentVal, row.decimals ?? 2)}
                  </td>
                  <td className="text-right py-3 px-4 font-semibold">
                    {fmt(row.suggestedVal, row.decimals ?? 2)}
                  </td>
                  <td className="text-right py-3 pl-4 font-semibold">
                    {d ? (
                      <span className={d.better ? "text-green-600" : "text-red-500"}>
                        {d.better ? "▲" : "▼"} {Math.abs(d.diff).toFixed(row.decimals ?? 2)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">–</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Suggested fund list */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fondinnehav</p>
        <div className="space-y-1">
          {suggested.funds.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
              <div>
                <span className="font-medium text-gray-900">{f.name}</span>
                <span className="text-xs text-gray-400 ml-2">{f.isin}</span>
              </div>
              <span className="font-semibold text-gray-700">{f.weight.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
