import { describe, it, expect } from "vitest";
import {
  decideNotification,
  deriveChangeReasons,
  buildMetricsSnapshot,
  getScoreDropThreshold,
  DEFAULT_SCORE_DROP_THRESHOLD,
  MAX_REASONS,
  type PortfolioMetricsSnapshot,
} from "@/lib/portfolio-watch";
import type { PortfolioAnalysis } from "@/lib/analysis";

const base = {
  lastNotifiedScore: null,
  alertsEnabled: true,
  threshold: DEFAULT_SCORE_DROP_THRESHOLD,
};

describe("decideNotification", () => {
  it("skapar bara en baslinje första gången — inget mejl", () => {
    expect(decideNotification({ ...base, previousScore: null, newScore: 7.4 })).toBe("baseline");
  });

  it("oförändrat betyg ger inget mejl", () => {
    expect(decideNotification({ ...base, previousScore: 7.4, newScore: 7.4 })).toBe("unchanged");
  });

  it("förbättrat betyg ger inget mejl", () => {
    expect(decideNotification({ ...base, previousScore: 7.4, newScore: 8.1 })).toBe("improved");
  });

  it("försämring under tröskeln ger inget mejl", () => {
    // 0,4 poäng < 0,5
    expect(decideNotification({ ...base, previousScore: 7.4, newScore: 7.0 })).toBe("below-threshold");
  });

  it("försämring exakt på tröskeln ger mejl", () => {
    expect(decideNotification({ ...base, previousScore: 7.5, newScore: 7.0 })).toBe("notify");
  });

  it("försämring över tröskeln ger mejl", () => {
    expect(decideNotification({ ...base, previousScore: 7.8, newScore: 6.9 })).toBe("notify");
  });

  it("jämför decimaler, inte avrundade heltal", () => {
    // 7,6 → 7,0 är en försämring på 0,6. Avrundat till heltal (8 → 7) hade
    // skillnaden sett ut som exakt 1, och 7,6 → 7,4 (0,2) hade sett ut som 1
    // den också. Decimaljämförelsen skiljer på fallen.
    expect(decideNotification({ ...base, previousScore: 7.6, newScore: 7.0 })).toBe("notify");
    expect(decideNotification({ ...base, previousScore: 7.6, newScore: 7.4 })).toBe("below-threshold");
  });

  it("fångar en långsam nedgång i steg under tröskeln", () => {
    // Betyget glider 8,0 → 7,6 → 7,2. Inget enskilt steg når 0,5, men sedan det
    // senast mejlade betyget 8,0 har portföljen tappat 0,8.
    expect(
      decideNotification({ ...base, previousScore: 8.0, newScore: 7.6, lastNotifiedScore: 8.0 })
    ).toBe("below-threshold");
    expect(
      decideNotification({ ...base, previousScore: 7.6, newScore: 7.2, lastNotifiedScore: 8.0 })
    ).toBe("notify");
  });

  it("mejlar inte igen medan betyget ligger kvar efter en notis", () => {
    // Efter utskicket är lastNotifiedScore det nya betyget — ligger det stilla
    // finns inget nytt att berätta.
    expect(
      decideNotification({ ...base, previousScore: 6.4, newScore: 6.4, lastNotifiedScore: 6.4 })
    ).toBe("unchanged");
  });

  it("låter en återhämtning räknas som förbättring, inte som fall mot baslinjen", () => {
    // Mejlat vid 8,0, sedan nedgång till 7,6 utan mejl. Går betyget upp igen
    // ska baslinjen inte göra rörelsen till en försämring.
    expect(
      decideNotification({ ...base, previousScore: 7.6, newScore: 7.9, lastNotifiedScore: 8.0 })
    ).toBe("improved");
  });

  it("respekterar avstängda notiser", () => {
    expect(
      decideNotification({ ...base, previousScore: 7.8, newScore: 6.9, alertsEnabled: false })
    ).toBe("alerts-disabled");
  });

  it("mejlar inte om samma betyg redan notifierats", () => {
    expect(
      decideNotification({ ...base, previousScore: 7.8, newScore: 6.9, lastNotifiedScore: 6.9 })
    ).toBe("already-notified");
  });

  it("mejlar igen när betyget fortsätter nedåt", () => {
    expect(
      decideNotification({ ...base, previousScore: 6.9, newScore: 6.2, lastNotifiedScore: 6.9 })
    ).toBe("notify");
  });

  it("använder konfigurerad tröskel", () => {
    expect(decideNotification({ ...base, previousScore: 7.4, newScore: 7.1, threshold: 0.2 })).toBe("notify");
    expect(decideNotification({ ...base, previousScore: 7.4, newScore: 7.1, threshold: 1.0 })).toBe("below-threshold");
  });
});

