import { describe, expect, it } from "vitest";
import { analyzePortfolio, type PortfolioEntry } from "@/lib/analysis";
import type { Fund } from "@/lib/supabase";

// ── Hjälpfunktioner ───────────────────────────────────────────────────────────

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

// ── Kategorifördelning ────────────────────────────────────────────────────────

describe("categoryBreakdown", () => {
  it("beräknar korrekt kategorifördelning för en fond", () => {
    const f = makeFund({ isin: "SE0000001", name: "Global A", category_group: "Equity" });
    const analysis = analyzePortfolio([makeEntry(f, 100)], [f]);
    expect(analysis.categoryBreakdown).toHaveLength(1);
    expect(analysis.categoryBreakdown[0].label).toBe("Aktiefonder");
    expect(analysis.categoryBreakdown[0].weight).toBeCloseTo(100);
  });

  it("fördelar vikt korrekt mellan två kategorier", () => {
    const equity = makeFund({ isin: "SE0000001", name: "Aktier", category_group: "Equity" });
    const bond = makeFund({ isin: "SE0000002", name: "Räntor", category_group: "Fixed Income" });
    const analysis = analyzePortfolio(
      [makeEntry(equity, 70), makeEntry(bond, 30)],
      [equity, bond],
    );
    const equityCat = analysis.categoryBreakdown.find((c) => c.label === "Aktiefonder");
    const bondCat = analysis.categoryBreakdown.find((c) => c.label === "Räntefonder");
    expect(equityCat?.weight).toBeCloseTo(70);
    expect(bondCat?.weight).toBeCloseTo(30);
  });
});

// ── Viktade nyckeltal ─────────────────────────────────────────────────────────

describe("viktade nyckeltal", () => {
  it("beräknar viktad genomsnittsavgift", () => {
    const cheap = makeFund({ isin: "SE0000001", name: "Billig", ongoing_cost_actual: 0.2 });
    const exp = makeFund({ isin: "SE0000002", name: "Dyr", ongoing_cost_actual: 0.8 });
    const analysis = analyzePortfolio(
      [makeEntry(cheap, 50), makeEntry(exp, 50)],
      [cheap, exp],
    );
    // (0.2*50 + 0.8*50) / 100 = 0.5
    expect(analysis.avgCost).toBeCloseTo(0.5);
  });

  it("returnerar null för avgift om alla fonder saknar kostnadsdata", () => {
    const f = makeFund({ isin: "SE0000001", name: "Okänd", ongoing_cost_actual: null, ongoing_cost_estimated: null });
    const analysis = analyzePortfolio([makeEntry(f, 100)], [f]);
    expect(analysis.avgCost).toBeNull();
  });

  it("beräknar viktad Sharpe-kvot", () => {
    const a = makeFund({ isin: "SE0000001", name: "A", sharpe_3yr: 1.0 });
    const b = makeFund({ isin: "SE0000002", name: "B", sharpe_3yr: 0.5 });
    const analysis = analyzePortfolio(
      [makeEntry(a, 80), makeEntry(b, 20)],
      [a, b],
    );
    // (1.0*80 + 0.5*20) / 100 = 0.9
    expect(analysis.weightedSharpe).toBeCloseTo(0.9);
  });

  it("ignorerar null-Sharpe i viktad beräkning", () => {
    const a = makeFund({ isin: "SE0000001", name: "A", sharpe_3yr: 1.0 });
    const b = makeFund({ isin: "SE0000002", name: "B", sharpe_3yr: null });
    const analysis = analyzePortfolio(
      [makeEntry(a, 50), makeEntry(b, 50)],
      [a, b],
    );
    // Bara A bidrar: 1.0 * 50 / 50 = 1.0
    expect(analysis.weightedSharpe).toBeCloseTo(1.0);
  });
});

// ── Förvaltningsstil ──────────────────────────────────────────────────────────

