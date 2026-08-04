import { describe, expect, it } from "vitest";
import { allocateSelectionWeights, isBroadGlobalEquityCategory, SELECTION_FILTER } from "@/app/api/build-portfolio/route";

describe("build-portfolio category filters", () => {
  const fund = (category: string | null, equityStyleBox: string | null = null) => ({
    isin: "SE0000000000",
    name: "Testfond",
    category,
    category_group: "Equity",
    selection_id: null,
    equity_style_box: equityStyleBox,
    sharpe_3yr: null,
    return_1yr: null,
    return_3yr: null,
    ongoing_cost_actual: null,
    ongoing_cost_estimated: null,
    investment_type: null,
  });

  it("behandlar bara bred global exponering som valet Global", () => {
    expect(isBroadGlobalEquityCategory("Global, Mix bolag")).toBe(true);
    expect(isBroadGlobalEquityCategory("Global & Sverige")).toBe(true);
    expect(isBroadGlobalEquityCategory("Global, Tillväxtbolag")).toBe(false);
    expect(isBroadGlobalEquityCategory("Global, Värdebolag")).toBe(false);
    expect(isBroadGlobalEquityCategory("Global, Små/medelstora bolag")).toBe(false);
  });

  it("låter stilvalet Tillväxtaktier hantera tillväxtfonder separat", () => {
    const growthFund = fund("Global, Tillväxtbolag", "Large Growth");

    expect(SELECTION_FILTER.global(growthFund)).toBe(false);
    expect(SELECTION_FILTER.growth(growthFund)).toBe(true);
  });
});

describe("build-portfolio asset allocation", () => {
  it("behåller 20% aktier när många aktiekategorier väljs", () => {
    const selections = ["global", "sweden", "usa", "europe", "nordic", "emerging", "asia", "tech"] as const;
    const result = allocateSelectionWeights(20, [...selections], {});

    expect(result.selections).toHaveLength(4);
    expect(result.weights).toEqual([5, 5, 5, 5]);
    expect(result.weights.reduce((sum, weight) => sum + weight, 0)).toBe(20);
  });

  it("omfördelar små prioritetsvikter inom tillgångsslaget", () => {
    const result = allocateSelectionWeights(
      20,
      ["global", "sweden", "usa", "europe"],
      { global: 1, sweden: 2, usa: 3, europe: 3 },
    );

    expect(result.weights.every((weight) => weight >= 5)).toBe(true);
    expect(result.weights.reduce((sum, weight) => sum + weight, 0)).toBe(20);
  });

  it("behåller även den valda totalen för räntekategorier", () => {
    const result = allocateSelectionWeights(
      40,
      ["bond-sek", "bond-global", "bond-highyield"],
      { "bond-sek": 1, "bond-global": 2, "bond-highyield": 3 },
    );

    expect(result.weights.reduce((sum, weight) => sum + weight, 0)).toBe(40);
  });
});
