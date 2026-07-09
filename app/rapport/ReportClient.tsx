"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PortfolioAnalysis, SwapSuggestion } from "@/lib/analysis";
import { decodePayload } from "@/lib/report-url";
import DonutChart from "@/components/ui/DonutChart";
import { Building2, CheckCircle2, Download, GripVertical, Link2, Maximize2, Pencil, Plus, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import FondguideTab  from "./tabs/FondguideTab";
import ScenarioTab   from "./tabs/ScenarioTab";

// ── Types ─────────────────────────────────────────────────────────────────────

type FundEntry   = { isin: string; weight: number };
type AppliedSwap = { fromIsin: string; toIsin: string; fromName: string; toName: string };

type SectionId =
  | "summary" | "advisor-comment" | "holdings"
  | "metrics" | "asset-allocation"
  | "management" | "swaps" | "fee-calculator" | "projection";

// A row holds 1 or 2 section IDs. Two IDs = half-width side by side.
type LayoutRow = { ids: [SectionId] | [SectionId, SectionId] };

const SECTION_LABELS: Record<SectionId, string> = {
  "summary":          "Sammanfattning",
  "advisor-comment":  "Rådgivarens kommentar",
  "holdings":         "Portföljinnehav",
  "metrics":          "Nyckeltal",
  "asset-allocation": "Tillgångsfördelning",
  "management":       "Förvaltningsstil",
  "swaps":            "Fondgranskning",
  "fee-calculator":   "Avgiftsräknare",
  "projection":       "Tidssimulator",
};

const ALL_SECTION_IDS: SectionId[] = [
  "summary", "advisor-comment", "holdings",
  "metrics", "asset-allocation",
  "management", "swaps", "fee-calculator", "projection",
];

const DEFAULT_LAYOUT: LayoutRow[] = [
  { ids: ["summary"] },
  { ids: ["advisor-comment"] },
  { ids: ["holdings"] },
  { ids: ["swaps"] },
  { ids: ["fee-calculator"] },
  { ids: ["projection"] },
];

// ── URL decoding ──────────────────────────────────────────────────────────────

function parseParams(): { custodian: string; funds: FundEntry[]; amount?: number; client?: string; comment?: string } | null {
  try {
    const p = new URLSearchParams(window.location.search).get("p");
    if (!p) return null;
    const obj = decodePayload(p) as Record<string, unknown>;
    if (!obj?.custodian || !Array.isArray(obj.funds) || !obj.funds.length) return null;
    return {
      custodian: obj.custodian as string,
      funds:     obj.funds as FundEntry[],
      amount:    typeof obj.amount   === "number" ? obj.amount   : undefined,
      client:    typeof obj.client   === "string" ? obj.client   : undefined,
      comment:   typeof obj.comment  === "string" ? obj.comment  : undefined,
    };
  } catch { return null; }
}

function buildNameMap(analysis: PortfolioAnalysis): Map<string, string> {
  const m = new Map<string, string>();
  for (const s of analysis.swapSuggestions ?? []) {
    m.set(s.currentFund.isin, s.currentFund.name);
    m.set(s.suggestedFund.isin, s.suggestedFund.name);
  }
  for (const b of analysis.bestInCategory ?? []) m.set(b.isin, b.fundName);
  return m;
}

function fmtKr(n: number): string {
  return Math.round(n).toLocaleString("sv-SE") + " kr";
}

// ── Metric helpers ────────────────────────────────────────────────────────────

type Rating = "good" | "ok" | "bad" | "neutral";

function rate(key: string, v: number | null): Rating {
  if (v === null) return "neutral";
  if (key === "cost")    return v < 0.3 ? "good" : v < 0.8 ? "ok" : "bad";
  if (key === "return1yr" || key === "return3yr") return v > 10 ? "good" : v > 3 ? "ok" : "bad";
  if (key === "sharpe")  return v > 0.7 ? "good" : v > 0.3 ? "ok" : "bad";
  return "neutral";
}

const RATING_VALUE: Record<Rating, string> = {
  good: "text-emerald-600", ok: "text-amber-600", bad: "text-red-600", neutral: "text-slate-900",
};

function MetricCard({ label, value, formatted, sub, ratingKey, info }: {
  label: string; value: number | null; formatted: string; sub: string; ratingKey: string; info: string;
}) {
  const r = rate(ratingKey, value);
  return (
    <div className="relative group bg-slate-50 rounded-xl p-4">
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 bg-slate-700/90 text-white text-xs rounded-xl px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-center leading-snug shadow-md">
        {info}
      </span>
      <div className="flex items-center gap-1 mb-1">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <span className="w-3 h-3 rounded-full bg-slate-300 text-[9px] text-white flex items-center justify-center cursor-default">i</span>
      </div>
      <p className={cn("text-2xl font-bold", RATING_VALUE[r])}>{formatted}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

// ── Fee calculator ────────────────────────────────────────────────────────────

function StatRow({ label, value, accent }: { label: string; value: string; accent?: "good" | "bad" }) {
  return (
    <div className="flex items-center justify-between text-sm py-0.5">
      <span className="text-slate-500">{label}</span>
      <span className={cn(
        "font-semibold",
        accent === "good" ? "text-emerald-700" : accent === "bad" ? "text-red-600" : "text-slate-900"
      )}>{value}</span>
    </div>
  );
}

function FeeCalculatorSection({ amount, analysis }: { amount: number; analysis: PortfolioAnalysis }) {
  const sm = analysis.suggestedMetrics;

  // Use annualized 3yr return (same basis as Tidssimulator)
  const annualCurr3 = analysis.weightedReturn3yr != null ? toAnnual(analysis.weightedReturn3yr, 3) : null;
  const annualSugg3 = sm?.weightedReturn3yr != null ? toAnnual(sm.weightedReturn3yr, 3) : null;

  const feeSavingsKr = analysis.avgCost != null && sm?.avgCost != null
    ? (analysis.avgCost - sm.avgCost) / 100 * amount : null;
  const returnGainKr = annualCurr3 != null && annualSugg3 != null
    ? (annualSugg3 - annualCurr3) / 100 * amount : null;
  const totalGainKr  = feeSavingsKr != null && returnGainKr != null ? feeSavingsKr + returnGainKr : null;

  const annualFee = analysis.avgCost != null ? amount * analysis.avgCost / 100 : null;
  const sugFee    = sm?.avgCost      != null ? amount * sm.avgCost / 100       : null;

  function fmtGain(v: number | null) {
    if (v == null) return "–";
    return `${v >= 0 ? "+" : ""}${Math.round(v).toLocaleString("sv-SE")} kr`;
  }
  function gainColor(v: number | null) {
    if (v == null) return "text-slate-400";
    return v >= 0 ? "text-green-700" : "text-red-600";
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avgiftsräknare</p>
          <h2 className="text-base font-bold text-slate-900 mt-0.5">Vad kostar din portfölj?</h2>
        </div>
      </div>

      {/* Cost detail rows */}
      <div className={cn("grid gap-4", sm ? "sm:grid-cols-2" : "")}>
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Nuvarande portfölj</p>
          <StatRow label="Avgift per år" value={annualFee != null ? fmtKr(annualFee) : "–"} accent={annualFee != null && annualFee > 3000 ? "bad" : undefined} />
          <StatRow label="Avgift i %" value={analysis.avgCost != null ? `${analysis.avgCost.toFixed(2)}% / år` : "–"} />
        </div>
        {sm && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-3">Alternativt scenario</p>
            <StatRow label="Avgift per år" value={sugFee != null ? fmtKr(sugFee) : "–"} accent="good" />
            <StatRow label="Avgift i %" value={sm.avgCost != null ? `${sm.avgCost.toFixed(2)}% / år` : "–"} />
          </div>
        )}
      </div>

      {/* Gain summary — same style as AnalyzeClient */}
      {sm && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-bold text-green-900">Uppskattad vinst per år</p>
            <span className="text-xs text-slate-500 italic">
              Beräknat på en investering av {amount.toLocaleString("sv-SE")} kr
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Avgiftsskillnad</p>
              <p className={cn("font-bold text-sm", gainColor(feeSavingsKr))}>{fmtGain(feeSavingsKr)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Avkastningsskillnad</p>
              <p className={cn("font-bold text-sm", gainColor(returnGainKr))}>{fmtGain(returnGainKr)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Totalt</p>
              <p className={cn("font-bold text-base", gainColor(totalGainKr))}>{fmtGain(totalGainKr)}</p>
            </div>
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-400 leading-relaxed">
        Avkastningsskillnad baseras på annualiserad 3-årsavkastning viktat efter portföljvikterna. Historisk avkastning är ingen garanti för framtida avkastning.
      </p>
    </section>
  );
}

// ── Projection chart ──────────────────────────────────────────────────────────

// Convert total N-year return to annualized rate
function toAnnual(totalPct: number, years: number): number {
  return (Math.pow(1 + totalPct / 100, 1 / years) - 1) * 100;
}

function ProjectionSection({ amount, analysis }: { amount: number; analysis: PortfolioAnalysis }) {
  const [years, setYears] = useState(9);

  // weightedReturn3yr is TOTAL over 3 years → convert to annual rate
  const currentRate = analysis.weightedReturn3yr != null
    ? Math.round(toAnnual(analysis.weightedReturn3yr, 3) * 100) / 100
    : Math.round((analysis.weightedReturn1yr ?? 0) * 100) / 100;

  const sm = analysis.suggestedMetrics;
  const suggestedRate = sm?.weightedReturn3yr != null
    ? Math.round(toAnnual(sm.weightedReturn3yr, 3) * 100) / 100
    : sm?.weightedReturn1yr != null
      ? Math.round(sm.weightedReturn1yr * 100) / 100
      : null;

  const pts = Array.from({ length: years + 1 }, (_, y) => ({
    y,
    curr: amount * Math.pow(1 + currentRate / 100, y),
    sugg: suggestedRate !== null ? amount * Math.pow(1 + suggestedRate / 100, y) : null,
  }));

  const finalCurr = pts[years].curr;
  const finalSugg = pts[years].sugg;

  // SVG layout
  const W = 640, H = 200;
  const PAD = { t: 12, r: 16, b: 36, l: 72 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;

  const maxVal = Math.max(...pts.map(p => Math.max(p.curr, p.sugg ?? 0)));
  const minVal = amount;

  const tx = (yr: number) => PAD.l + (yr / years) * cW;
  const ty = (v: number)  => {
    if (maxVal === minVal) return PAD.t + cH / 2;
    return PAD.t + cH - ((v - minVal) / (maxVal - minVal)) * cH;
  };

  const polyline = (getter: (p: typeof pts[0]) => number | null) =>
    pts.filter(p => getter(p) !== null).map(p => `${tx(p.y)},${ty(getter(p)!)}`).join(" ");

  const areaPath = (getter: (p: typeof pts[0]) => number | null) => {
    const valid = pts.filter(p => getter(p) !== null);
    if (!valid.length) return "";
    const bottom = PAD.t + cH;
    const line = valid.map(p => `${tx(p.y)},${ty(getter(p)!)}`).join(" L ");
    return `M ${tx(0)},${bottom} L ${line} L ${tx(years)},${bottom} Z`;
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    v: minVal + (maxVal - minVal) * f,
    y: PAD.t + cH * (1 - f),
  }));
  const xTicks = [0, Math.round(years * 0.25), Math.round(years * 0.5), Math.round(years * 0.75), years];

  function fmtAxis(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} Mkr`;
    if (v >= 1_000)     return `${Math.round(v / 1000)} tkr`;
    return `${Math.round(v)} kr`;
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tidssimulator</p>
          <h2 className="text-base font-bold text-slate-900 mt-0.5">Värdeutveckling över tid</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Beräknad avkastning: {currentRate.toFixed(2)}% / år (annualiserad 3-årsavkastning)
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
          <span className="text-xs text-slate-400">3 år</span>
          <input
            type="range" min={3} max={15} step={1} value={years}
            onChange={e => setYears(Number(e.target.value))}
            className="w-32 accent-blue-500 cursor-pointer"
          />
          <span className="text-xs text-slate-400">15 år</span>
          <span className="text-sm font-bold text-blue-600 w-10 text-right tabular-nums">{years} år</span>
        </div>
      </div>

      {/* SVG chart */}
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[320px]">
          <defs>
            <linearGradient id="rp-grad-curr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rp-grad-sugg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid + Y labels */}
          {yTicks.map(({ v, y }, i) => (
            <g key={i}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#F1F5F9" strokeWidth={1} />
              <text x={PAD.l - 6} y={y + 3.5} textAnchor="end" fontSize={9} fill="#94A3B8">{fmtAxis(v)}</text>
            </g>
          ))}

          {/* X labels */}
          {xTicks.map(yr => (
            <text key={yr} x={tx(yr)} y={H - 8} textAnchor="middle" fontSize={9} fill="#94A3B8">{yr} år</text>
          ))}

          {/* Area fills */}
          {finalSugg !== null && <path d={areaPath(p => p.sugg)} fill="url(#rp-grad-sugg)" />}
          <path d={areaPath(p => p.curr)} fill="url(#rp-grad-curr)" />

          {/* Lines */}
          {finalSugg !== null && (
            <polyline points={polyline(p => p.sugg)} fill="none" stroke="#10B981" strokeWidth={2} strokeLinejoin="round" strokeDasharray="6 3" />
          )}
          <polyline points={polyline(p => p.curr)} fill="none" stroke="#3B82F6" strokeWidth={2} strokeLinejoin="round" />

          {/* End dots */}
          {finalSugg !== null && <circle cx={tx(years)} cy={ty(finalSugg)} r={4} fill="#10B981" />}
          <circle cx={tx(years)} cy={ty(finalCurr)} r={4} fill="#3B82F6" />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-5">
        <div className="flex items-center gap-2.5 text-sm">
          <div className="w-5 h-px bg-slate-300 shrink-0" style={{ borderTop: "2px dashed #CBD5E1" }} />
          <span className="text-slate-400">Investerat belopp</span>
          <span className="font-semibold text-slate-500">{fmtKr(amount)}</span>
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <div className="w-5 h-0.5 bg-blue-500 rounded shrink-0" />
          <span className="text-slate-600">Nuvarande portfölj</span>
          <span className="font-bold text-slate-900">{fmtKr(finalCurr)}</span>
        </div>
        {finalSugg !== null && (
          <div className="flex items-center gap-2.5 text-sm">
            <svg width="20" height="2" className="shrink-0">
              <line x1="0" y1="1" x2="20" y2="1" stroke="#10B981" strokeWidth="2" strokeDasharray="5 2" />
            </svg>
            <span className="text-slate-600">Alternativt scenario</span>
            <span className="font-bold text-emerald-600">{fmtKr(finalSugg)}</span>
            {finalSugg > finalCurr && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                +{fmtKr(finalSugg - finalCurr)}
              </span>
            )}
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-400">
        Historisk avkastning är ingen garanti för framtida avkastning.
      </p>
    </section>
  );
}

// ── Swap card ─────────────────────────────────────────────────────────────────

function SwapCard({ swap, onAccept, readonly = false }: { swap: SwapSuggestion; onAccept: () => void; readonly?: boolean }) {
  const [accepted, setAccepted] = useState(false);
  function handleAccept() { setAccepted(true); onAccept(); }

  const chips: string[] = [];
  if (swap.improvement.sharpe)    chips.push(`Sharpe +${swap.improvement.sharpe.toFixed(2)}`);
  if (swap.improvement.cost)      chips.push(`Avgift −${swap.improvement.cost.toFixed(2)}%`);
  if (swap.improvement.return1yr) chips.push(`Avk. +${swap.improvement.return1yr.toFixed(1)}%`);

  return (
    <div className={cn("border rounded-xl p-4 space-y-2 transition-colors", accepted ? "bg-emerald-50/60 border-emerald-200" : "bg-slate-50 border-slate-200")}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nuvarande fond</p>
          <p className="font-semibold text-sm text-slate-900 break-words">{swap.currentFund.name}</p>
          <p className="text-xs text-slate-400">{swap.currentFund.isin}</p>
        </div>
        <span className="text-slate-400 text-lg self-start sm:mt-3"><span className="sm:hidden">↓</span><span className="hidden sm:inline">→</span></span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">{swap.consolidate ? "Alternativ viktning" : "Alternativ fond"}</p>
          <p className="font-semibold text-sm text-slate-900 break-words">{swap.suggestedFund.name}</p>
          <p className="text-xs text-slate-400">{swap.suggestedFund.isin}</p>
        </div>
      </div>
      {swap.similarityNote && <p className="text-xs text-slate-400 italic">{swap.similarityNote}</p>}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap gap-1.5">
          {chips.map(c => (
            <span key={c} className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">{c}</span>
          ))}
        </div>
        {!readonly && (
          <button
            onClick={handleAccept} disabled={accepted}
            className={cn("shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all", accepted ? "text-emerald-600 cursor-default" : "bg-blue-600 hover:bg-blue-700 text-white")}
          >
            {accepted ? "Tillagd ✓" : "Lägg till i jämförelse"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Editable summary ─────────────────────────────────────────────────────────

function EditableSummary({ defaultText, readonly = false }: { defaultText: string; readonly?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText]       = useState(defaultText);
  const [draft, setDraft]     = useState(defaultText);

  function startEdit() { setDraft(text); setEditing(true); }
  function save()      { setText(draft); setEditing(false); }
  function cancel()    { setEditing(false); }

  return (
    <section className="bg-blue-50 border border-blue-100 rounded-2xl p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h2 className="text-base font-bold text-blue-900">Sammanfattning</h2>
        {!editing && !readonly && (
          <button
            onClick={startEdit}
            className="no-print flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors shrink-0 mt-0.5"
            title="Redigera sammanfattning"
          >
            <Pencil className="w-3 h-3" />
            Redigera
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={5}
            className="w-full text-sm text-blue-900 bg-white/70 border border-blue-200 rounded-xl px-3 py-2.5 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              Spara
            </button>
            <button
              onClick={cancel}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
            >
              Avbryt
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-blue-900 leading-relaxed">{text}</p>
      )}
    </section>
  );
}

// ── Section content ───────────────────────────────────────────────────────────

type SectionData = {
  funds: FundEntry[];
  nameMap: Map<string, string>;
  analysis: PortfolioAnalysis;
  amount: number | undefined;
  comment: string | undefined;
  today: string;
  readonly: boolean;
  appliedSwaps: AppliedSwap[];
  onApplySwap: (a: string, b: string, c: string, d: string) => void;
};

function SectionContent({ id, data }: { id: SectionId; data: SectionData }) {
  const { funds, nameMap, analysis, amount, comment, today, readonly, appliedSwaps, onApplySwap } = data;

  switch (id) {
    // ── Holdings ──────────────────────────────────────────────────────────────
    case "holdings": return (
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Portföljinnehav</p>
        <div className="space-y-0">
          <div className="hidden sm:grid grid-cols-[1fr_auto_80px] gap-3 text-xs font-semibold text-slate-400 px-1 pb-2 border-b border-slate-100">
            <span>Fond</span><span>ISIN</span><span className="text-right">Vikt</span>
          </div>
          {funds.map(f => {
            const name = nameMap.get(f.isin);
            return (
              <div key={f.isin} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_80px] gap-3 items-center py-2.5 border-b border-slate-50 last:border-0">
                <div className="min-w-0">
                  {name ? <p className="text-sm font-medium text-slate-900 truncate">{name}</p> : <p className="text-sm text-slate-400 font-mono">{f.isin}</p>}
                  {name && <p className="text-xs text-slate-400 font-mono mt-0.5 sm:hidden">{f.isin}</p>}
                </div>
                <p className="text-xs text-slate-400 font-mono hidden sm:block">{f.isin}</p>
                <div className="flex items-center gap-2 justify-end">
                  <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(f.weight, 100)}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 tabular-nums">{f.weight.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );

    // ── Summary (inline-editable) ─────────────────────────────────────────────
    case "summary": return <EditableSummary defaultText={analysis.summaryText} readonly={readonly} />;

    // ── Advisor comment ───────────────────────────────────────────────────────
    case "advisor-comment": {
      if (!comment) return null;
      return (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex">
            <div className="w-1 bg-blue-500 shrink-0" />
            <div className="px-5 sm:px-6 py-5 space-y-3 flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rådgivarens kommentar</p>
              <p className="text-sm text-slate-700 leading-relaxed">{comment}</p>
              <p className="text-xs text-slate-400">— Ditt företag · {today}</p>
            </div>
          </div>
        </section>
      );
    }

    // ── Metrics ───────────────────────────────────────────────────────────────
    case "metrics": return (
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Nyckeltal</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <MetricCard label="Snittavgift"     value={analysis.avgCost}           formatted={analysis.avgCost           !== null ? `${analysis.avgCost.toFixed(2)}%`          : "–"} sub="per år"       ratingKey="cost"      info="Den genomsnittliga årliga avgiften viktat efter din fördelning." />
            <MetricCard label="Avkastning 1 år" value={analysis.weightedReturn1yr} formatted={analysis.weightedReturn1yr !== null ? `${analysis.weightedReturn1yr.toFixed(1)}%` : "–"} sub="viktad"       ratingKey="return1yr" info="Portföljens viktade avkastning de senaste 12 månaderna." />
            <MetricCard label="Avkastning 3 år" value={analysis.weightedReturn3yr} formatted={analysis.weightedReturn3yr !== null ? `${analysis.weightedReturn3yr.toFixed(1)}%` : "–"} sub="totalt"       ratingKey="return3yr" info="Portföljens viktade totalavkastning de senaste 3 åren." />
            <MetricCard label="Sharpe 3 år"     value={analysis.weightedSharpe}    formatted={analysis.weightedSharpe    !== null ? analysis.weightedSharpe.toFixed(2)          : "–"} sub="riskjusterad" ratingKey="sharpe"    info="Avkastning i förhållande till risk. Högre är bättre." />
          </div>
          {(analysis.concentrationWarnings?.length ?? 0) > 0 && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-800">Koncentrationsrisk</p>
                {analysis.concentrationWarnings.map(w => (
                  <p key={w.category} className="text-sm text-amber-700 mt-0.5">{w.weight.toFixed(0)}% i {w.category.toLowerCase()} — överväg att sprida risken.</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    );

    // ── Asset allocation donut (same style as BuilderClient) ────────────────
    case "asset-allocation": {
      const slices   = (analysis.detailedBreakdown ?? []).map(c => ({ label: c.label, weight: c.weight }));
      const equityPct = Math.round(analysis.categoryBreakdown?.find(c => c.label === "Aktiefonder")?.weight ?? 0);
      return (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 h-full">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Tillgångsfördelning</p>
          <DonutChart
            slices={slices}
            centerLabel={`${equityPct}%`}
            centerSub="Aktier"
            size={160} thickness={24} horizontal
          />
          <p className="text-[10px] text-slate-400 leading-snug mt-2">* Fördelning baseras på fondkategori, inte underliggande innehav.</p>
        </section>
      );
    }

    // ── Fee calculator ────────────────────────────────────────────────────────
    case "fee-calculator":
      return amount ? <FeeCalculatorSection amount={amount} analysis={analysis} /> : null;

    // ── Projection ────────────────────────────────────────────────────────────
    case "projection":
      return amount ? <ProjectionSection amount={amount} analysis={analysis} /> : null;

    // ── Management ────────────────────────────────────────────────────────────
    case "management": {
      const active  = analysis.managementBreakdown.active;
      const passive = analysis.managementBreakdown.passive;
      const unknown = analysis.managementBreakdown.unknown > 1 ? analysis.managementBreakdown.unknown : 0;
      const segments = [
        { label: "Aktivt förvaltad", value: active,  color: "bg-blue-500" },
        { label: "Passiv / index",   value: passive, color: "bg-emerald-500" },
        ...(unknown > 0 ? [{ label: "Okänd", value: unknown, color: "bg-slate-300" }] : []),
      ].filter(s => s.value > 0);
      return (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Förvaltningsstil</p>
          <div className="space-y-3">
            <div className="flex h-5 rounded-full overflow-hidden gap-0.5">
              {segments.map(s => (
                <div key={s.label} className={cn("h-full transition-all duration-700", s.color)} style={{ width: `${s.value}%` }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {segments.map(s => (
                <div key={s.label} className="flex items-center gap-2 text-sm">
                  <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", s.color)} />
                  <span className="text-slate-600">{s.label}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{s.value.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    // ── Fondgranskning (swaps + best-in-category) ─────────────────────────────
    case "swaps": {
      const hasSwaps = (analysis.swapSuggestions?.length ?? 0) > 0;
      const hasBest  = (analysis.bestInCategory?.length ?? 0) > 0;
      if (!hasSwaps && !hasBest && appliedSwaps.length === 0) return null;
      return (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-5">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fondgranskning</p>
            <h2 className="text-base font-bold text-slate-900 mt-1">Analys per fond</h2>
            <p className="text-sm text-slate-500 mt-0.5">Fonder med jämförbara alternativ i samma kategori, och fonder som redan rankas högst i sin kategori.</p>
          </div>

          {/* Applied swaps */}
          {appliedSwaps.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 sm:p-4 space-y-2">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Medtagna i jämförelsen</p>
              {appliedSwaps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-medium text-emerald-900">{s.fromName}</span>
                  <span className="text-emerald-400">→</span>
                  <span className="font-medium text-emerald-900">{s.toName}</span>
                </div>
              ))}
            </div>
          )}

          {/* Swap suggestions */}
          {hasSwaps && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500">Jämförbart alternativ</p>
              {(analysis.swapSuggestions ?? []).map((swap, i) => (
                <SwapCard key={`${swap.currentFund.isin}-${i}`} swap={swap} readonly={readonly} onAccept={() => onApplySwap(swap.currentFund.isin, swap.suggestedFund.isin, swap.currentFund.name, swap.suggestedFund.name)} />
              ))}
            </div>
          )}

          {/* Best in category */}
          {hasBest && (
            <div className={cn("space-y-2", hasSwaps && "pt-4 border-t border-slate-100")}>
              <p className="text-xs font-semibold text-slate-500">Redan bäst i sin kategori</p>
              {analysis.bestInCategory.map(f => (
                <div key={f.isin} className="flex items-center justify-between text-sm gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-medium text-slate-900 truncate">{f.fundName}</span>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{f.category}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }

    default: return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ReportClient() {
  const [params, setParams]       = useState<{ custodian: string; funds: FundEntry[]; amount?: number; client?: string; comment?: string } | null | "invalid">(null);
  const [funds, setFunds]         = useState<FundEntry[]>([]);
  const [custodian, setCustodian] = useState("");
  const [amount, setAmount]       = useState<number | undefined>();
  const [client, setClient]       = useState<string | undefined>();
  const [comment, setComment]     = useState<string | undefined>();
  const [analysis, setAnalysis]   = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [appliedSwaps, setAppliedSwaps] = useState<AppliedSwap[]>([]);
  const [nameMap, setNameMap]     = useState<Map<string, string>>(new Map());

  // Tab navigation
  type TabId = "analysis" | "fondguide" | "scenario";
  const [activeTab, setActiveTab] = useState<TabId>("analysis");

  // Customer read-only mode: ?kund=1
  const [isCustomerView, setIsCustomerView] = useState(false);
  useEffect(() => {
    setIsCustomerView(new URLSearchParams(window.location.search).get("kund") === "1");
  }, []);

  // Share link — adds kund=1 + encodes current layout so recipient sees the same view
  const [copied, setCopied] = useState(false);
  function copyLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("kund", "1");
    url.searchParams.set("layout", btoa(JSON.stringify(layout)));
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Layout editor
  const [layout, setLayout]         = useState<LayoutRow[]>(DEFAULT_LAYOUT);
  const [editMode, setEditMode]     = useState(false);
  const [dragIdx, setDragIdx]       = useState<number | null>(null);
  const [dropIdx, setDropIdx]       = useState<number | null>(null);
  const [dropMode, setDropMode]     = useState<"reorder" | "pair">("reorder");
  const [panelOpen, setPanelOpen]   = useState(false);
  const [panelDragId, setPanelDragId] = useState<SectionId | null>(null);
  const [stripDropIdx, setStripDropIdx] = useState<number | null>(null);
  const panelRef                    = useRef<HTMLDivElement>(null);

  const activeSectionIds = layout.flatMap(r => r.ids);
  const hiddenSectionIds = ALL_SECTION_IDS.filter(id => !activeSectionIds.includes(id));

  function removeRow(rowIdx: number) {
    setLayout(prev => prev.filter((_, i) => i !== rowIdx));
  }

  function splitRow(rowIdx: number) {
    setLayout(prev => prev.flatMap((row, i) => {
      if (i !== rowIdx || row.ids.length !== 2) return [row];
      return row.ids.map(id => ({ ids: [id] as [SectionId] }));
    }));
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, rowIdx: number) {
    e.preventDefault();
    setDropIdx(rowIdx);
    const rect = e.currentTarget.getBoundingClientRect();
    const relY  = (e.clientY - rect.top) / rect.height;
    setDropMode(relY > 0.25 && relY < 0.75 ? "pair" : "reorder");
  }

  function handleStripDragOver(e: React.DragEvent<HTMLDivElement>, insertAt: number) {
    e.preventDefault();
    e.stopPropagation();
    setStripDropIdx(insertAt);
    setDropIdx(null);
  }

  function handleStripDrop(e: React.DragEvent<HTMLDivElement>, insertAt: number) {
    e.preventDefault();
    if (panelDragId === null) return;
    setLayout(prev => {
      const next = [...prev];
      next.splice(insertAt, 0, { ids: [panelDragId] });
      return next;
    });
    setPanelDragId(null);
    setStripDropIdx(null);
    setDropIdx(null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, toIdx: number) {
    e.preventDefault();

    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); setDropIdx(null); return; }

    if (dropMode === "pair") {
      const from = layout[dragIdx];
      const to   = layout[toIdx];
      if (from.ids.length === 1 && to.ids.length === 1) {
        const next = layout.filter((_, i) => i !== dragIdx);
        const adjustedTo = toIdx > dragIdx ? toIdx - 1 : toIdx;
        next[adjustedTo] = { ids: [to.ids[0], from.ids[0]] };
        setLayout(next);
        setDragIdx(null); setDropIdx(null);
        return;
      }
    }
    // Reorder
    const next = [...layout];
    const [item] = next.splice(dragIdx, 1);
    next.splice(toIdx, 0, item);
    setLayout(next);
    setDragIdx(null); setDropIdx(null);
  }

  useEffect(() => {
    const p = parseParams();
    if (!p) { setParams("invalid"); return; }
    setParams(p);
    setFunds(p.funds);
    setCustodian(p.custodian);
    setAmount(p.amount);
    setClient(p.client);
    setComment(p.comment);
    const layoutParam = new URLSearchParams(window.location.search).get("layout");
    if (layoutParam) {
      try { setLayout(JSON.parse(atob(layoutParam)) as LayoutRow[]); } catch {}
    }
  }, []);

  const analyze = useCallback(async (entries: FundEntry[], cust: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custodian: cust, entries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Okänt fel");
      setAnalysis(data);
      setNameMap(buildNameMap(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (params && params !== "invalid") analyze(params.funds, params.custodian);
  }, [params, analyze]);

  function applySwap(fromIsin: string, toIsin: string, fromName: string, toName: string) {
    const wm = new Map(funds.map(f => [f.isin, f.weight]));
    wm.set(toIsin, (wm.get(toIsin) ?? 0) + (wm.get(fromIsin) ?? 0));
    wm.delete(fromIsin);
    const newFunds = Array.from(wm.entries()).map(([isin, weight]) => ({ isin, weight }));
    setFunds(newFunds);
    setAppliedSwaps(prev => [...prev, { fromIsin, toIsin, fromName, toName }]);
    analyze(newFunds, custodian);
  }

  const CUSTODIAN_LABEL: Record<string, string> = { avanza: "Avanza", nordnet: "Nordnet", "övrigt": "Övrigt" };
  const custodianLabel = CUSTODIAN_LABEL[custodian] ?? custodian;
  const today          = new Date().toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" });

  const sectionData: SectionData = { funds, nameMap, analysis: analysis!, amount, comment, today, readonly: isCustomerView, appliedSwaps, onApplySwap: applySwap };

  if (params === "invalid") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="text-center max-w-sm space-y-2">
          <p className="text-xl font-bold text-slate-900">Ogiltig länk</p>
          <p className="text-sm text-slate-500 leading-relaxed">Länken saknar portföljinformation. Kontakta din rådgivare.</p>
        </div>
      </div>
    );
  }

  if (params === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-slate-200/70 sticky top-0 z-50 no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900">Ditt företag</p>
              <p className="text-[10px] text-slate-400 hidden sm:block">Finansiell rådgivning</p>
            </div>
          </div>

          <div className="text-center hidden sm:block">
            <p className="text-sm font-semibold text-slate-700">
              Portföljanalys{client ? ` — ${client}` : ""}
            </p>
            <p className="text-[10px] text-slate-400">{custodianLabel} · {today}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Share link — only for advisor */}
            {!isCustomerView && <button
              onClick={copyLink}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium rounded-xl px-3 py-2 border transition-all",
                copied
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "text-slate-500 hover:text-slate-800 border-slate-200 hover:border-slate-300 bg-white"
              )}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{copied ? "Kopierat ✓" : "Dela länk"}</span>
            </button>}

            {/* Edit mode — advisor only, analysis tab only */}
            {!isCustomerView && analysis && activeTab === "analysis" && (
              <button
                onClick={() => { setEditMode(v => !v); setPanelOpen(false); }}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium rounded-xl px-3 py-2 border transition-colors",
                  editMode
                    ? "bg-blue-600 text-white border-blue-600"
                    : "text-slate-500 hover:text-slate-800 border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                {editMode ? <X className="w-3.5 h-3.5" /> : <Settings2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{editMode ? "Klar" : "Redigera"}</span>
              </button>
            )}

            {/* PDF */}
            <button
              onClick={() => window.open(`/rapport/print${window.location.search}`, "_blank")}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 transition-colors bg-white"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Print header ──────────────────────────────────────────────────────── */}
      <div className="print-only hidden border-b border-slate-200 px-6 py-4 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-bold text-slate-900">Ditt företag</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">Portföljanalys{client ? ` — ${client}` : ""}</p>
            <p className="text-xs text-slate-400">{custodianLabel} · {today}</p>
          </div>
        </div>
      </div>

      {/* ── Tab bar — hidden for customers ─────────────────────────────────────── */}
      {!isCustomerView && <div className="border-b border-slate-200 bg-white sticky top-14 sm:top-16 z-40 no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1">
          {([
            { id: "analysis",  label: "Portföljanalys" },
            { id: "fondguide", label: "Fondguide" },
            { id: "scenario",  label: "Scenarioanalys" },
          ] as { id: "analysis" | "fondguide" | "scenario"; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id !== "analysis") setEditMode(false); }}
              className={cn(
                "py-3.5 px-1 mr-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>}

      {/* ── Edit mode banner ───────────────────────────────────────────────────── */}
      {editMode && activeTab === "analysis" && (
        <div className="bg-blue-50 border-b border-blue-100 no-print">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-blue-400 shrink-0" />
            <p className="text-xs font-medium text-blue-700">
              Dra ett kort <strong>över</strong> ett annat för att lägga dem bredvid varandra — dra <strong>ovan/under</strong> för att flytta ordningen.
            </p>
          </div>
        </div>
      )}

      {/* ── Right panel (edit mode) ─────────────────────────────────────────────── */}
      {editMode && activeTab === "analysis" && (
        <>
          {/* Panel */}
          <div
            ref={panelRef}
            className={cn(
              "fixed top-0 right-0 h-full w-64 bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col transition-transform duration-300 no-print",
              panelOpen ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-900">Tillgängliga kort</p>
              <button onClick={() => setPanelOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {hiddenSectionIds.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Alla kort är aktiva</p>
              ) : (
                <>
                  <p className="text-[10px] text-slate-400 px-1 pb-1">Dra ett kort till önskad position i rapporten</p>
                  {hiddenSectionIds.map(id => (
                    <div
                      key={id}
                      draggable
                      onDragStart={() => setPanelDragId(id)}
                      onDragEnd={() => { setPanelDragId(null); setDropIdx(null); }}
                      className={cn(
                        "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-2.5 cursor-grab active:cursor-grabbing select-none transition-colors",
                        panelDragId === id && "opacity-40"
                      )}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <p className="text-xs font-semibold text-slate-700">{SECTION_LABELS[id]}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          {/* Floating toggle button */}
          <button
            onClick={() => setPanelOpen(v => !v)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-lg hover:bg-blue-700 transition-colors no-print"
          >
            <Plus className="w-4 h-4" />
            Lägg till
          </button>
        </>
      )}

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* Title */}
        <div className="pb-6 border-b border-slate-100 space-y-2">
          <h1
            className="text-4xl sm:text-5xl leading-[1.1] hero-accent"
            style={{ fontFamily: "var(--font-dm-serif)" }}
          >
            Portföljanalys
          </h1>
          {client && (
            <p
              className="text-xl sm:text-2xl font-normal text-slate-500 leading-tight"
              style={{ fontFamily: "var(--font-dm-serif)" }}
            >
              {client}
            </p>
          )}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{custodianLabel}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{today}</span>
            {amount && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {amount.toLocaleString("sv-SE")} kr
                </span>
              </>
            )}
          </div>
        </div>

        {/* ── Analysis tab ──────────────────────────────────────────────────── */}
        {activeTab === "analysis" && (
          <>
            {(() => {
              // Drop strip rendered between rows when dragging from the panel
              const Strip = ({ insertAt }: { insertAt: number }) => {
                const active = stripDropIdx === insertAt;
                return (
                  <div
                    onDragOver={e => handleStripDragOver(e, insertAt)}
                    onDrop={e => handleStripDrop(e, insertAt)}
                    onDragLeave={() => setStripDropIdx(null)}
                    className={cn(
                      "relative flex items-center justify-center transition-all no-print",
                      active ? "h-10 -my-1" : "h-3 -my-0"
                    )}
                  >
                    {active && (
                      <div className="absolute inset-x-0 flex items-center gap-2 px-2">
                        <div className="flex-1 h-0.5 bg-violet-400 rounded-full" />
                        <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full shrink-0">Släpp här</span>
                        <div className="flex-1 h-0.5 bg-violet-400 rounded-full" />
                      </div>
                    )}
                  </div>
                );
              };

              const rows: React.ReactNode[] = [];
              if (panelDragId !== null) rows.push(<Strip key="strip-0" insertAt={0} />);

              layout.forEach((row, rowIdx) => {
                const isPair         = row.ids.length === 2;
                const isBeingDragged = dragIdx === rowIdx;
                const isRowTarget    = dropIdx === rowIdx && dragIdx !== null && !isBeingDragged;
                const canPair        = isRowTarget && dropMode === "pair" && !isPair && dragIdx !== null && layout[dragIdx]?.ids.length === 1;
                const needsAnalysis  = row.ids.some(id => id !== "holdings");
                if (!(needsAnalysis && !analysis)) {
                  rows.push(
                    <div
                      key={row.ids.join("+")}
                      draggable={editMode && panelDragId === null}
                      onDragStart={() => setDragIdx(rowIdx)}
                      onDragOver={e => handleDragOver(e, rowIdx)}
                      onDrop={e => handleDrop(e, rowIdx)}
                      onDragEnd={() => { setDragIdx(null); setDropIdx(null); }}
                      className={cn(
                        "relative transition-all duration-150",
                        editMode && "cursor-grab active:cursor-grabbing pt-7",
                        isBeingDragged && "opacity-40 scale-[0.98]",
                        isRowTarget && !canPair && "ring-2 ring-blue-400 ring-offset-2 rounded-2xl",
                        canPair && "ring-2 ring-emerald-400 ring-offset-2 rounded-2xl",
                      )}
                    >
                      {/* Pair overlay hint */}
                      {canPair && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-emerald-500/10 pointer-events-none no-print">
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">Lägg bredvid</span>
                        </div>
                      )}

                      {/* Row controls in edit mode */}
                      {editMode && (
                        <div className="absolute top-0 left-0 right-0 flex items-center justify-between z-20 bg-white border border-slate-200 rounded-lg shadow-sm px-2.5 py-1 no-print">
                          <div className="flex items-center gap-1.5">
                            <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-medium text-slate-500">
                              {row.ids.map(id => SECTION_LABELS[id]).join(" + ")}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {isPair && (
                              <button
                                title="Dela upp till egna rader"
                                onClick={() => splitRow(rowIdx)}
                                className="text-slate-400 hover:text-blue-500 transition-colors p-0.5 rounded"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => removeRow(rowIdx)}
                              className="text-slate-300 hover:text-red-400 transition-colors p-0.5 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Row content — 1 or 2 columns */}
                      <div className={cn(isPair && "grid grid-cols-2 gap-4 sm:gap-6 items-start")}>
                        {row.ids.map(id => (
                          <SectionContent key={id} id={id} data={sectionData} />
                        ))}
                      </div>
                    </div>
                  );
                }
                if (panelDragId !== null) rows.push(<Strip key={`strip-${rowIdx + 1}`} insertAt={rowIdx + 1} />);
              });

              return rows;
            })()}

            {loading && (
              <div className="min-h-[200px] flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
                  <p className="text-sm font-medium text-slate-500">Analyserar portfölj…</p>
                </div>
              </div>
            )}

            {error && !loading && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {analysis && (analysis.notFound?.length ?? 0) > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">Hittades ej: </span>{analysis.notFound.join(", ")}
                </p>
              </div>
            )}
          </>
        )}

        {/* ── Fondguide tab ─────────────────────────────── advisor only ────── */}
        {!isCustomerView && activeTab === "fondguide" && (
          <FondguideTab
            custodian={custodian}
            portfolioIsins={funds.map(f => f.isin)}
          />
        )}

        {/* ── Scenario tab ──────────────────────────────── advisor only ────── */}
        {!isCustomerView && activeTab === "scenario" && (
          <ScenarioTab
            initialFunds={funds}
            nameMap={nameMap}
            custodian={custodian}
            originalAnalysis={analysis}
          />
        )}
      </div>
    </div>
  );
}
