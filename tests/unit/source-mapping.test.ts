import { describe, expect, it } from "vitest";
import { mapAvanzaToFund, type AvanzaFund } from "@/lib/avanza";
import { mapNordnetListToFund, type NordnetListFund } from "@/lib/nordnet";

// ── Datakorrekthet vid källan ─────────────────────────────────────────────────
// Nyckeltalen som visas på sajten (avgift, avkastning, Sharpe) måste vara EXAKT
// de värden källorna levererar — ingen omräkning, ingen förväxling av fält.
// Dessa tester låser fältmappningen: går ett av dem sönder visar sajten fel
// siffror mot vad Avanza/Nordnet visar.

function makeAvanzaRaw(overrides: Partial<AvanzaFund> = {}): AvanzaFund {
  return {
    isin: "LU1133292463",
    name: "BMC Global Select R SEK",
    currencyCode: "SEK",
    fundType: "EQUITY_FUND",
    category: "Global, Mix bolag",
    managedType: "ACTIVELY_MANAGED",
    developmentThisYear: 8.48735,
    developmentOneYear: 5.8874,
    developmentThreeYears: 30.512928,
    developmentFiveYears: 55.1,
    standardDeviation: 12.3,
    sharpeRatio: 0.56,
    totalFee: 1.67,
    managementFee: 1.5,
    esgScore: null,
    orderbookId: "12345",
    ...overrides,
  };
}

describe("Avanza-mappning: fält → nyckeltal", () => {
  it("mappar varje nyckeltal till rätt fält utan omräkning", () => {
    const fund = mapAvanzaToFund(makeAvanzaRaw(), 0);
    // Exakt källans värden — samma siffror som Avanza visar för fonden
    expect(fund.ongoing_cost_actual).toBe(1.67);      // totalFee
    expect(fund.ongoing_cost_estimated).toBe(1.5);    // managementFee
    expect(fund.return_ytd).toBe(8.48735);            // developmentThisYear
    expect(fund.return_1yr).toBe(5.8874);             // developmentOneYear
    expect(fund.return_3yr).toBe(30.512928);          // developmentThreeYears
    expect(fund.return_5yr).toBe(55.1);               // developmentFiveYears
    expect(fund.sharpe_3yr).toBe(0.56);               // sharpeRatio
    expect(fund.std_dev_3yr).toBe(12.3);              // standardDeviation
    expect(fund.isin).toBe("LU1133292463");
    expect(fund.name).toBe("BMC Global Select R SEK");
    expect(fund.category).toBe("Global, Mix bolag");
  });

  it("förväxlar aldrig 1-års- och 3-årsavkastning", () => {
    const fund = mapAvanzaToFund(
      makeAvanzaRaw({ developmentOneYear: 1.11, developmentThreeYears: 33.33 }),
      0,
    );
    expect(fund.return_1yr).toBe(1.11);
    expect(fund.return_3yr).toBe(33.33);
  });

  it("bevarar null när källan saknar värde (hittar inte på siffror)", () => {
    const fund = mapAvanzaToFund(
      makeAvanzaRaw({
        developmentOneYear: null,
        developmentThreeYears: null,
        sharpeRatio: null,
        totalFee: null,
        managementFee: null,
        standardDeviation: null,
      }),
      0,
    );
    expect(fund.return_1yr).toBeNull();
    expect(fund.return_3yr).toBeNull();
    expect(fund.sharpe_3yr).toBeNull();
    expect(fund.ongoing_cost_actual).toBeNull();
    expect(fund.ongoing_cost_estimated).toBeNull();
    expect(fund.std_dev_3yr).toBeNull();
  });

  it("mappar fondtyp till rätt kategorigrupp", () => {
    expect(mapAvanzaToFund(makeAvanzaRaw({ fundType: "EQUITY_FUND" }), 0).category_group).toBe("Equity");
    expect(mapAvanzaToFund(makeAvanzaRaw({ fundType: "INTEREST_FUND" }), 0).category_group).toBe("Fixed Income");
    expect(mapAvanzaToFund(makeAvanzaRaw({ fundType: "MIXED_FUND" }), 0).category_group).toBe("Allocation");
    expect(mapAvanzaToFund(makeAvanzaRaw({ fundType: "PÅHITTAD" }), 0).category_group).toBe("Other");
  });
});

function makeNordnetRaw(overrides: Partial<NordnetListFund> = {}): NordnetListFund {
  return {
    instrument_info: { instrument_id: 99, name: "Testfond Norden", isin: "SE0000000001" },
    fund_info: {
      fund_type: "Aktiefond",
      fund_category: "Norden",
      fund_yearly_fee: 0.42,
      fund_calculated_fee: 0.4,
    },
    historical_returns_info: { yield_1y: 7.5, yield_3y: 21.0, yield_5y: 40.0, yield_ytd: 3.2 },
    ...overrides,
  };
}

describe("Nordnet-mappning: fält → nyckeltal", () => {
  it("mappar varje nyckeltal till rätt fält utan omräkning", () => {
    const fund = mapNordnetListToFund(makeNordnetRaw(), 0);
    expect(fund.ongoing_cost_actual).toBe(0.42);  // fund_yearly_fee prioriteras
    expect(fund.return_ytd).toBe(3.2);
    expect(fund.return_1yr).toBe(7.5);
    expect(fund.return_3yr).toBe(21.0);
    expect(fund.return_5yr).toBe(40.0);
    expect(fund.isin).toBe("SE0000000001");
    // Nordnets list-API har ingen Sharpe — får inte hittas på
    expect(fund.sharpe_3yr).toBeNull();
  });

  it("faller tillbaka på fund_calculated_fee när fund_yearly_fee saknas", () => {
    const fund = mapNordnetListToFund(
      makeNordnetRaw({ fund_info: { fund_type: "Aktiefond", fund_calculated_fee: 0.4 } }),
      0,
    );
    expect(fund.ongoing_cost_actual).toBe(0.4);
  });

  it("faller tillbaka på annual_growth_1y för 1-årsavkastning", () => {
    const fund = mapNordnetListToFund(
      makeNordnetRaw({
        historical_returns_info: { yield_3y: 21.0 },
        annual_growth_info: { annual_growth_1y: 6.6 },
      }),
      0,
    );
    expect(fund.return_1yr).toBe(6.6);
    expect(fund.return_3yr).toBe(21.0);
  });

  it("bevarar null när källan saknar värden", () => {
    const fund = mapNordnetListToFund(
      { instrument_info: { instrument_id: 1, name: "Tom", isin: "SE0000000002" } },
      0,
    );
    expect(fund.return_1yr).toBeNull();
    expect(fund.return_3yr).toBeNull();
    expect(fund.ongoing_cost_actual).toBeNull();
  });
});
