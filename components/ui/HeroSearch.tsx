"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PortfolioAnalysis, SwapSuggestion } from "@/lib/analysis";

type FundSuggestion = { name: string; isin: string };

const PANEL_SHADOW = { boxShadow: "0 1px 2px rgba(16,24,40,.04)" };

function fundCost(f: { ongoing_cost_actual: number | null; ongoing_cost_estimated: number | null }) {
  return f.ongoing_cost_actual ?? f.ongoing_cost_estimated;
}

function fmtPct(v: number | null, decimals = 2) {
  return v !== null ? `${v.toFixed(decimals).replace(".", ",")}%` : "–";
}

function fmtSigned(v: number, decimals = 1) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(decimals).replace(".", ",")}%`;
}

// ── Anledningsrader för ett byte — härledda ur improvement-objektet ───────────

type ReasonRow = { label: string; value?: string };

function swapReasons(swap: SwapSuggestion): ReasonRow[] {
  const rows: ReasonRow[] = [];
  const cur = swap.currentFund;
  const sug = swap.suggestedFund;

  if (swap.improvement.sharpe !== undefined) {
    rows.push({ label: "Bättre riskjusterad avkastning" });
  }
  if (swap.improvement.cost !== undefined) {
    rows.push({
      label: "Lägre avgift",
      value: `${fmtPct(fundCost(sug))} vs ${fmtPct(fundCost(cur))}`,
    });
  }
  if (swap.improvement.return1yr !== undefined && sug.return_1yr !== null && cur.return_1yr !== null) {
    rows.push({
      label: "Högre avkastning (1 år)",
      value: `${fmtSigned(sug.return_1yr)} vs ${fmtSigned(cur.return_1yr)}`,
    });
  }
  return rows;
}

// ── Panelvy — exakt samma layout för exempel och riktigt resultat ─────────────

function FundPanelView({
  title,
  badgeLabel,
  live,
  cost,
  ret3yr,
  swapName,
  reasons,
  noSwapText,
  onCta,
}: {
  title: string;
  badgeLabel: string;
  live: boolean;
  cost: string;
  ret3yr: { text: string; positive: boolean };
  swapName: string | null;
  reasons: ReasonRow[];
  noSwapText?: string;
  onCta: () => void;
}) {
  return (
    <div className={`w-full bg-white border border-line rounded-xl overflow-hidden${live ? " animate-fade" : ""}`} style={PANEL_SHADOW}>
      {/* Fond + badge */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line-soft">
        <p className="text-sm font-semibold text-ink truncate">{title}</p>
        <span
          className={`text-[11px] font-semibold rounded-lg px-2 py-0.5 shrink-0 border ${
            live ? "text-accent bg-info border-info-line" : "text-ink-4 bg-section border-line-soft"
          }`}
        >
          {badgeLabel}
        </span>
      </div>

      {/* Nyckeltal */}
      <div className="grid grid-cols-2 gap-3 px-5 py-4 border-b border-line-soft">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-ink-4 mb-0.5">Avgift</p>
          <p className="text-sm font-semibold text-ink tabular-nums">{cost}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-ink-4 mb-0.5">Avk. 3 år</p>
          <p className={`text-sm font-semibold tabular-nums ${ret3yr.positive ? "text-pos" : "text-neg"}`}>{ret3yr.text}</p>
        </div>
      </div>

      {/* Bytesförslag med anledning, eller bekräftelse */}
      <div className="px-5 py-4">
        {swapName ? (
          <>
            <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-ink-4 mb-2">Vi föreslår ett byte till</p>
            <p className="text-sm font-semibold text-ink">{swapName}</p>
            <div className="mt-2.5 space-y-1.5">
              {reasons.map((r) => (
                <div key={r.label} className="flex items-start gap-1.5 text-xs text-ink-2">
                  <svg className="w-3.5 h-3.5 text-pos shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="tabular-nums">
                    {r.label}
                    {r.value && <> ({r.value})</>}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-start gap-2.5">
            <svg className="w-4 h-4 text-pos mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-ink-2 leading-relaxed">{noSwapText}</p>
          </div>
        )}

        <button
          type="button"
          onClick={onCta}
          className="mt-4 w-full bg-accent hover:bg-accent-hover active:bg-accent-press text-white text-sm font-semibold py-3 rounded-[10px] transition-colors"
        >
          Analysera hela din portfölj →
        </button>
        <p className="text-[10px] text-ink-4 text-center mt-2 leading-snug">
          Automatiskt genererad jämförelse baserad på historiska data — inte finansiell rådgivning.
        </p>
      </div>
    </div>
  );
}

function LoadingPanel({ name }: { name: string }) {
  return (
    <div className="w-full min-h-[160px] lg:min-h-[240px] bg-white border border-line rounded-xl px-5 py-8 flex flex-col items-center justify-center gap-3" style={PANEL_SHADOW}>
      <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      <p className="text-sm text-ink-2 text-center">Analyserar <span className="font-semibold text-ink">{name}</span>…</p>
    </div>
  );
}

// ── Huvudkomponent: äger både sökfältet (vänster) och panelen (höger) ─────────

export default function HeroDemo({ children, belowSearch }: { children: React.ReactNode; belowSearch?: React.ReactNode }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<FundSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FundSuggestion | null>(null);
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  // Landningssidan söker i hela utbudet ("övrigt"), oberoende av depåval
  function custodian() {
    return "övrigt";
  }

  function handleChange(q: string) {
    setQuery(q);
    if (debounce.current) clearTimeout(debounce.current);
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/funds/search?q=${encodeURIComponent(q)}&custodian=${encodeURIComponent(custodian())}`);
        const data: FundSuggestion[] = await res.json();
        setSuggestions(data.slice(0, 6));
        setOpen(true);
      } catch { /* ignore */ }
    }, 200);
  }

  async function analyzeFund(fund: FundSuggestion) {
    setQuery(fund.name);
    setOpen(false);
    setSelected(fund);
    setAnalysis(null);
    setError(null);
    setLoading(true);
    const seq = ++requestSeq.current;
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custodian: custodian(), entries: [{ isin: fund.isin, weight: 100 }] }),
      });
      const data = await res.json();
      if (seq !== requestSeq.current) return;
      if (!res.ok) throw new Error(data.error ?? "Okänt fel");
      setAnalysis(data);
    } catch {
      if (seq === requestSeq.current) setError("Kunde inte analysera fonden just nu. Prova igen om en stund.");
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }

  function goToAnalyzer() {
    router.push("/analyze");
  }

  // Panelinnehåll: statiskt exempel tills en fond analyserats
  let panel: React.ReactNode;
  if (loading && selected) {
    panel = <LoadingPanel name={selected.name} />;
  } else if (analysis && selected) {
    const swap = analysis.swapSuggestions?.[0] ?? null;
    const isBest = (analysis.bestInCategory?.length ?? 0) > 0;
    panel = (
      <FundPanelView
        title={selected.name}
        badgeLabel="Din fond"
        live
        cost={fmtPct(analysis.avgCost)}
        ret3yr={{
          text: analysis.weightedReturn3yr !== null ? fmtSigned(analysis.weightedReturn3yr) : "–",
          positive: (analysis.weightedReturn3yr ?? 0) >= 0,
        }}
        swapName={swap ? swap.suggestedFund.name : null}
        reasons={swap ? swapReasons(swap) : []}
        noSwapText={isBest ? "Fonden är redan bäst i sin kategori." : "Vi hittade inget tydligt bättre alternativ i fondens kategori."}
        onCta={goToAnalyzer}
      />
    );
  } else {
    panel = (
      <FundPanelView
        title="Swedbank Robur Global"
        badgeLabel="Exempel"
        live={false}
        cost="1,50%"
        ret3yr={{ text: "+21,4%", positive: true }}
        swapName="SPP Aktiefond Global"
        reasons={[
          { label: "Lägre avgift", value: "0,20% vs 1,50%" },
          { label: "Bättre riskjusterad avkastning" },
        ]}
        onCta={goToAnalyzer}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_28rem] gap-10 lg:gap-16 items-center">

      {/* Vänster: rubrik (server-renderad via children) + sökfält */}
      <div className="max-w-xl">
        {children}

        <div className="mt-8 relative w-full max-w-xl">
          <div className="flex items-stretch bg-white border border-line rounded-[10px] overflow-hidden focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-colors">
            <svg className="w-4 h-4 text-ink-4 self-center ml-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="Sök din fond, t.ex. Länsförsäkringar Global…"
              aria-label="Sök fond"
              className="flex-1 min-w-0 px-3 py-4 text-[15px] text-ink placeholder:text-ink-4 focus:outline-none bg-transparent"
            />
          </div>

          {open && suggestions.length > 0 && (
            <ul className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white border border-line rounded-[10px] overflow-hidden" style={{ boxShadow: "0 8px 24px rgba(16,24,40,.08)" }}>
              {suggestions.map((s, i) => (
                <li key={`${s.isin}-${i}`}>
                  <button
                    type="button"
                    onMouseDown={() => analyzeFund(s)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-section transition-colors"
                  >
                    <span className="font-medium text-ink truncate">{s.name}</span>
                    <span className="text-xs text-ink-4 shrink-0">{s.isin}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {open && query.length >= 2 && suggestions.length === 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white border border-line rounded-[10px] px-4 py-3 text-sm text-ink-3" style={{ boxShadow: "0 8px 24px rgba(16,24,40,.08)" }}>
              Ingen fond hittades för &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-neg">{error}</p>}

        {belowSearch}

        {/* Mobil: panelen under sökfältet — exempel tills en fond analyserats */}
        <div className="lg:hidden mt-6">
          {panel}
        </div>
      </div>

      {/* Höger: panelen — endast desktop */}
      <div className="hidden lg:block">
        {panel}
      </div>

    </div>
  );
}
