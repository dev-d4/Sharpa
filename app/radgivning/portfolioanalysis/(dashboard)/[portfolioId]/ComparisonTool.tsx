"use client";

import { useState, useMemo, useId } from "react";
import { Plus, X, TrendingUp, TrendingDown, ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MOCK_FUNDS,
  computeExistingMetrics,
  computeTargetMetrics,
  type ExistingFund,
  type PortfolioMetrics,
} from "@/lib/comparison-fund-data";
import type { PortfolioData } from "@/lib/morningstar-api";
import type { TWRData } from "@/lib/twr-mock-data";

// ── Types ─────────────────────────────────────────────────────────────────────

type ManagedPortfolio = {
  display_name: string;
  fee: number | null;
};

type FundRow = {
  id: string;
  fundName: string;
  weight: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null, decimals = 2, suffix = "%"): string {
  if (n == null) return "–";
  return `${n.toFixed(decimals)}${suffix}`;
}

function fmtSharpe(n: number | null): string {
  if (n == null) return "–";
  return n.toFixed(2);
}

function fmtCost(feePercent: number, amountMSEK: number): string {
  const kr = (feePercent / 100) * amountMSEK * 1_000_000;
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(kr);
}

function diff(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return b - a;
}

function DiffBadge({
  value,
  invert = false,
}: {
  value: number | null;
  invert?: boolean;
}) {
  if (value == null) return <span className="text-[#8D95A3]">–</span>;
  const better = invert ? value < 0 : value > 0;
  const neutral = Math.abs(value) < 0.01;
  if (neutral) return <span className="text-[#8D95A3] text-sm">≈ 0</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums",
        better ? "text-emerald-600" : "text-[#C0392B]",
      )}
    >
      {better ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {value > 0 ? "+" : ""}{value.toFixed(2)}
    </span>
  );
}

// ── Fund row ──────────────────────────────────────────────────────────────────

