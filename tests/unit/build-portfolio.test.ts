import { describe, expect, it } from "vitest";
import { isBroadGlobalEquityCategory, SELECTION_FILTER } from "@/app/api/build-portfolio/route";

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
