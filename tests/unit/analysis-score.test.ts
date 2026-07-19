import { describe, expect, it } from "vitest";
import { absoluteScore, analyzePortfolio, type PortfolioEntry } from "@/lib/analysis";
import type { Fund } from "@/lib/supabase";

// ── Score/visnings-konsistens ─────────────────────────────────────────────────
// Fondbytesjämförelsen visar tre nyckeltal: avgift, avkastning 3 år och Sharpe
// 3 år. Rankningen (absoluteScore) får BARA bygga på dessa tre — användaren ska
// kunna se exakt de siffror som avgjorde vilken fond som pekas ut som bäst.

function makeFund(overrides: Partial<Fund> & Pick<Fund, "isin" | "name">): Fund {
  return {
    id: 0,
    base_currency: "SEK",
    category_group: "Equity",
    category: "Global, Mix bolag",
    selection_id: "global",
    global_category: null,
    equity_style_box: null,
    return_ytd: null,
    return_1yr: 8.0,
    return_2yr: null,
    return_3yr: 10.0,
    return_5yr: null,
    investment_type: "INDEX",
    std_dev_3yr: null,
    std_dev_1yr: null,
    sharpe_3yr: 0.8,
    alpha_3yr: null,
    beta_3yr: null,
    sri_value: null,
    ongoing_cost_actual: 0.25,
    ongoing_cost_estimated: null,
    ...overrides,
  };
}

function makeEntry(fund: Fund, weight: number): PortfolioEntry {
  return { isin: fund.isin, weight, fund };
}

describe("absoluteScore använder exakt jämförelsens nyckeltal", () => {
  const base = makeFund({ isin: "SE0000001", name: "Bas" });

  it("påverkas av Sharpe 3 år (visas i jämförelsen)", () => {
    expect(absoluteScore(makeFund({ ...base, sharpe_3yr: 1.0 })))
      .toBeGreaterThan(absoluteScore(makeFund({ ...base, sharpe_3yr: 0.5 })));
  });

  it("påverkas av avkastning 3 år (visas i jämförelsen)", () => {
    expect(absoluteScore(makeFund({ ...base, return_3yr: 30 })))
      .toBeGreaterThan(absoluteScore(makeFund({ ...base, return_3yr: 10 })));
  });

  it("påverkas av avgift (visas i jämförelsen)", () => {
    expect(absoluteScore(makeFund({ ...base, ongoing_cost_actual: 0.2 })))
      .toBeGreaterThan(absoluteScore(makeFund({ ...base, ongoing_cost_actual: 1.5 })));
  });

  it("påverkas INTE av nyckeltal som inte visas i jämförelsen", () => {
    const score = absoluteScore(base);
    // 1-årsavkastning visas inte i jämförelsen → får inte avgöra rankningen
    expect(absoluteScore(makeFund({ ...base, return_1yr: 99 }))).toBe(score);
    expect(absoluteScore(makeFund({ ...base, return_1yr: -50 }))).toBe(score);
    // Övriga fält som inte visas
    expect(absoluteScore(makeFund({ ...base, return_ytd: 50 }))).toBe(score);
    expect(absoluteScore(makeFund({ ...base, return_5yr: 200 }))).toBe(score);
    expect(absoluteScore(makeFund({ ...base, std_dev_3yr: 30 }))).toBe(score);
    expect(absoluteScore(makeFund({ ...base, alpha_3yr: 5 }))).toBe(score);
    expect(absoluteScore(makeFund({ ...base, sri_value: 7 }))).toBe(score);
  });

  it("använder ongoing_cost_estimated som fallback när actual saknas", () => {
    const withActual = absoluteScore(makeFund({ ...base, ongoing_cost_actual: 0.5, ongoing_cost_estimated: null }));
    const withEstimated = absoluteScore(makeFund({ ...base, ongoing_cost_actual: null, ongoing_cost_estimated: 0.5 }));
    expect(withActual).toBe(withEstimated);
  });
});

