"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
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

type VerdictTone = "good" | "warn" | "neutral";

function swapReasonText(swap: SwapSuggestion): string {
  if (swap.improvement.cost !== undefined) {
    return `Lägre avgift: ${fmtPct(fundCost(swap.suggestedFund))} i stället för ${fmtPct(fundCost(swap.currentFund))} per år.`;
  }
  if (swap.improvement.sharpe !== undefined) {
    return "Starkare riskjusterade historiska nyckeltal än den analyserade fonden.";
  }
  if (swap.improvement.return1yr !== undefined) {
    return "Starkare historisk avkastning än den analyserade fonden.";
  }
  return "Starkare helhet i jämförelsen när vi väger samman avgift, avkastning och risk.";
}

function buildFundSummary(analysis: PortfolioAnalysis, swap: SwapSuggestion | null): string {
  // Vid jämförbara alternativ måste fondtexten hänga ihop med jämförelseskälet.
  if (swap) {
    const cost = analysis.avgCost;

    if (swap.improvement.cost !== undefined) {
      return cost !== null
        ? `Avgiften på ${fmtPct(cost)} är hög — det finns billigare alternativ.`
        : "Det finns ett billigare alternativ i samma kategori.";
    }

    const weakness =
      swap.improvement.sharpe !== undefined
        ? "avkastningen i förhållande till risken når inte upp till de bästa i kategorin"
        : swap.improvement.return1yr !== undefined
          ? "avkastningen har varit svagare än de bästa i kategorin"
          : "den når inte riktigt upp till de bästa i sin kategori";

    if (cost === null) return weakness.charAt(0).toUpperCase() + weakness.slice(1) + ".";
    if (cost < 0.5) return `Avgiften är låg (${fmtPct(cost)}), men ${weakness}.`;
    if (cost < 1) return `Avgiften är rimlig (${fmtPct(cost)}), men ${weakness}.`;
    return `Avgiften är hög (${fmtPct(cost)}) och ${weakness}.`;
  }

  if (analysis.avgCost !== null) {
    if (analysis.avgCost < 0.5) return `Låg avgift (${fmtPct(analysis.avgCost)}) och bra förutsättningar för långsiktigt sparande.`;
    if (analysis.avgCost < 1) return `Rimlig avgift (${fmtPct(analysis.avgCost)}), men det kan finnas starkare alternativ.`;
    return `Avgiften på ${fmtPct(analysis.avgCost)} är hög — det finns billigare alternativ.`;
  }

  if (analysis.weightedReturn3yr !== null) {
    if (analysis.weightedReturn3yr >= 25) return `Stark historik med ${fmtSigned(analysis.weightedReturn3yr)} på 3 år.`;
    if (analysis.weightedReturn3yr >= 0) return `Positiv historik (${fmtSigned(analysis.weightedReturn3yr)} på 3 år), men inte i toppklass.`;
    return `Svag historik med ${fmtSigned(analysis.weightedReturn3yr)} på 3 år.`;
  }

  return "Vi har inte tillräckligt med data för att ge fonden ett tydligt omdöme.";
}

function buildFundVerdict(
  analysis: PortfolioAnalysis,
  selected: FundSuggestion,
  swap: SwapSuggestion | null
): { tone: VerdictTone; title: string; comparison: string } {
  const bestMatch = analysis.bestInCategory?.find((fund) => fund.isin === selected.isin);

  if (swap) {
    return {
      tone: "warn",
      title: "Fonden kan förbättras",
      comparison: "Vi hittade ett alternativ med starkare nyckeltal i samma kategori.",
    };
  }

  if (bestMatch) {
    return {
      tone: "good",
      title: "Fonden står sig bra i sin kategori",
      comparison: "Vi hittar inget alternativ som tydligt slår den just nu.",
    };
  }

  return {
    tone: "neutral",
    title: "Fonden klarar sig helt okej",
      comparison: "Den sticker inte ut som bäst i sin kategori, men vi hittar inget tydligt starkare alternativ just nu.",
  };
}

// ── Panelvy — exakt samma layout för exempel och riktigt resultat ─────────────

