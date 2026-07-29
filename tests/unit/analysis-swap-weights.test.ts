import { describe, expect, it } from "vitest";
import { analyzePortfolio, equalizeGroupWeights, type PortfolioEntry, type SwapSuggestion } from "@/lib/analysis";
import type { Fund } from "@/lib/supabase";

// ── Lika vikt inom en bytesgrupp ──────────────────────────────────────────────
// När flera nuvarande fonder byts mot samma alternativfond bildar de en grupp.
// Gruppens totalvikt ska vara oförändrad, men fördelad lika (1/n) mellan de
// nuvarande fonderna — annars blir gruppens nuvarande position och det
// alternativa scenariot felviktade.

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

function makeSwap(currentIsin: string, suggestedIsin: string, weight: number): SwapSuggestion {
  return {
    currentFund: makeFund({ isin: currentIsin, name: `Nuvarande ${currentIsin}` }),
    suggestedFund: makeFund({ isin: suggestedIsin, name: `Alternativ ${suggestedIsin}` }),
    reason: "",
    similarityNote: "",
    improvement: {},
    consolidate: false,
    weight,
  };
}

describe("equalizeGroupWeights", () => {
  it("ger varje nuvarande fond 1/n av gruppens totalvikt", () => {
    const swaps = [
      makeSwap("SE0000001", "SE0000900", 60),
      makeSwap("SE0000002", "SE0000900", 20),
    ];

    equalizeGroupWeights(swaps);

    expect(swaps[0].weight).toBe(40);
    expect(swaps[1].weight).toBe(40);
  });

  it("bevarar gruppens totalvikt", () => {
    const swaps = [
      makeSwap("SE0000001", "SE0000900", 50),
      makeSwap("SE0000002", "SE0000900", 25),
      makeSwap("SE0000003", "SE0000900", 5),
    ];
    const before = swaps.reduce((sum, s) => sum + s.weight, 0);

    equalizeGroupWeights(swaps);

    expect(swaps.reduce((sum, s) => sum + s.weight, 0)).toBeCloseTo(before, 10);
    for (const s of swaps) expect(s.weight).toBeCloseTo(80 / 3, 10);
  });

  it("lämnar en ensam fond i sin grupp orörd", () => {
    const swaps = [
      makeSwap("SE0000001", "SE0000900", 70),
      makeSwap("SE0000002", "SE0000901", 30),
    ];

    equalizeGroupWeights(swaps);

    expect(swaps[0].weight).toBe(70);
    expect(swaps[1].weight).toBe(30);
  });

  it("viktar grupper oberoende av varandra", () => {
    const swaps = [
      makeSwap("SE0000001", "SE0000900", 30),
      makeSwap("SE0000002", "SE0000900", 10),
      makeSwap("SE0000003", "SE0000901", 45),
      makeSwap("SE0000004", "SE0000901", 15),
    ];

    equalizeGroupWeights(swaps);

    expect(swaps[0].weight).toBe(20);
    expect(swaps[1].weight).toBe(20);
    expect(swaps[2].weight).toBe(30);
    expect(swaps[3].weight).toBe(30);
  });
});

describe("analyzePortfolio tillämpar lika vikt inom bytesgrupper", () => {
  it("två ojämnt viktade fonder som pekar mot samma alternativ får samma vikt", () => {
    // Två svaga globalfonder med olika vikt, en klart starkare i samma kategori
    const weakA = makeFund({ isin: "SE0000001", name: "Svag A", sharpe_3yr: 0.2, ongoing_cost_actual: 1.4 });
    const weakB = makeFund({ isin: "SE0000002", name: "Svag B", sharpe_3yr: 0.3, ongoing_cost_actual: 1.2 });
    const strong = makeFund({ isin: "SE0000900", name: "Stark", sharpe_3yr: 1.5, ongoing_cost_actual: 0.1, return_3yr: 40 });

    const entries: PortfolioEntry[] = [
      { isin: weakA.isin, weight: 70, fund: weakA },
      { isin: weakB.isin, weight: 30, fund: weakB },
    ];

    const analysis = analyzePortfolio(entries, [weakA, weakB, strong]);
    const group = analysis.swapSuggestions.filter((s) => s.suggestedFund.isin === strong.isin);

    expect(group).toHaveLength(2);
    expect(group[0].weight).toBe(50);
    expect(group[1].weight).toBe(50);
  });
});