describe("getScoreDropThreshold", () => {
  it("faller tillbaka på 0,5 när variabeln saknas", () => {
    expect(getScoreDropThreshold({})).toBe(0.5);
  });

  it("läser giltigt värde", () => {
    expect(getScoreDropThreshold({ PORTFOLIO_SCORE_DROP_THRESHOLD: "0.8" })).toBe(0.8);
  });

  it("ignorerar skräp och nollvärden i stället för att tysta all bevakning", () => {
    expect(getScoreDropThreshold({ PORTFOLIO_SCORE_DROP_THRESHOLD: "abc" })).toBe(0.5);
    expect(getScoreDropThreshold({ PORTFOLIO_SCORE_DROP_THRESHOLD: "0" })).toBe(0.5);
    expect(getScoreDropThreshold({ PORTFOLIO_SCORE_DROP_THRESHOLD: "-2" })).toBe(0.5);
  });
});

// ── Orsaker ───────────────────────────────────────────────────────────────────

function metrics(over: Partial<PortfolioMetricsSnapshot> = {}): PortfolioMetricsSnapshot {
  return {
    avgCost: 0.4,
    weightedSharpe: 1.0,
    weightedReturn3yr: 30,
    diversifiedCategories: 4,
    notFoundCount: 0,
    missingMetricCount: 0,
    swapSuggestionCount: 0,
    funds: [],
    ...over,
  };
}

describe("deriveChangeReasons", () => {
  it("ger inga orsaker utan tidigare underlag", () => {
    expect(deriveChangeReasons(null, metrics())).toEqual([]);
  });

  it("upptäcker försämrad riskjusterad avkastning", () => {
    const reasons = deriveChangeReasons(metrics(), metrics({ weightedSharpe: 0.7 }));
    expect(reasons.map((r) => r.key)).toContain("sharpe");
  });

  it("upptäcker sämre treårsavkastning", () => {
    const reasons = deriveChangeReasons(metrics(), metrics({ weightedReturn3yr: 22 }));
    expect(reasons.map((r) => r.key)).toContain("return3yr");
  });

  it("upptäcker höjd avgift", () => {
    const reasons = deriveChangeReasons(metrics(), metrics({ avgCost: 0.75 }));
    expect(reasons.map((r) => r.key)).toContain("cost");
  });

  it("upptäcker fonder som tappat mot förra kontrollen", () => {
    const prev = metrics({
      funds: [
        { isin: "SE1", sharpe3yr: 1.2, return3yr: 30, cost: 0.3 },
        { isin: "SE2", sharpe3yr: 0.9, return3yr: 20, cost: 0.4 },
      ],
    });
    const next = metrics({
      funds: [
        { isin: "SE1", sharpe3yr: 0.8, return3yr: 30, cost: 0.3 },
        { isin: "SE2", sharpe3yr: 0.5, return3yr: 20, cost: 0.4 },
      ],
    });
    const reason = deriveChangeReasons(prev, next).find((r) => r.key === "funds-behind-peers");
    expect(reason?.text).toContain("2 av dina fonder");
  });

  it("upptäcker försämrad diversifiering", () => {
    const reasons = deriveChangeReasons(metrics(), metrics({ diversifiedCategories: 2 }));
    expect(reasons.map((r) => r.key)).toContain("diversification");
  });

  it("upptäcker saknad eller inaktuell fonddata", () => {
    const reasons = deriveChangeReasons(metrics(), metrics({ notFoundCount: 2 }));
    expect(reasons.map((r) => r.key)).toContain("stale-data");
  });

  it("förklarar alltid en dimension som dragit ned betyget", () => {
    // Avgiften har kryssat en tröskel i betyget (8 → 6 poäng) men rört sig för
    // lite för en egen mening. Utan delpoängerna hade mejlet blivit tomt.
    const reasons = deriveChangeReasons(
      metrics({ scoreComponents: [{ key: "cost", points: 8 }] }),
      metrics({ avgCost: 0.41, scoreComponents: [{ key: "cost", points: 6 }] })
    );
    expect(reasons.map((r) => r.key)).toEqual(["cost"]);
    expect(reasons[0].text).toContain("avgiftsnivå");
  });

  it("föredrar den detaljerade meningen när nyckeltalen räcker till den", () => {
    const reasons = deriveChangeReasons(
      metrics({ scoreComponents: [{ key: "cost", points: 8 }] }),
      metrics({ avgCost: 0.75, scoreComponents: [{ key: "cost", points: 4 }] })
    );
    expect(reasons[0].key).toBe("cost");
    expect(reasons[0].text).toContain("0,75 %");
  });

  it("rankar dimensionen med störst betygsfall först", () => {
    const reasons = deriveChangeReasons(
      metrics({
        scoreComponents: [
          { key: "cost", points: 10 },
          { key: "sharpe", points: 10 },
        ],
      }),
      metrics({
        avgCost: 0.45,
        weightedSharpe: 0.3,
        scoreComponents: [
          { key: "cost", points: 8 },
          { key: "sharpe", points: 4 },
        ],
      })
    );
    expect(reasons.map((r) => r.key)).toEqual(["sharpe", "cost"]);
  });

  it("faller tillbaka på nyckeltalsjämförelsen för historik utan delpoäng", () => {
    // Historikrader skrivna innan delpoängen infördes saknar scoreComponents.
    const reasons = deriveChangeReasons(metrics(), metrics({ weightedSharpe: 0.7 }));
    expect(reasons.map((r) => r.key)).toContain("sharpe");
  });

  it("ignorerar rörelser som ligger inom brusnivån", () => {
    const reasons = deriveChangeReasons(
      metrics(),
      metrics({ weightedSharpe: 0.98, weightedReturn3yr: 29.8, avgCost: 0.41 })
    );
    expect(reasons).toEqual([]);
  });

  it("visar högst tre orsaker, de tyngsta först", () => {
    const prev = metrics({
      funds: [{ isin: "SE1", sharpe3yr: 1.2, return3yr: 30, cost: 0.3 }],
    });
    const next = metrics({
      avgCost: 1.2,
      weightedSharpe: 0.2,
      weightedReturn3yr: 5,
      diversifiedCategories: 1,
      notFoundCount: 3,
      funds: [{ isin: "SE1", sharpe3yr: 0.1, return3yr: 5, cost: 1.2 }],
    });
    const reasons = deriveChangeReasons(prev, next);
    expect(reasons).toHaveLength(MAX_REASONS);
    expect(reasons[0].weight).toBeGreaterThanOrEqual(reasons[1].weight);
    expect(reasons[1].weight).toBeGreaterThanOrEqual(reasons[2].weight);
  });

  it("formulerar orsaker beskrivande, utan köp- eller säljuppmaningar", () => {
    const reasons = deriveChangeReasons(
      metrics(),
      metrics({ weightedSharpe: 0.5, avgCost: 0.9, weightedReturn3yr: 10 })
    );
    const text = reasons.map((r) => r.text).join(" ").toLowerCase();
    for (const word of ["köp", "sälj", "byt", "rekommenderar", "bör du"]) {
      expect(text).not.toContain(word);
    }
  });
});