function FundPanelView({
  title,
  badgeLabel,
  live,
  verdictTone,
  verdictTitle,
  summary,
  comparison,
  swap,
  onCta,
}: {
  title: string;
  badgeLabel: string;
  live: boolean;
  verdictTone: VerdictTone;
  verdictTitle: string;
  summary: string;
  comparison: string;
  swap: SwapSuggestion | null;
  onCta: () => void;
}) {
  const dotColor = {
    good: "bg-pos",
    warn: "bg-warn",
    neutral: "bg-accent",
  }[verdictTone];

  return (
    <div className={`w-full bg-white border border-line rounded-[14px] overflow-hidden${live ? " animate-panel-in" : ""}`} style={PANEL_SHADOW}>
      {/* Fond + badge */}
      <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-b border-line-soft">
        <p className="text-[15px] font-semibold text-ink truncate">{title}</p>
        <span
          className={`text-[11px] font-semibold rounded-lg px-2 py-0.5 shrink-0 border ${
            live ? "text-accent bg-info border-info-line" : "text-ink-4 bg-section border-line-soft"
          }`}
        >
          {badgeLabel}
        </span>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
          <h3 className="text-base font-semibold text-ink leading-snug">{verdictTitle}</h3>
        </div>
        <p className="mt-2 text-sm text-ink-2 leading-relaxed">{summary}</p>

        {swap ? (
          <div className="mt-5 rounded-[12px] bg-section p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4 mb-3">Alternativ i samma kategori</p>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
              <div className="min-w-0 rounded-[10px] bg-white border border-line-soft px-3 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-ink-4 mb-1">Nuvarande</p>
                <p className="text-sm font-semibold text-ink-2 leading-snug break-words">{title}</p>
              </div>
              <div className="hidden sm:flex w-8 h-8 rounded-[10px] bg-white border border-line flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-ink-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
              <div className="min-w-0 rounded-[10px] bg-white border border-pos/15 px-3 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-pos mb-1">Alternativ</p>
                <p className="text-sm font-semibold text-ink leading-snug break-words">{swap.suggestedFund.name}</p>
              </div>
            </div>
            <p className="mt-3 pt-3 border-t border-line-soft text-xs text-ink-2 leading-relaxed">
              {swapReasonText(swap)}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-2 leading-relaxed">{comparison}</p>
        )}

        <button
          type="button"
          onClick={onCta}
          className="mt-5 w-full bg-accent hover:bg-accent-hover active:bg-accent-press text-white text-sm font-semibold py-3 rounded-[10px] transition-colors"
        >
          Analysera hela din portfölj →
        </button>
      </div>
    </div>
  );
}

function LoadingPanel({ name }: { name: string }) {
  return (
    <div className="w-full min-h-[160px] bg-white border border-line rounded-[14px] px-5 py-8 flex flex-col items-center justify-center gap-3" style={PANEL_SHADOW}>
      <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      <p className="text-sm text-ink-2 text-center">Analyserar <span className="font-semibold text-ink">{name}</span>…</p>
    </div>
  );
}

// ── Huvudkomponent: sökfältet är den enda dominanta ytan, allt annat viker undan ──

const PLACEHOLDER_EXAMPLES = [
  "Länsförsäkringar Global Index",
  "Avanza Zero",
  "Swedbank Robur Ny Teknik",
  "AMF Räntefond Lång",
];

