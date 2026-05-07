"use client";

import { useCallback, useEffect, useState } from "react";
import type { PortfolioAnalysis } from "@/lib/analysis";
import DonutChart from "@/components/ui/DonutChart";

// ── Types ─────────────────────────────────────────────────────────────────────

type FundEntry = { isin: string; weight: number };

function parseParams(): { custodian: string; funds: FundEntry[]; amount?: number; client?: string; comment?: string } | null {
  try {
    const p = new URLSearchParams(window.location.search).get("p");
    if (!p) return null;
    const obj = JSON.parse(atob(p));
    if (!obj?.custodian || !Array.isArray(obj.funds) || !obj.funds.length) return null;
    return {
      custodian: obj.custodian,
      funds:     obj.funds,
      amount:    typeof obj.amount  === "number" ? obj.amount  : undefined,
      client:    typeof obj.client  === "string" ? obj.client  : undefined,
      comment:   typeof obj.comment === "string" ? obj.comment : undefined,
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

function fmtKr(n: number) {
  return Math.round(n).toLocaleString("sv-SE") + " kr";
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PrintClient() {
  const [params,   setParams]   = useState<ReturnType<typeof parseParams> | "invalid">(null);
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [nameMap,  setNameMap]  = useState<Map<string, string>>(new Map());
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    const p = parseParams();
    setParams(p ?? "invalid");
  }, []);

  const analyze = useCallback(async (funds: FundEntry[], custodian: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custodian, entries: funds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Okänt fel");
      setAnalysis(data);
      setNameMap(buildNameMap(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (params && params !== "invalid") analyze(params.funds, params.custodian);
  }, [params, analyze]);

  // Auto-print once everything has loaded
  useEffect(() => {
    if (!analysis) return;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [analysis]);

  const CUSTODIAN: Record<string, string> = { avanza: "Avanza", nordnet: "Nordnet", "övrigt": "Övrigt" };
  const today = new Date().toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" });

  const p = params !== "invalid" ? params : null;
  const custodianLabel = p ? (CUSTODIAN[p.custodian] ?? p.custodian) : "";

  // ── Loading / error shells ─────────────────────────────────────────────────
  if (!params || params === "invalid" || loading || error) {
    return (
      <div style={{ fontFamily: "sans-serif", padding: 48, color: "#111" }}>
        {loading && <p>Hämtar analysdata…</p>}
        {error   && <p style={{ color: "#c00" }}>Fel: {error}</p>}
        {params === "invalid" && <p>Ogiltig länk.</p>}
      </div>
    );
  }

  if (!analysis) return null;

  const { funds, amount, client, comment } = p!;

  const annualFee    = analysis.avgCost           != null && amount ? amount * analysis.avgCost / 100           : null;
  const annualRet3   = analysis.weightedReturn3yr != null && amount ? amount * analysis.weightedReturn3yr / 100 : null;
  const sm           = analysis.suggestedMetrics;
  const sugFee       = sm?.avgCost           != null && amount ? amount * sm.avgCost / 100           : null;
  const sugRet3      = sm?.weightedReturn3yr != null && amount ? amount * sm.weightedReturn3yr / 100 : null;

  const hasSwaps = (analysis.swapSuggestions?.length ?? 0) > 0;
  const hasBest  = (analysis.bestInCategory?.length ?? 0) > 0;

  return (
    <>
      {/* ── Print-specific page rules ─────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 11px;
          color: #111;
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        @page {
          size: A4;
          margin: 18mm 16mm 18mm 16mm;
        }

        @media screen {
          body { background: #f0f0f0; }
          .doc { max-width: 780px; margin: 32px auto; background: white; padding: 40px; box-shadow: 0 4px 32px rgba(0,0,0,.12); }
          .screen-bar { max-width: 780px; margin: 0 auto 0; background: #1e40af; color: white; padding: 12px 40px; display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
          .print-btn { background: white; color: #1e40af; border: none; padding: 6px 18px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer; }
        }

        @media print {
          .screen-bar { display: none; }
          .doc { padding: 0; }
        }

        /* ── Typography ────────────────────────────────────────────────────── */

        .serif { font-family: 'DM Serif Display', Georgia, serif; font-weight: 400; }

        h1.report-title { font-family: 'DM Serif Display', Georgia, serif; font-size: 26px; color: #111; line-height: 1.1; }
        h2.section-title { font-family: 'DM Serif Display', Georgia, serif; font-size: 14px; color: #111; margin-bottom: 8px; }

        .label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; color: #999; }

        /* ── Layout helpers ─────────────────────────────────────────────────── */

        .row   { display: flex; align-items: flex-start; gap: 24px; }
        .col   { flex: 1; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }

        /* ── Divider ─────────────────────────────────────────────────────────── */

        hr.div { border: none; border-top: 1px solid #e8e8e8; margin: 20px 0; }

        /* ── Document header ─────────────────────────────────────────────────── */

        .doc-header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 18px; border-bottom: 2px solid #111; margin-bottom: 24px; }
        .doc-header-left .company-name { font-size: 11px; font-weight: 700; color: #111; }
        .doc-header-left .company-sub  { font-size: 9px; color: #888; margin-top: 2px; }
        .doc-header-right { text-align: right; }
        .doc-header-right .meta { font-size: 9px; color: #888; margin-top: 4px; }

        /* ── Metrics ─────────────────────────────────────────────────────────── */

        .metric-box { background: #f7f7f7; border-radius: 8px; padding: 12px 14px; }
        .metric-box .metric-label { font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; color: #888; margin-bottom: 4px; }
        .metric-box .metric-value { font-size: 20px; font-weight: 700; line-height: 1; color: #111; }
        .metric-box .metric-value.good { color: #16a34a; }
        .metric-box .metric-value.bad  { color: #dc2626; }
        .metric-box .metric-value.ok   { color: #d97706; }
        .metric-box .metric-sub  { font-size: 8.5px; color: #aaa; margin-top: 4px; }

        /* ── Table ───────────────────────────────────────────────────────────── */

        table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
        table th { text-align: left; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #888; padding: 0 6px 6px; border-bottom: 1px solid #e8e8e8; }
        table th.right, table td.right { text-align: right; }
        table td { padding: 7px 6px; border-bottom: 1px solid #f2f2f2; color: #333; vertical-align: top; }
        table tr:last-child td { border-bottom: none; }
        table tr:nth-child(even) td { background: #fafafa; }
        .mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 9.5px; color: #888; }
        .fw { font-weight: 600; color: #111; }

        /* ── Fee comparison ──────────────────────────────────────────────────── */

        .fee-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .fee-box { border-radius: 8px; padding: 12px 14px; }
        .fee-box.current   { background: #f7f7f7; }
        .fee-box.suggested { background: #f0fdf4; border: 1px solid #bbf7d0; }
        .fee-row { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; padding: 3px 0; border-bottom: 1px solid rgba(0,0,0,.06); }
        .fee-row:last-child { border-bottom: none; }
        .fee-label { color: #666; }
        .fee-val   { font-weight: 600; color: #111; }
        .fee-val.green { color: #16a34a; }
        .fee-val.red   { color: #dc2626; }

        .savings-chips { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
        .savings-chip  { border-radius: 8px; padding: 8px 14px; text-align: center; }
        .savings-chip .chip-label { font-size: 7.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; opacity: .7; margin-bottom: 2px; }
        .savings-chip .chip-val   { font-size: 15px; font-weight: 700; line-height: 1.1; }
        .savings-chip.emerald { background: #f0fdf4; color: #15803d; }
        .savings-chip.blue    { background: #eff6ff; color: #1d4ed8; }
        .savings-chip.violet  { background: #f5f3ff; color: #6d28d9; }

        /* ── Swap rows ───────────────────────────────────────────────────────── */

        .swap-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f2f2f2; }
        .swap-row:last-child { border-bottom: none; }
        .swap-fund { flex: 1; min-width: 0; }
        .swap-fund-name { font-size: 10.5px; font-weight: 600; color: #111; }
        .swap-fund-isin { font-size: 8.5px; color: #aaa; font-family: monospace; }
        .swap-fund-label { font-size: 7.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 3px; }
        .swap-fund-label.sell { color: #888; }
        .swap-fund-label.buy  { color: #16a34a; }
        .swap-arrow { color: #ccc; font-size: 14px; margin-top: 14px; flex-shrink: 0; }
        .swap-chips { flex-shrink: 0; display: flex; flex-direction: column; gap: 3px; text-align: right; }
        .swap-chip  { font-size: 8.5px; font-weight: 600; color: #16a34a; background: #f0fdf4; padding: 2px 7px; border-radius: 4px; white-space: nowrap; }

        /* ── Bars ────────────────────────────────────────────────────────────── */

        .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .bar-row:last-child { margin-bottom: 0; }
        .bar-label { font-size: 10px; color: #555; width: 110px; flex-shrink: 0; }
        .bar-track { flex: 1; height: 6px; background: #eee; border-radius: 3px; overflow: hidden; }
        .bar-fill  { height: 100%; border-radius: 3px; }
        .bar-fill.blue    { background: #3b82f6; }
        .bar-fill.emerald { background: #10b981; }
        .bar-fill.slate   { background: #94a3b8; }
        .bar-pct   { font-size: 10px; font-weight: 600; color: #111; width: 32px; text-align: right; flex-shrink: 0; }

        /* ── Best in category ────────────────────────────────────────────────── */

        .best-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f2f2f2; font-size: 10.5px; }
        .best-row:last-child { border-bottom: none; }
        .best-name { font-weight: 600; color: #111; }
        .best-cat  { font-size: 9px; color: #aaa; }
        .check     { color: #16a34a; margin-right: 6px; }

        /* ── Warning ─────────────────────────────────────────────────────────── */

        .warning-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; margin-top: 12px; font-size: 10px; color: #78350f; }
        .warning-box strong { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .1em; color: #92400e; margin-bottom: 4px; }

        /* ── Page break ──────────────────────────────────────────────────────── */

        .no-break { break-inside: avoid; }
        .page-break { break-after: page; }

        /* ── Disclaimer ──────────────────────────────────────────────────────── */

        .disclaimer { font-size: 8px; color: #bbb; margin-top: 28px; padding-top: 12px; border-top: 1px solid #e8e8e8; line-height: 1.5; }
      `}</style>

      {/* ── Screen preview bar ────────────────────────────────────────────── */}
      <div className="screen-bar">
        <span>Förhandsvisning av PDF — {client ?? "Portföljanalys"}</span>
        <button className="print-btn" onClick={() => window.print()}>
          Ladda ner / Skriv ut
        </button>
      </div>

      {/* ── Document ──────────────────────────────────────────────────────── */}
      <div className="doc">

        {/* Document header */}
        <div className="doc-header">
          <div className="doc-header-left">
            <div className="company-name">Ditt företag</div>
            <div className="company-sub">Finansiell rådgivning</div>
          </div>
          <div className="doc-header-right">
            <h1 className="report-title">{client ? `Portföljanalys — ${client}` : "Portföljanalys"}</h1>
            <div className="meta">{custodianLabel}{amount ? ` · ${amount.toLocaleString("sv-SE")} kr` : ""} · {today}</div>
          </div>
        </div>

        {/* Summary */}
        <div className="no-break" style={{ marginBottom: 20 }}>
          <div className="label" style={{ marginBottom: 6 }}>Sammanfattning</div>
          <p style={{ fontSize: 10.5, color: "#333", lineHeight: 1.7 }}>{analysis.summaryText}</p>
        </div>

        {/* Advisor comment */}
        {comment && (
          <div className="no-break" style={{ borderLeft: "3px solid #3b82f6", paddingLeft: 12, marginBottom: 20 }}>
            <div className="label" style={{ marginBottom: 5 }}>Rådgivarens kommentar</div>
            <p style={{ fontSize: 10.5, color: "#333", lineHeight: 1.7 }}>{comment}</p>
            <p style={{ fontSize: 8.5, color: "#aaa", marginTop: 6 }}>— Ditt företag · {today}</p>
          </div>
        )}

        <hr className="div" />

        {/* Portfolio holdings */}
        <div className="no-break" style={{ marginBottom: 20 }}>
          <h2 className="section-title">Portföljinnehav</h2>
          <table>
            <thead>
              <tr>
                <th>Fond</th>
                <th>ISIN</th>
                <th className="right">Vikt</th>
              </tr>
            </thead>
            <tbody>
              {funds.map((f) => {
                const name = nameMap.get(f.isin);
                return (
                  <tr key={f.isin}>
                    <td className="fw">{name ?? "–"}</td>
                    <td className="mono">{f.isin}</td>
                    <td className="right fw">{f.weight.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <hr className="div" />

        {/* Key metrics */}
        <div className="no-break" style={{ marginBottom: 20 }}>
          <h2 className="section-title">Nyckeltal</h2>
          <div className="grid4">
            {[
              { label: "Snittavgift",     value: analysis.avgCost,           fmt: (v: number) => `${v.toFixed(2)}%`, sub: "per år",       key: "cost" },
              { label: "Avkastning 1 år", value: analysis.weightedReturn1yr, fmt: (v: number) => `${v.toFixed(1)}%`, sub: "viktad",       key: "ret1" },
              { label: "Avkastning 3 år", value: analysis.weightedReturn3yr, fmt: (v: number) => `${v.toFixed(1)}%`, sub: "annualiserad", key: "ret3" },
              { label: "Sharpe 3 år",     value: analysis.weightedSharpe,    fmt: (v: number) => v.toFixed(2),       sub: "riskjusterad", key: "shr"  },
            ].map(({ label, value, fmt, sub, key }) => {
              let cls = "";
              if (key === "cost" && value !== null) cls = value < 0.3 ? "good" : value > 0.8 ? "bad" : "ok";
              if ((key === "ret1" || key === "ret3") && value !== null) cls = value > 10 ? "good" : value < 3 ? "bad" : "ok";
              if (key === "shr" && value !== null) cls = value > 0.7 ? "good" : value < 0.3 ? "bad" : "ok";
              return (
                <div key={label} className="metric-box">
                  <div className="metric-label">{label}</div>
                  <div className={`metric-value ${cls}`}>{value !== null ? fmt(value) : "–"}</div>
                  <div className="metric-sub">{sub}</div>
                </div>
              );
            })}
          </div>

          {(analysis.concentrationWarnings?.length ?? 0) > 0 && (
            <div className="warning-box">
              <strong>Koncentrationsrisk</strong>
              {analysis.concentrationWarnings.map(w => (
                <span key={w.category}>{w.weight.toFixed(0)}% i {w.category.toLowerCase()}. </span>
              ))}
            </div>
          )}
        </div>

        <hr className="div" />

        {/* Allocation + Management side by side */}
        <div className="no-break" style={{ marginBottom: 20 }}>
          <div className="row">
            <div className="col">
              <h2 className="section-title">Tillgångsfördelning</h2>
              <DonutChart
                slices={(analysis.detailedBreakdown ?? []).map(c => ({ label: c.label, weight: c.weight }))}
                centerLabel={`${(analysis.detailedBreakdown ?? [])[0]?.weight.toFixed(0) ?? "–"}%`}
                centerSub={(analysis.detailedBreakdown ?? [])[0]?.label ?? ""}
                size={140}
                thickness={20}
                horizontal
              />
            </div>
            <div className="col">
              <h2 className="section-title">Förvaltningsstil</h2>
              {[
                { label: "Aktivt förvaltad", value: analysis.managementBreakdown.active,  cls: "blue" },
                { label: "Passiv / index",   value: analysis.managementBreakdown.passive, cls: "emerald" },
                ...(analysis.managementBreakdown.unknown > 1
                  ? [{ label: "Okänd", value: analysis.managementBreakdown.unknown, cls: "slate" }]
                  : []
                ),
              ].map(item => (
                <div key={item.label} className="bar-row">
                  <div className="bar-label">{item.label}</div>
                  <div className="bar-track">
                    <div className={`bar-fill ${item.cls}`} style={{ width: `${item.value}%` }} />
                  </div>
                  <div className="bar-pct">{item.value.toFixed(0)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fee calculator */}
        {amount && (
          <>
            <hr className="div" />
            <div className="no-break" style={{ marginBottom: 20 }}>
              <h2 className="section-title">
                Avgiftsräknare
                <span style={{ fontSize: 10, fontFamily: "Inter, sans-serif", fontWeight: 400, color: "#888", marginLeft: 8 }}>
                  Portföljvärde: {amount.toLocaleString("sv-SE")} kr
                </span>
              </h2>
              <div className={sm ? "fee-grid" : ""}>
                <div className="fee-box current">
                  <div className="label" style={{ marginBottom: 8 }}>Nuvarande portfölj</div>
                  <div className="fee-row">
                    <span className="fee-label">Avgift per år</span>
                    <span className="fee-val">{annualFee !== null ? fmtKr(annualFee) : "–"}</span>
                  </div>
                  <div className="fee-row">
                    <span className="fee-label">Avgift i %</span>
                    <span className="fee-val">{analysis.avgCost !== null ? `${analysis.avgCost.toFixed(2)}%` : "–"}</span>
                  </div>
                  <div className="fee-row">
                    <span className="fee-label">Förv. avkastning / år</span>
                    <span className="fee-val">{annualRet3 !== null ? fmtKr(annualRet3) : "–"}</span>
                  </div>
                </div>
                {sm && (
                  <div className="fee-box suggested">
                    <div className="label" style={{ marginBottom: 8, color: "#16a34a" }}>Föreslagen portfölj</div>
                    <div className="fee-row">
                      <span className="fee-label">Avgift per år</span>
                      <span className="fee-val green">{sugFee !== null ? fmtKr(sugFee) : "–"}</span>
                    </div>
                    <div className="fee-row">
                      <span className="fee-label">Avgift i %</span>
                      <span className="fee-val green">{sm.avgCost !== null ? `${sm.avgCost.toFixed(2)}%` : "–"}</span>
                    </div>
                    <div className="fee-row">
                      <span className="fee-label">Förv. avkastning / år</span>
                      <span className="fee-val green">{sugRet3 !== null ? fmtKr(sugRet3) : "–"}</span>
                    </div>
                  </div>
                )}
              </div>
              {(() => {
                const feeSaving = annualFee !== null && sugFee !== null ? annualFee - sugFee : null;
                const retGain   = annualRet3 !== null && sugRet3 !== null ? sugRet3 - annualRet3 : null;
                if (!feeSaving && !retGain) return null;
                return (
                  <div className="savings-chips">
                    {feeSaving !== null && feeSaving > 0 && (
                      <div className="savings-chip emerald">
                        <div className="chip-label">Avgiftsbesparing / år</div>
                        <div className="chip-val">+{fmtKr(feeSaving)}</div>
                      </div>
                    )}
                    {retGain !== null && retGain > 0 && (
                      <div className="savings-chip blue">
                        <div className="chip-label">Mer i avkastning / år</div>
                        <div className="chip-val">+{fmtKr(retGain)}</div>
                      </div>
                    )}
                    {feeSaving !== null && retGain !== null && feeSaving + retGain > 0 && (
                      <div className="savings-chip violet">
                        <div className="chip-label">Total förbättring / år</div>
                        <div className="chip-val">+{fmtKr(feeSaving + retGain)}</div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </>
        )}

        {/* Fondgranskning */}
        {(hasSwaps || hasBest) && (
          <>
            <hr className="div" />
            <div className="no-break" style={{ marginBottom: 20 }}>
              <h2 className="section-title">Fondgranskning</h2>

              {hasSwaps && (
                <div style={{ marginBottom: hasBest ? 14 : 0 }}>
                  <div className="label" style={{ marginBottom: 8 }}>Förslag på byte</div>
                  {(analysis.swapSuggestions ?? []).map((swap, i) => {
                    const chips: string[] = [];
                    if (swap.improvement.sharpe)    chips.push(`Sharpe +${swap.improvement.sharpe.toFixed(2)}`);
                    if (swap.improvement.cost)      chips.push(`Avgift −${swap.improvement.cost.toFixed(2)}%`);
                    if (swap.improvement.return1yr) chips.push(`Avk. +${swap.improvement.return1yr.toFixed(1)}%`);
                    return (
                      <div key={i} className="swap-row">
                        <div className="swap-fund">
                          <div className="swap-fund-label sell">{swap.consolidate ? "Sälja / minska" : "Nuvarande fond"}</div>
                          <div className="swap-fund-name">{swap.currentFund.name}</div>
                          <div className="swap-fund-isin">{swap.currentFund.isin}</div>
                        </div>
                        <div className="swap-arrow">→</div>
                        <div className="swap-fund">
                          <div className="swap-fund-label buy">{swap.consolidate ? "Öka i befintlig fond" : "Föreslagen fond"}</div>
                          <div className="swap-fund-name">{swap.suggestedFund.name}</div>
                          <div className="swap-fund-isin">{swap.suggestedFund.isin}</div>
                        </div>
                        <div className="swap-chips">
                          {chips.map(c => <span key={c} className="swap-chip">{c}</span>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {hasBest && (
                <div style={{ marginTop: hasSwaps ? 12 : 0, paddingTop: hasSwaps ? 12 : 0, borderTop: hasSwaps ? "1px solid #eee" : "none" }}>
                  <div className="label" style={{ marginBottom: 8 }}>Redan bäst i sin kategori</div>
                  {analysis.bestInCategory.map(f => (
                    <div key={f.isin} className="best-row">
                      <span><span className="check">✓</span><span className="best-name">{f.fundName}</span></span>
                      <span className="best-cat">{f.category}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Not found */}
        {(analysis.notFound?.length ?? 0) > 0 && (
          <div className="warning-box" style={{ marginBottom: 20 }}>
            <strong>Hittades ej i databasen</strong>
            {analysis.notFound.join(", ")}
          </div>
        )}

        {/* Disclaimer */}
        <div className="disclaimer">
          Denna rapport är framtagen av Ditt företag och baseras på historiska fonddata.
          Historisk avkastning är ingen garanti för framtida avkastning. Rapporten utgör inte finansiell rådgivning.
          Fondavgifter och avkastningsuppgifter är hämtade från respektive fondbolags senast tillgängliga data.
        </div>
      </div>
    </>
  );
}