describe("buildMetricsSnapshot", () => {
  const analysis = {
    avgCost: 0.35,
    weightedSharpe: 1.1,
    weightedReturn3yr: 28,
    notFound: ["SE0000000001"],
    detailedBreakdown: [
      { label: "Global", weight: 60 },
      { label: "Sverige", weight: 30 },
      { label: "Smulor", weight: 3 },
    ],
    categoryBreakdown: [],
    swapSuggestions: [{}, {}],
  } as unknown as PortfolioAnalysis;

  it("plockar ut portföljnivåns nyckeltal", () => {
    const snap = buildMetricsSnapshot(analysis);
    expect(snap.avgCost).toBe(0.35);
    expect(snap.weightedSharpe).toBe(1.1);
    expect(snap.weightedReturn3yr).toBe(28);
    expect(snap.notFoundCount).toBe(1);
    expect(snap.swapSuggestionCount).toBe(2);
  });

  it("räknar bara kategorier över 5 % som diversifiering", () => {
    expect(buildMetricsSnapshot(analysis).diversifiedCategories).toBe(2);
  });

  it("tar med nyckeltal per fond när innehaven finns med", () => {
    const snap = buildMetricsSnapshot(analysis, [
      {
        isin: "SE0000000002",
        weight: 100,
        fund: {
          sharpe_3yr: 0.9,
          return_3yr: 25,
          ongoing_cost_actual: null,
          ongoing_cost_estimated: 0.4,
        },
      },
    ] as never);
    expect(snap.funds).toEqual([
      { isin: "SE0000000002", sharpe3yr: 0.9, return3yr: 25, cost: 0.4 },
    ]);
    expect(snap.missingMetricCount).toBe(0);
  });
});