function FundRowInput({
  row,
  index,
  onChange,
  onRemove,
}: {
  row: FundRow;
  index: number;
  onChange: (id: string, field: "fundName" | "weight", value: string) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = MOCK_FUNDS.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-medium text-[#8D95A3] w-5 text-right shrink-0">{index + 1}</span>

      {/* Fund select */}
      <div className="relative flex-1">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={cn(
            "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg border transition-all text-left",
            open ? "border-[#274C77] ring-1 ring-[#274C77]/20" : "border-[#E8EAE8] hover:border-[#C8CDD5]",
            row.fundName ? "text-[#1E2430]" : "text-[#8D95A3]",
          )}
          style={{ background: "#FAFAF8" }}
        >
          <span className="truncate">{row.fundName || "Välj fond…"}</span>
          <ChevronDown className={cn("w-4 h-4 text-[#8D95A3] shrink-0 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-[#E8EAE8] rounded-xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-[#F6F7F9]">
              <input
                autoFocus
                type="text"
                placeholder="Sök fond…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-[#E8EAE8] outline-none focus:border-[#274C77] bg-[#FAFAF8]"
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-[#8D95A3] text-center py-6">Inga fonder hittades</p>
              ) : (
                filtered.map(f => (
                  <button
                    key={f.isin}
                    type="button"
                    onClick={() => {
                      onChange(row.id, "fundName", f.name);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-[#F5F7FF] transition-colors",
                      f.name === row.fundName && "bg-[#EEF4FF] text-[#274C77]",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[#1E2430] truncate">{f.name}</p>
                      <p className="text-[10px] text-[#8D95A3] mt-0.5">
                        {f.category} · {f.management} · TER {f.ter.toFixed(2)}%
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Weight input */}
      <div className="relative w-24 shrink-0">
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          placeholder="0"
          value={row.weight}
          onChange={e => onChange(row.id, "weight", e.target.value)}
          className="w-full px-3 py-2 pr-7 text-sm rounded-lg border border-[#E8EAE8] bg-[#FAFAF8] text-right tabular-nums outline-none focus:border-[#274C77] focus:ring-1 focus:ring-[#274C77]/20 transition-all"
          style={{ color: "#1E2430" }}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8D95A3] pointer-events-none">%</span>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(row.id)}
        className="p-1.5 text-[#8D95A3] hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Metric row ────────────────────────────────────────────────────────────────

function MetricRow({
  label,
  existing,
  target,
  better,
  invert = false,
  highlight = false,
}: {
  label: string;
  existing: string;
  target: string;
  better: number | null;
  invert?: boolean;
  highlight?: boolean;
}) {
  return (
    <tr className={cn("border-b border-[#F6F7F9] last:border-0", highlight && "bg-[#F5F7FF]")}>
      <td className="py-3 pl-4 pr-3 text-sm text-[#5B6472] font-medium">{label}</td>
      <td className="py-3 px-3 text-sm tabular-nums text-right text-[#1E2430]">{existing}</td>
      <td className="py-3 px-3 text-sm tabular-nums text-right font-semibold" style={{ color: "#274C77" }}>{target}</td>
      <td className="py-3 pl-3 pr-4 text-right">
        <DiffBadge value={better} invert={invert} />
      </td>
    </tr>
  );
}

// ── Cost card ─────────────────────────────────────────────────────────────────

function CostCard({
  title,
  subtitle,
  ter,
  custodyFee,
  totalFee,
  amountMSEK,
  accent = false,
}: {
  title: string;
  subtitle?: string;
  ter: number;
  custodyFee: number;
  totalFee: number;
  amountMSEK: number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-6 flex-1 border",
        accent ? "border-[#274C77]/20" : "border-[#E8EAE8]",
      )}
      style={{ background: accent ? "#EEF4FF" : "#FAFAF8" }}
    >
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase mb-0.5"
        style={{ color: accent ? "#274C77" : "#8D95A3" }}>
        {title}
      </p>
      {subtitle !== undefined
        ? <p className="text-xs text-[#8D95A3] mb-4">{subtitle}</p>
        : <div className="mb-4" />}

      <div className="space-y-2.5">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-[#8D95A3]">Fondavgift (TER)</span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: "#1E2430" }}>
            {ter.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-[#8D95A3]">{accent ? "Förvaltningsavgift" : "Depåkostnad"}</span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: "#1E2430" }}>
            {custodyFee.toFixed(2)}%
          </span>
        </div>
        <div className="h-px bg-[#E8EAE8] my-1" />
        <div className="flex justify-between items-baseline">
          <span className="text-xs font-semibold text-[#5B6472]">Total kostnad/år</span>
          <span className="text-base font-bold tabular-nums" style={{ color: accent ? "#274C77" : "#1E2430" }}>
            {totalFee.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between items-baseline pt-1">
          <span className="text-xs text-[#8D95A3]">Kostnad per {amountMSEK} MSEK</span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: "#1E2430" }}>
            {fmtCost(totalFee, amountMSEK)}/år
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ComparisonTool({
  portfolioName,
  data,
  twrData,
  managedPortfolio,
}: {
  portfolioName: string;
  data: PortfolioData | null;
  twrData: TWRData | null;
  managedPortfolio: ManagedPortfolio | null;
}) {
  const uid = useId();

  const [platformName, setPlatformName] = useState("");
  const [custodyFee, setCustodyFee]     = useState("0.25");
  const [amountMSEK, setAmountMSEK]     = useState("1");
  const [rows, setRows] = useState<FundRow[]>([
    { id: `${uid}-0`, fundName: "", weight: "" },
    { id: `${uid}-1`, fundName: "", weight: "" },
  ]);
  const [calculated, setCalculated] = useState(false);

  function addRow() {
    setRows(prev => [...prev, { id: `${uid}-${Date.now()}`, fundName: "", weight: "" }]);
    setCalculated(false);
  }

  function updateRow(id: string, field: "fundName" | "weight", value: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    setCalculated(false);
  }

  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id));
    setCalculated(false);
  }

  const totalWeight    = rows.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0);
  const weightOk       = Math.abs(totalWeight - 100) < 0.5;
  const hasFunds       = rows.some(r => r.fundName);
  const custodyFeeNum  = parseFloat(custodyFee) || 0;
  const amountMSEKNum  = parseFloat(amountMSEK) || 1;

  const existingFunds: ExistingFund[] = rows
    .filter(r => r.fundName && parseFloat(r.weight) > 0)
    .map(r => ({ fundName: r.fundName, weight: parseFloat(r.weight) }));

  const existingMetrics: PortfolioMetrics | null = useMemo(
    () => calculated ? computeExistingMetrics(existingFunds, custodyFeeNum) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calculated],
  );

  const targetMetrics: PortfolioMetrics = useMemo(
    () => computeTargetMetrics(twrData, data?.holdings ?? [], managedPortfolio?.fee ?? null),
    [twrData, data, managedPortfolio],
  );

  const annualSaving =
    existingMetrics && targetMetrics
      ? (existingMetrics.totalFee - targetMetrics.totalFee) / 100 * amountMSEKNum * 1_000_000
      : null;

  const costReduction =
    existingMetrics && existingMetrics.totalFee > 0
      ? ((existingMetrics.totalFee - targetMetrics.totalFee) / existingMetrics.totalFee) * 100
      : null;

  return (
    <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-10 sm:py-12 space-y-12">

      {/* ── Input form ─────────────────────────────────────────────────────── */}
      <section>
        <p className="text-sm font-semibold tracking-[0.08em] uppercase text-[#5B6472] mb-1">
          Befintlig portfölj
        </p>
        <p className="text-sm text-[#8D95A3] mb-6">
          Ange kundens nuvarande fondinnehav och depåkostnader för att beräkna en jämförelse.
        </p>

        <div className="bg-white border border-[#E8EAE8] rounded-2xl p-6 space-y-6 max-w-2xl">

          {/* Platform name */}
          <div>
            <label className="block text-[11px] font-medium text-[#8D95A3] uppercase tracking-[0.1em] mb-1.5">
              Depå / plattform (valfritt)
            </label>
            <input
              type="text"
              placeholder="t.ex. Montrose, Nordnet, Swedbank…"
              value={platformName}
              onChange={e => setPlatformName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E8EAE8] bg-[#FAFAF8] outline-none focus:border-[#274C77] focus:ring-1 focus:ring-[#274C77]/20 transition-all"
              style={{ color: "#1E2430" }}
            />
          </div>

          {/* Fund rows */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-medium text-[#8D95A3] uppercase tracking-[0.1em]">
                Fondinnehav
              </label>
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  weightOk ? "text-emerald-600" : Math.abs(totalWeight) < 0.01 ? "text-[#8D95A3]" : "text-[#C0392B]",
                )}
              >
                {totalWeight.toFixed(1)}% / 100%
              </span>
            </div>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <FundRowInput
                  key={row.id}
                  row={row}
                  index={i}
                  onChange={updateRow}
                  onRemove={removeRow}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#274C77] hover:text-[#1F3D61] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Lägg till fond
            </button>
          </div>

          {/* Fees + amount */}
          <div className="flex flex-wrap gap-6">
            <div className="flex-1 min-w-36">
              <label className="block text-[11px] font-medium text-[#8D95A3] uppercase tracking-[0.1em] mb-1.5">
                Depåkostnad / år
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.05"
                  value={custodyFee}
                  onChange={e => { setCustodyFee(e.target.value); setCalculated(false); }}
                  className="w-full px-3 py-2 pr-7 text-sm rounded-lg border border-[#E8EAE8] bg-[#FAFAF8] outline-none focus:border-[#274C77] focus:ring-1 focus:ring-[#274C77]/20 transition-all tabular-nums"
                  style={{ color: "#1E2430" }}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8D95A3] pointer-events-none">%</span>
              </div>
            </div>

            <div className="flex-1 min-w-36">
              <label className="block text-[11px] font-medium text-[#8D95A3] uppercase tracking-[0.1em] mb-1.5">
                Portföljstorlek (MSEK)
              </label>
              <input
                type="number"
                min="0.1"
                max="1000"
                step="0.1"
                value={amountMSEK}
                onChange={e => setAmountMSEK(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E8EAE8] bg-[#FAFAF8] outline-none focus:border-[#274C77] focus:ring-1 focus:ring-[#274C77]/20 transition-all tabular-nums"
                style={{ color: "#1E2430" }}
              />
            </div>
          </div>

          {/* Calculate button */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              disabled={!hasFunds || !weightOk}
              onClick={() => setCalculated(true)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                hasFunds && weightOk
                  ? "text-white hover:opacity-90 active:scale-[0.98]"
                  : "opacity-40 cursor-not-allowed text-white",
              )}
              style={{ background: "#274C77" }}
            >
              Beräkna jämförelse
            </button>
            {!weightOk && hasFunds && (
              <p className="text-xs text-[#C0392B] flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Vikterna måste summera till 100%
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {calculated && existingMetrics && (
        <>
          {/* Cost comparison */}
          <section>
            <p className="text-sm font-semibold tracking-[0.08em] uppercase text-[#5B6472] mb-6">
              Kostnadsanalys
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-6 max-w-2xl">
              <CostCard
                title={platformName || "Befintlig portfölj"}
                ter={existingMetrics.ter}
                custodyFee={existingMetrics.custodyFee}
                totalFee={existingMetrics.totalFee}
                amountMSEK={amountMSEKNum}
              />
              <CostCard
                title={portfolioName}
                accent
                ter={targetMetrics.ter}
                custodyFee={targetMetrics.custodyFee}
                totalFee={targetMetrics.totalFee}
                amountMSEK={amountMSEKNum}
              />
            </div>

            {/* Savings banner */}
            {annualSaving != null && annualSaving > 0 && (
              <div
                className="max-w-2xl rounded-2xl px-6 py-5 flex flex-wrap items-center gap-4"
                style={{ background: "linear-gradient(135deg, #274C77 0%, #1F3D61 100%)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-white/60 mb-0.5">
                    Årlig besparing
                  </p>
                  <p className="text-2xl font-bold text-white tabular-nums">
                    {new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(annualSaving)}
                  </p>
                  <p className="text-xs text-white/60 mt-0.5">per {amountMSEKNum} MSEK investerat</p>
                </div>
                {costReduction != null && (
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-white/60 mb-0.5">
                      Kostnadssänkning
                    </p>
                    <p className="text-2xl font-bold text-white tabular-nums">
                      {costReduction.toFixed(0)}%
                    </p>
                    <p className="text-xs text-white/60 mt-0.5">lägre total kostnad</p>
                  </div>
                )}
              </div>
            )}
            {annualSaving != null && annualSaving <= 0 && (
              <div className="max-w-2xl rounded-2xl px-6 py-4 border border-[#E8EAE8] bg-[#FAFAF8]">
                <p className="text-sm text-[#5B6472]">
                  Den befintliga portföljens totala kostnad ({existingMetrics.totalFee.toFixed(2)}%) är jämförbar med {portfolioName} ({targetMetrics.totalFee.toFixed(2)}%).
                </p>
              </div>
            )}
          </section>

          {/* Performance & risk table */}
          <section>
            <p className="text-sm font-semibold tracking-[0.08em] uppercase text-[#5B6472] mb-6">
              Avkastning &amp; risk
            </p>

            <div className="bg-white border border-[#E8EAE8] rounded-2xl overflow-hidden max-w-2xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F6F7F9]" style={{ background: "#FAFAF8" }}>
                    <th className="py-3 pl-4 pr-3 text-left text-[11px] font-semibold tracking-[0.08em] uppercase text-[#8D95A3]">
                      Nyckeltal
                    </th>
                    <th className="py-3 px-3 text-right text-[11px] font-semibold tracking-[0.08em] uppercase text-[#8D95A3]">
                      {platformName || "Befintlig"}
                    </th>
                    <th className="py-3 px-3 text-right text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: "#274C77" }}>
                      {portfolioName}
                    </th>
                    <th className="py-3 pl-3 pr-4 text-right text-[11px] font-semibold tracking-[0.08em] uppercase text-[#8D95A3]">
                      Skillnad
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <MetricRow
                    label="Avkastning 1 mån"
                    existing={fmt(existingMetrics.returns.m1)}
                    target={fmt(targetMetrics.returns.m1)}
                    better={diff(existingMetrics.returns.m1, targetMetrics.returns.m1)}
                  />
                  <MetricRow
                    label="Avkastning 3 mån"
                    existing={fmt(existingMetrics.returns.m3)}
                    target={fmt(targetMetrics.returns.m3)}
                    better={diff(existingMetrics.returns.m3, targetMetrics.returns.m3)}
                  />
                  <MetricRow
                    label="Avkastning 6 mån"
                    existing={fmt(existingMetrics.returns.m6)}
                    target={fmt(targetMetrics.returns.m6)}
                    better={diff(existingMetrics.returns.m6, targetMetrics.returns.m6)}
                  />
                  <MetricRow
                    label="Avkastning 1 år"
                    existing={fmt(existingMetrics.returns.y1)}
                    target={fmt(targetMetrics.returns.y1)}
                    better={diff(existingMetrics.returns.y1, targetMetrics.returns.y1)}
                  />
                  <MetricRow
                    label="Avkastning 3 år"
                    existing={fmt(existingMetrics.returns.y3)}
                    target={fmt(targetMetrics.returns.y3)}
                    better={diff(existingMetrics.returns.y3, targetMetrics.returns.y3)}
                  />
                  <MetricRow
                    label="Volatilitet 1 år"
                    existing={fmt(existingMetrics.volatility_y1)}
                    target={fmt(targetMetrics.volatility_y1)}
                    better={diff(existingMetrics.volatility_y1, targetMetrics.volatility_y1)}
                    invert
                  />
                  <MetricRow
                    label="Sharpe 1 år"
                    existing={fmtSharpe(existingMetrics.sharpe_y1)}
                    target={fmtSharpe(targetMetrics.sharpe_y1)}
                    better={diff(existingMetrics.sharpe_y1, targetMetrics.sharpe_y1)}
                    highlight
                  />
                  <MetricRow
                    label="Sharpe 3 år"
                    existing={fmtSharpe(existingMetrics.sharpe_y3)}
                    target={fmtSharpe(targetMetrics.sharpe_y3)}
                    better={diff(existingMetrics.sharpe_y3, targetMetrics.sharpe_y3)}
                  />
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-start gap-2 max-w-2xl">
              <Info className="w-3.5 h-3.5 text-[#8D95A3] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#8D95A3] leading-relaxed">
                Avkastning och riskmått för den befintliga portföljen baseras på viktad genomsnittsdata
                per fond (testdata). Denna portföljs data är beräknad från faktisk tidsviktad
                avkastning (TWR). Historisk avkastning är ingen garanti för framtida resultat.
                Sharpe-kvoten beräknas med en riskfri ränta på 2,5%.
              </p>
            </div>
          </section>

          {/* Fund breakdown */}
          <section>
            <p className="text-sm font-semibold tracking-[0.08em] uppercase text-[#5B6472] mb-6">
              Fondspecifikation – befintlig portfölj
            </p>

            <div className="bg-white border border-[#E8EAE8] rounded-2xl overflow-hidden max-w-2xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F6F7F9]" style={{ background: "#FAFAF8" }}>
                    <th className="py-3 pl-4 pr-3 text-left text-[11px] font-semibold tracking-[0.08em] uppercase text-[#8D95A3]">Fond</th>
                    <th className="py-3 px-3 text-right text-[11px] font-semibold tracking-[0.08em] uppercase text-[#8D95A3]">Typ</th>
                    <th className="py-3 px-3 text-right text-[11px] font-semibold tracking-[0.08em] uppercase text-[#8D95A3]">TER</th>
                    <th className="py-3 pl-3 pr-4 text-right text-[11px] font-semibold tracking-[0.08em] uppercase text-[#8D95A3]">Andel</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter(r => r.fundName && parseFloat(r.weight) > 0)
                    .map((r, i) => {
                      const rec = MOCK_FUNDS.find(f => f.name === r.fundName);
                      return (
                        <tr
                          key={r.id}
                          className="border-b border-[#F6F7F9] last:border-0"
                          style={{ background: i % 2 === 0 ? "#FAFAF8" : "#F2F3F0" }}
                        >
                          <td className="py-3 pl-4 pr-3 text-sm font-medium text-[#1E2430]">{r.fundName}</td>
                          <td className="py-3 px-3 text-sm text-right text-[#5B6472]">
                            {rec ? rec.category : "–"}
                          </td>
                          <td className="py-3 px-3 text-sm text-right tabular-nums text-[#1E2430]">
                            {rec ? `${rec.ter.toFixed(2)}%` : "–"}
                          </td>
                          <td className="py-3 pl-3 pr-4 text-sm text-right font-semibold tabular-nums" style={{ color: "#274C77" }}>
                            {parseFloat(r.weight).toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#E8EAE8] bg-white">
                    <td className="py-3 pl-4 pr-3 text-[11px] font-semibold text-[#8D95A3] uppercase tracking-wide" colSpan={2}>
                      Viktat genomsnitt
                    </td>
                    <td className="py-3 px-3 text-sm text-right font-semibold tabular-nums text-[#1E2430]">
                      {existingMetrics.ter.toFixed(2)}%
                    </td>
                    <td className="py-3 pl-3 pr-4 text-sm text-right font-semibold tabular-nums text-[#1E2430]">
                      100%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