export default function HeroDemo({ children, belowSearch }: { children: React.ReactNode; belowSearch?: React.ReactNode }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderText, setPlaceholderText] = useState("");
  const [placeholderDeleting, setPlaceholderDeleting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
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

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Skrivmaskinseffekt i tomt sökfält: fondnamnet skrivs tecken för tecken med
  // ojämn rytm, pausar, raderas snabbare och nästa namn börjar. Pausas helt
  // så fort användaren skriver, och stängs av vid prefers-reduced-motion.
  useEffect(() => {
    if (query || reducedMotion) return;
    const full = PLACEHOLDER_EXAMPLES[placeholderIdx];

    if (!placeholderDeleting) {
      if (placeholderText === full) {
        const t = setTimeout(() => setPlaceholderDeleting(true), 2200);
        return () => clearTimeout(t);
      }
      const t = setTimeout(
        () => setPlaceholderText(full.slice(0, placeholderText.length + 1)),
        placeholderText.length === 0 ? 600 : 55 + Math.random() * 75
      );
      return () => clearTimeout(t);
    }

    if (placeholderText === "") {
      setPlaceholderDeleting(false);
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length);
      return;
    }
    const t = setTimeout(() => setPlaceholderText(placeholderText.slice(0, -1)), 32);
    return () => clearTimeout(t);
  }, [query, reducedMotion, placeholderText, placeholderDeleting, placeholderIdx]);

  function handleChange(q: string) {
    setQuery(q);
    if (debounce.current) clearTimeout(debounce.current);
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/funds/search?q=${encodeURIComponent(q)}&custodian=${encodeURIComponent(custodian())}`);
        const data: FundSuggestion[] = await res.json();
        setSuggestions(data.slice(0, 50));
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

  // Resultatpanel: visas bara efter faktisk sökning/analys — inget påhittat exempel
  let panel: React.ReactNode;
  if (loading && selected) {
    panel = <LoadingPanel name={selected.name} />;
  } else if (analysis && selected) {
    const swap = analysis.swapSuggestions?.[0] ?? null;
    const verdict = buildFundVerdict(analysis, selected, swap);
    panel = (
      <FundPanelView
        title={selected.name}
        badgeLabel="Din fond"
        live
        verdictTone={verdict.tone}
        verdictTitle={verdict.title}
        summary={buildFundSummary(analysis, swap)}
        comparison={verdict.comparison}
        swap={swap}
        onCta={goToAnalyzer}
      />
    );
  } else {
    panel = null;
  }

  return (
    <div className="w-full flex flex-col items-center text-center">
      {/* Rubrikens position styrs enbart av sektionens topp-padding — innehåll som
          dyker upp nedanför (resultatpanelen) flödar nedåt och flyttar aldrig rubriken. */}
      {children}

      <div className="mt-8 sm:mt-10 relative w-full max-w-[720px]">
          <div
            className="flex items-center gap-3.5 bg-[rgba(255,255,255,0.72)] backdrop-blur-[12px] border-[1.5px] border-[rgba(255,255,255,0.7)] rounded-[14px] px-5 sm:px-7 py-4 sm:py-[22px] focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 transition-colors"
            style={{ boxShadow: "0 12px 32px rgba(23,33,43,.1)" }}
          >
            <Search className="w-[22px] h-[22px] text-[#8b95a1] shrink-0" strokeWidth={2} aria-hidden="true" />
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={query}
                onChange={(e) => handleChange(e.target.value)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                aria-label="Sök fond"
                className="w-full text-left text-[16px] sm:text-[18px] text-ink focus:outline-none bg-transparent"
              />
              {!query && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 flex w-full items-center overflow-hidden whitespace-nowrap text-[16px] sm:text-[18px] text-[#8b95a1]"
                >
                  Sök din fond, t.ex.&nbsp;
                  {reducedMotion ? (
                    <span className="truncate">{PLACEHOLDER_EXAMPLES[0]}</span>
                  ) : (
                    <>
                      {placeholderText}
                      <span className="animate-caret ml-px inline-block h-[1.15em] w-px shrink-0 bg-[#8b95a1]" />
                    </>
                  )}
                </span>
              )}
            </div>
          </div>

          {open && suggestions.length > 0 && (
            <ul
              data-testid="fund-suggestions"
              className="absolute z-20 top-full left-0 right-0 mt-2 max-h-[min(52vh,360px)] overflow-y-auto overscroll-contain bg-white border border-line rounded-[14px] text-left"
              style={{ boxShadow: "0 8px 24px rgba(16,24,40,.08)", WebkitOverflowScrolling: "touch" }}
            >
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
            <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-line rounded-[14px] px-4 py-3 text-sm text-ink-3 text-left" style={{ boxShadow: "0 8px 24px rgba(16,24,40,.08)" }}>
              Vi hittade ingen fond som matchar &ldquo;{query}&rdquo;
            </div>
          )}
      </div>

      {error && <p className="mt-3 text-sm text-neg">{error}</p>}

      {panel && <div className="mt-5 sm:mt-6 w-full max-w-[720px] text-left">{panel}</div>}

      {belowSearch}
    </div>
  );
}