describe("bytesförslag: rankning och visade värden hänger ihop", () => {
  it("föreslagen fond har alltid högst absoluteScore bland jämförbara fonder", () => {
    const current = makeFund({ isin: "SE0000001", name: "Nuvarande", sharpe_3yr: 0.3, ongoing_cost_actual: 1.4, return_3yr: 8 });
    const mid = makeFund({ isin: "SE0000002", name: "Mellan", sharpe_3yr: 0.7, ongoing_cost_actual: 0.6, return_3yr: 15 });
    const top = makeFund({ isin: "SE0000003", name: "Topp", sharpe_3yr: 1.2, ongoing_cost_actual: 0.2, return_3yr: 25 });
    const all = [current, mid, top];

    const analysis = analyzePortfolio([makeEntry(current, 100)], all);
    expect(analysis.swapSuggestions).toHaveLength(1);
    const suggested = analysis.swapSuggestions[0].suggestedFund;
    const maxScore = Math.max(...all.filter((f) => f.isin !== current.isin).map(absoluteScore));
    expect(absoluteScore(suggested)).toBe(maxScore);
    expect(suggested.isin).toBe("SE0000003");
  });

  it("skickar med fondens rådata orörd — jämförelsen visar samma siffror som scoren använde", () => {
    const current = makeFund({ isin: "SE0000001", name: "Nuvarande", sharpe_3yr: 0.3, ongoing_cost_actual: 1.4, return_3yr: 8.123 });
    const better = makeFund({ isin: "SE0000002", name: "Bättre", sharpe_3yr: 1.1, ongoing_cost_actual: 0.22, return_3yr: 25.456 });

    const analysis = analyzePortfolio([makeEntry(current, 100)], [current, better]);
    const swap = analysis.swapSuggestions[0];
    // Inga omräknade/avrundade kopior — exakt samma objektvärden som i databasen
    expect(swap.suggestedFund.sharpe_3yr).toBe(1.1);
    expect(swap.suggestedFund.ongoing_cost_actual).toBe(0.22);
    expect(swap.suggestedFund.return_3yr).toBe(25.456);
    expect(swap.currentFund.sharpe_3yr).toBe(0.3);
    expect(swap.currentFund.ongoing_cost_actual).toBe(1.4);
    expect(swap.currentFund.return_3yr).toBe(8.123);
  });

  it("bytesskälet bygger på 3-årsavkastning, inte 1 år", () => {
    const current = makeFund({
      isin: "SE0000001", name: "Nuvarande",
      sharpe_3yr: null, ongoing_cost_actual: 0.5, return_3yr: 8, return_1yr: 2,
    });
    const better = makeFund({
      isin: "SE0000002", name: "Bättre",
      sharpe_3yr: null, ongoing_cost_actual: 0.5, return_3yr: 20, return_1yr: 1,
    });

    const analysis = analyzePortfolio([makeEntry(current, 100)], [current, better]);
    const swap = analysis.swapSuggestions[0];
    expect(swap.improvement.return3yr).toBeCloseTo(12);
    expect(swap.improvement.return1yr).toBeUndefined();
    expect(swap.reason).toContain("3-årsavkastning");
    expect(swap.reason).not.toContain("1-årsavkastning");
  });

  it("bättre 1-årsavkastning ensam kan inte motivera ett byte", () => {
    // Identiska fonder förutom 1-årsavkastningen (som inte visas i jämförelsen)
    const current = makeFund({ isin: "SE0000001", name: "Nuvarande", return_1yr: 2 });
    const peer = makeFund({ isin: "SE0000002", name: "Peer", return_1yr: 40 });

    const analysis = analyzePortfolio([makeEntry(current, 100)], [current, peer]);
    // Lika score → inget byte; fonden stämplas som bäst i kategorin
    expect(analysis.swapSuggestions).toHaveLength(0);
    expect(analysis.bestInCategory.some((b) => b.isin === "SE0000001")).toBe(true);
  });

  it("föreslår aldrig en fond utan avgiftsdata (skulle se konstlat billig ut)", () => {
    const current = makeFund({ isin: "SE0000001", name: "Nuvarande", sharpe_3yr: 0.3, ongoing_cost_actual: 1.4 });
    const noCost = makeFund({
      isin: "SE0000002", name: "Okänd avgift",
      sharpe_3yr: 2.0, ongoing_cost_actual: null, ongoing_cost_estimated: null,
    });

    const analysis = analyzePortfolio([makeEntry(current, 100)], [current, noCost]);
    expect(analysis.swapSuggestions).toHaveLength(0);
  });

  it("improvement-siffrorna är exakt differensen av fondernas råvärden", () => {
    const current = makeFund({ isin: "SE0000001", name: "A", sharpe_3yr: 0.4, ongoing_cost_actual: 1.5, return_3yr: 10 });
    const better = makeFund({ isin: "SE0000002", name: "B", sharpe_3yr: 1.0, ongoing_cost_actual: 0.3, return_3yr: 24 });

    const analysis = analyzePortfolio([makeEntry(current, 100)], [current, better]);
    const imp = analysis.swapSuggestions[0].improvement;
    expect(imp.sharpe).toBeCloseTo(0.6);
    expect(imp.cost).toBeCloseTo(1.2);
    expect(imp.return3yr).toBeCloseTo(14);
  });
});