describe("managementBreakdown", () => {
  it("klassificerar INDEX-fond som passiv", () => {
    const f = makeFund({ isin: "SE0000001", name: "Index", investment_type: "INDEX" });
    const { managementBreakdown } = analyzePortfolio([makeEntry(f, 100)], [f]);
    expect(managementBreakdown.passive).toBeCloseTo(100);
    expect(managementBreakdown.active).toBeCloseTo(0);
  });

  it("klassificerar ACTIVE-fond som aktiv", () => {
    const f = makeFund({ isin: "SE0000001", name: "Aktiv", investment_type: "ACTIVE" });
    const { managementBreakdown } = analyzePortfolio([makeEntry(f, 100)], [f]);
    expect(managementBreakdown.active).toBeCloseTo(100);
    expect(managementBreakdown.passive).toBeCloseTo(0);
  });

  it("blandar aktiv och passiv korrekt", () => {
    const active = makeFund({ isin: "SE0000001", name: "Aktiv", investment_type: "ACTIVE" });
    const passive = makeFund({ isin: "SE0000002", name: "Index", investment_type: "INDEX" });
    const { managementBreakdown } = analyzePortfolio(
      [makeEntry(active, 60), makeEntry(passive, 40)],
      [active, passive],
    );
    expect(managementBreakdown.active).toBeCloseTo(60);
    expect(managementBreakdown.passive).toBeCloseTo(40);
  });
});

// ── Okänd ISIN ────────────────────────────────────────────────────────────────

describe("notFound", () => {
  it("registrerar ISIN som inte finns i fonddatabasen", () => {
    const known = makeFund({ isin: "SE0000001", name: "Känd" });
    const entry: PortfolioEntry = { isin: "XX0000UNKNOWN", weight: 50, fund: null };
    const analysis = analyzePortfolio([makeEntry(known, 50), entry], [known]);
    expect(analysis.notFound).toContain("XX0000UNKNOWN");
  });
});

// ── Fondbytesförslag ──────────────────────────────────────────────────────────

describe("swapSuggestions", () => {
  it("föreslår byte när en peer har bättre nyckeltal", () => {
    const bad = makeFund({
      isin: "SE0000001", name: "Dålig Global",
      sharpe_3yr: 0.2, ongoing_cost_actual: 1.5, return_1yr: 2.0, return_3yr: 3.0,
    });
    const good = makeFund({
      isin: "SE0000002", name: "Bra Global",
      sharpe_3yr: 0.9, ongoing_cost_actual: 0.2, return_1yr: 9.0, return_3yr: 12.0,
    });
    // Båda i samma kategori → good är peer till bad
    const analysis = analyzePortfolio([makeEntry(bad, 100)], [bad, good]);
    expect(analysis.swapSuggestions).toHaveLength(1);
    expect(analysis.swapSuggestions[0].suggestedFund.isin).toBe("SE0000002");
  });

  it("föreslår inget byte om fonden redan är bäst i kategorin", () => {
    const best = makeFund({
      isin: "SE0000001", name: "Bäst Global",
      sharpe_3yr: 1.5, ongoing_cost_actual: 0.1, return_1yr: 15.0, return_3yr: 18.0,
    });
    const worse = makeFund({
      isin: "SE0000002", name: "Sämre Global",
      sharpe_3yr: 0.3, ongoing_cost_actual: 1.2, return_1yr: 3.0, return_3yr: 4.0,
    });
    const analysis = analyzePortfolio([makeEntry(best, 100)], [best, worse]);
    expect(analysis.swapSuggestions).toHaveLength(0);
    expect(analysis.bestInCategory?.some((b) => b.isin === "SE0000001")).toBe(true);
  });

  it("markerar consolidate=true om föreslagen fond redan finns i portföljen", () => {
    const bad = makeFund({
      isin: "SE0000001", name: "Dålig",
      sharpe_3yr: 0.2, ongoing_cost_actual: 1.5,
    });
    const good = makeFund({
      isin: "SE0000002", name: "Bra",
      sharpe_3yr: 0.9, ongoing_cost_actual: 0.2,
    });
    // Båda fonder finns i portföljen
    const analysis = analyzePortfolio(
      [makeEntry(bad, 50), makeEntry(good, 50)],
      [bad, good],
    );
    const swap = analysis.swapSuggestions.find((s) => s.currentFund.isin === "SE0000001");
    expect(swap?.consolidate).toBe(true);
  });

  it("jämför inte fonder i olika kategorier", () => {
    const global = makeFund({ isin: "SE0000001", name: "Global", category: "Global, Mix bolag" });
    const sweden = makeFund({
      isin: "SE0000002", name: "Sverige",
      category: "Sverige, Mix bolag",
      sharpe_3yr: 2.0, ongoing_cost_actual: 0.1,
    });
    // global och sweden är i olika kategorier → ingen swap
    const analysis = analyzePortfolio([makeEntry(global, 100)], [global, sweden]);
    expect(analysis.swapSuggestions).toHaveLength(0);
  });
});

