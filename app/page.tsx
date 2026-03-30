"use client";

import { useState } from "react";
import type { PortfolioAnalysis } from "@/lib/analysis";

type Entry = { isin: string; weight: string };

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([
    { isin: "", weight: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addRow() {
    setEntries((prev) => [...prev, { isin: "", weight: "" }]);
  }

  function removeRow(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateEntry(i: number, field: keyof Entry, value: string) {
    setEntries((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e))
    );
  }

  async function analyze() {
    setError(null);
    setAnalysis(null);

    const valid = entries.filter((e) => e.isin.trim() && e.weight.trim());
    if (valid.length === 0) {
      setError("Lägg till minst en fond med ISIN och vikt.");
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

  const totalWeight = entries.reduce((s, e) => s + (parseFloat(e.weight) || 0), 0);

  return (
    <div className="space-y-8">
      {/* ── Inmatningsformulär ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Din portfölj</h2>
        <p className="text-sm text-gray-600">
          Ange ISIN och vikt (%) för varje fond. Vikterna behöver inte summera
          till exakt 100%.
        </p>

        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_100px_36px] gap-2 text-xs font-semibold text-gray-600 px-1">
            <span>ISIN</span>
            <span>Vikt (%)</span>
            <span />
          </div>

          {entries.map((entry, i) => (
            <div key={i} className="grid grid-cols-[1fr_100px_36px] gap-2">
              <input
                type="text"
                placeholder="t.ex. SE0012454107"
                value={entry.isin}
                onChange={(e) => updateEntry(i, "isin", e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              />
              <input
                type="number"
                placeholder="25"
                min={0}
                max={100}
                value={entry.weight}
                onChange={(e) => updateEntry(i, "weight", e.target.value)}
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
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
        )}

        <button
          onClick={analyze}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-xl py-3 transition-colors"
        >
          {loading ? "Analyserar…" : "Analysera portfölj"}
        </button>
      </section>

      {/* ── Resultat ── */}
      {analysis && <AnalysisResult analysis={analysis} />}
    </div>
  );
}

// ── Resultatkomponent ─────────────────────────────────────────────────────────

function AnalysisResult({ analysis }: { analysis: PortfolioAnalysis }) {
  return (
    <div className="space-y-6">
      {/* Sammanfattning */}
      <section className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-blue-900 mb-2">Sammanfattning</h2>
        <p className="text-sm text-blue-950 leading-relaxed">{analysis.summaryText}</p>
      </section>

      {/* Nyckeltal */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Nyckeltal</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metric
            label="Snittavgift"
            value={analysis.avgCost !== null ? `${analysis.avgCost.toFixed(2)}%` : "–"}
            sub="per år"
          />
          <Metric
            label="Avkastning 1 år"
            value={analysis.weightedReturn1yr !== null ? `${analysis.weightedReturn1yr.toFixed(1)}%` : "–"}
            sub="viktad"
          />
          <Metric
            label="Avkastning 3 år"
            value={analysis.weightedReturn3yr !== null ? `${analysis.weightedReturn3yr.toFixed(1)}%` : "–"}
            sub="annualiserad, viktad"
          />
          <Metric
            label="Sharpe 3 år"
            value={analysis.weightedSharpe !== null ? analysis.weightedSharpe.toFixed(2) : "–"}
            sub="riskjusterad avkastning"
          />
        </div>
      </section>

      {/* Kategorifördelning */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Fördelning</h2>
        <div className="space-y-3">
          {analysis.categoryBreakdown.map((cat) => (
            <div key={cat.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-800">{cat.label}</span>
                <span className="font-semibold text-gray-900">{cat.weight.toFixed(1)}%</span>
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

      {/* Fondbyteförslag */}
      {analysis.swapSuggestions.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Fondbyteförslag</h2>
          <p className="text-sm font-medium text-gray-600 mb-4">
            Fonder i samma kategori med bättre nyckeltal.
          </p>
          <div className="space-y-4">
            {analysis.swapSuggestions.map((s, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-xl p-4 space-y-2 bg-gray-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nuvarande fond</p>
                    <p className="font-semibold text-sm text-gray-900">{s.currentFund.name}</p>
                    <p className="text-xs font-medium text-gray-500">{s.currentFund.isin}</p>
                  </div>
                  <span className="text-gray-400 text-lg mt-3">→</span>
                  <div>
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Föreslagen fond</p>
                    <p className="font-semibold text-sm text-gray-900">{s.suggestedFund.name}</p>
                    <p className="text-xs font-medium text-gray-500">{s.suggestedFund.isin}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-green-700">Förbättring:</span> {s.reason}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ej hittade ISIN */}
      {analysis.notFound.length > 0 && (
        <section className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4">
          <p className="text-sm text-yellow-800">
            <span className="font-medium">Hittades inte i databasen:</span>{" "}
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