// ── Geografisk matchning (Ex USA-bugfixen) ────────────────────────────────────

describe("geografisk peer-matchning", () => {
  it("matchar 'International (Ex USA)'-fond mot vanlig global fond", () => {
    const exUsa = makeFund({
      isin: "LU3096130664",
      name: "BMC International (Ex USA) R SEK",
      sharpe_3yr: null, ongoing_cost_actual: 1.54,
      category: "Global, Mix bolag",
    });
    const globalIdx = makeFund({
      isin: "SE0005188836",
      name: "Länsförsäkringar Global Index",
      sharpe_3yr: 0.91, ongoing_cost_actual: 0.22,
      return_1yr: 5.8, return_3yr: 13.0,
      category: "Global, Mix bolag",
    });
    // exUsa ska få ett förslag om byte till globalIdx (som är i samma peer-grupp)
    const analysis = analyzePortfolio([makeEntry(exUsa, 100)], [exUsa, globalIdx]);
    const swap = analysis.swapSuggestions[0];
    expect(swap).toBeDefined();
    expect(swap.suggestedFund.isin).toBe("SE0005188836");
  });
});

// ── Koncentrationsvarningar ───────────────────────────────────────────────────

describe("concentrationWarnings", () => {
  it("varnar om en specifik kategori utgör ≥50% av portföljen", () => {
    const f1 = makeFund({ isin: "SE0000001", name: "Global A", category: "Global, Mix bolag" });
    const f2 = makeFund({ isin: "SE0000002", name: "Global B", category: "Global, Mix bolag" });
    const f3 = makeFund({ isin: "SE0000003", name: "Sverige", category: "Sverige, Mix bolag" });
    const analysis = analyzePortfolio(
      [makeEntry(f1, 40), makeEntry(f2, 30), makeEntry(f3, 30)],
      [f1, f2, f3],
    );
    const warning = analysis.concentrationWarnings?.find(
      (w) => w.category === "Global, Mix bolag",
    );
    expect(warning).toBeDefined();
    expect(warning!.weight).toBeGreaterThanOrEqual(50);
  });

  it("varnar inte om ingen kategori överstiger 50%", () => {
    const f1 = makeFund({ isin: "SE0000001", name: "Global", category: "Global, Mix bolag" });
    const f2 = makeFund({ isin: "SE0000002", name: "Sverige", category: "Sverige, Mix bolag" });
    const f3 = makeFund({ isin: "SE0000003", name: "USA", category: "USA, Mix bolag" });
    const analysis = analyzePortfolio(
      [makeEntry(f1, 40), makeEntry(f2, 30), makeEntry(f3, 30)],
      [f1, f2, f3],
    );
    expect(analysis.concentrationWarnings ?? []).toHaveLength(0);
  });
});

// ── totalWeight-avvikelse ─────────────────────────────────────────────────────

describe("totalWeight", () => {
  it("summerar vikter korrekt", () => {
    const f1 = makeFund({ isin: "SE0000001", name: "A" });
    const f2 = makeFund({ isin: "SE0000002", name: "B" });
    const analysis = analyzePortfolio(
      [makeEntry(f1, 60), makeEntry(f2, 40)],
      [f1, f2],
    );
    expect(analysis.totalWeight).toBeCloseTo(100);
  });

  it("hanterar vikter som inte summerar till 100", () => {
    const f = makeFund({ isin: "SE0000001", name: "A" });
    const analysis = analyzePortfolio([makeEntry(f, 70)], [f]);
    expect(analysis.totalWeight).toBeCloseTo(70);
    // Notera avvikelse i detailedBreakdown-vikterna (summan normaliseras mot faktisk totalvikt)
    expect(analysis.detailedBreakdown[0].weight).toBeCloseTo(100);
  });
});
