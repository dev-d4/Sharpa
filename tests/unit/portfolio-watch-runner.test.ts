import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  runPortfolioWatch,
  type HistoryRow,
  type NotificationRecord,
  type PortfolioPatch,
  type WatchPortfolio,
  type WatchStore,
} from "@/lib/portfolio-watch-runner";
import type { PortfolioMetricsSnapshot } from "@/lib/portfolio-watch";
import type { PortfolioAnalysis } from "@/lib/analysis";
import type { Fund } from "@/lib/supabase";
import type { Custodian } from "@/lib/funds";
import type { SendEmailResult } from "@/lib/email/resend";
import type { PortfolioAlertRequest } from "@/lib/email/send-portfolio-alert";

type SendAlertFn = (req: PortfolioAlertRequest) => Promise<SendEmailResult>;

/**
 * Bevakningskörningen testas mot en fejkad store och en fejkad utskickare.
 * Ingen databas, ingen Resend, inga nätanrop — men hela beslutskedjan från
 * "vilken fonddata gäller" till "bokfördes notisen" täcks.
 */

const VERSION_A = "2026-07-28T03:00:00.000Z";
const VERSION_B = "2026-08-04T03:00:00.000Z";

// ── Fejkad store ──────────────────────────────────────────────────────────────

type FakeState = {
  fundDataVersion: string | null;
  portfolios: WatchPortfolio[];
  prefs: Map<string, boolean>;
  emails: Map<string, string>;
  previousMetrics: Map<string, PortfolioMetricsSnapshot>;
  history: HistoryRow[];
  patches: { id: string; patch: PortfolioPatch }[];
  notified: NotificationRecord[];
  failedNotifications: string[];
};

function makeStore(over: Partial<FakeState> = {}) {
  const state: FakeState = {
    fundDataVersion: VERSION_B,
    portfolios: [],
    prefs: new Map(),
    emails: new Map([["user-1", "a@example.com"]]),
    previousMetrics: new Map(),
    history: [],
    patches: [],
    notified: [],
    failedNotifications: [],
    ...over,
  };

  const store: WatchStore = {
    getFundDataVersion: async () => state.fundDataVersion,
    listPortfolios: async () => state.portfolios,
    getAlertPreferences: async () => state.prefs,
    getUserEmail: async (id) => state.emails.get(id) ?? null,
    getPreviousMetrics: async () => state.previousMetrics,
    insertHistory: async (row) => {
      const exists = state.history.some(
        (h) => h.portfolio_id === row.portfolio_id && h.fund_data_version === row.fund_data_version
      );
      if (exists) return { inserted: false, id: null };
      state.history.push(row);
      return { inserted: true, id: `hist-${state.history.length}` };
    },
    updatePortfolio: async (id, patch) => {
      state.patches.push({ id, patch });
      const p = state.portfolios.find((x) => x.id === id);
      if (p) {
        p.score = patch.score;
        p.analysis = patch.analysis;
        p.last_checked_fund_version = patch.last_checked_fund_version;
      }
    },
    markNotified: async (record) => {
      state.notified.push(record);
      const p = state.portfolios.find((x) => x.id === record.portfolioId);
      if (p) p.last_notification_score = record.score;
    },
    markNotificationFailed: async (id) => {
      state.failedNotifications.push(id);
    },
  };

  return { store, state };
}

// ── Fejkad analys ─────────────────────────────────────────────────────────────

/**
 * Bygger en analys vars betyg blir ungefär `target`. computePortfolioScore
 * medelvärdesbildar fyra dimensioner; här sätts avgift, Sharpe och 3 års
 * avkastning i toppintervallet och diversifieringen används som ratt.
 */
function analysisWithMetrics(over: Partial<PortfolioAnalysis> = {}): PortfolioAnalysis {
  return {
    totalWeight: 100,
    notFound: [],
    categoryBreakdown: [],
    detailedBreakdown: [
      { label: "Global", weight: 40 },
      { label: "Sverige", weight: 30 },
      { label: "USA", weight: 20 },
      { label: "Räntor", weight: 10 },
    ],
    managementBreakdown: { active: 0, passive: 100, unknown: 0 },
    concentrationWarnings: [],
    avgCost: 0.15,
    weightedReturn1yr: 12,
    weightedReturn3yr: 45,
    weightedSharpe: 1.4,
    weightedAlpha: null,
    weightedBeta: null,
    weightedStdDev: null,
    weightedReturn5yr: null,
    swapSuggestions: [],
    bestInCategory: [],
    summaryText: "",
    suggestedMetrics: null,
    ...over,
  } as PortfolioAnalysis;
}

/** Toppbetyg: 10 på alla fyra dimensioner. */
const EXCELLENT = analysisWithMetrics();

/** Lägre betyg via sämre Sharpe och avkastning. */
const DEGRADED = analysisWithMetrics({
  weightedSharpe: 0.6,
  weightedReturn3yr: 10,
  avgCost: 0.5,
});

function portfolio(over: Partial<WatchPortfolio> = {}): WatchPortfolio {
  return {
    id: "p-1",
    user_id: "user-1",
    name: "ISK",
    custodian: "avanza",
    holdings: [{ isin: "SE0000000001", weight: "100" }],
    analysis: EXCELLENT,
    score: 10,
    last_notification_score: null,
    last_checked_fund_version: VERSION_A,
    ...over,
  };
}

function analyzeReturning(analysis: PortfolioAnalysis) {
  return vi.fn(async () => ({ analysis, entries: [] as never[] }));
}

let sendAlert: Mock<SendAlertFn>;

beforeEach(() => {
  sendAlert = vi.fn<SendAlertFn>(async () => ({ ok: true, messageId: "msg-1" }));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// ── Tester ────────────────────────────────────────────────────────────────────

describe("runPortfolioWatch", () => {
  it("analyserar mot aktuell fonddata, inte den sparade analys-snapshoten", async () => {
    // Sparad snapshot ger toppbetyg. Aktuell fonddata ger ett sämre.
    const { store, state } = makeStore({ portfolios: [portfolio({ analysis: EXCELLENT, score: 10 })] });
    const analyze = analyzeReturning(DEGRADED);

    const result = await runPortfolioWatch({ store, analyze, sendAlert });

    expect(analyze).toHaveBeenCalledOnce();
    expect(result.updated).toBe(1);
    // Nytt betyg är lägre än det sparade — hade vi räknat på snapshoten hade
    // det varit oförändrat 10.
    expect(state.patches[0].patch.score).toBeLessThan(10);
    expect(state.patches[0].patch.analysis).toBe(DEGRADED);
    expect(sendAlert).toHaveBeenCalledOnce();
  });

  it("hämtar fondunderlaget en gång per depå, inte en gång per portfölj", async () => {
    const { store } = makeStore({
      portfolios: [
        portfolio({ id: "p-1", custodian: "avanza" }),
        portfolio({ id: "p-2", custodian: "avanza" }),
        portfolio({ id: "p-3", custodian: "nordnet" }),
      ],
    });
    const loadFunds = vi.fn<(custodian: Custodian) => Promise<Fund[]>>(async () => []);

    await runPortfolioWatch({
      store,
      analyze: analyzeReturning(EXCELLENT),
      sendAlert,
      loadFunds,
      batchSize: 10,
    });

    expect(loadFunds.mock.calls.map((c) => c[0]).sort()).toEqual(["avanza", "nordnet"]);
  });

  it("skapar baslinje utan mejl första gången", async () => {
    const { store, state } = makeStore({
      portfolios: [portfolio({ score: null, analysis: null, last_checked_fund_version: null })],
    });

    const result = await runPortfolioWatch({
      store,
      analyze: analyzeReturning(DEGRADED),
      sendAlert,
    });

    expect(result.updated).toBe(1);
    expect(result.notified).toBe(0);
    expect(sendAlert).not.toHaveBeenCalled();
    expect(state.history[0].previous_score).toBeNull();
    expect(result.decisions.baseline).toBe(1);
  });

  it("skickar inget mejl vid oförändrat betyg", async () => {
    const { store } = makeStore({ portfolios: [portfolio({ score: 10 })] });

    const result = await runPortfolioWatch({ store, analyze: analyzeReturning(EXCELLENT), sendAlert });

    expect(sendAlert).not.toHaveBeenCalled();
    expect(result.decisions.unchanged).toBe(1);
  });

  it("skickar inget mejl vid förbättrat betyg", async () => {
    const { store } = makeStore({ portfolios: [portfolio({ score: 5 })] });

    const result = await runPortfolioWatch({ store, analyze: analyzeReturning(EXCELLENT), sendAlert });

    expect(sendAlert).not.toHaveBeenCalled();
    expect(result.improved).toBe(1);
    expect(result.decisions.improved).toBe(1);
  });

  it("skickar inget mejl vid försämring under tröskeln", async () => {
    // Nytt betyg blir 10; tidigare 10,3 ⇒ försämring 0,3 < 0,5.
    const { store } = makeStore({ portfolios: [portfolio({ score: 10.3 })] });

    const result = await runPortfolioWatch({ store, analyze: analyzeReturning(EXCELLENT), sendAlert });

    expect(sendAlert).not.toHaveBeenCalled();
    expect(result.decisions["below-threshold"]).toBe(1);
  });

  it("skickar exakt ett mejl vid försämring över tröskeln", async () => {
    const { store, state } = makeStore({ portfolios: [portfolio({ score: 10 })] });

    const result = await runPortfolioWatch({ store, analyze: analyzeReturning(DEGRADED), sendAlert });

    expect(sendAlert).toHaveBeenCalledOnce();
    expect(result.notified).toBe(1);
    expect(state.notified).toHaveLength(1);
    expect(state.notified[0].messageId).toBe("msg-1");
  });

  it("skickar inte om körningen görs om med samma fonddata", async () => {
    const { store, state } = makeStore({ portfolios: [portfolio({ score: 10 })] });
    const analyze = analyzeReturning(DEGRADED);

    await runPortfolioWatch({ store, analyze, sendAlert });
    expect(sendAlert).toHaveBeenCalledOnce();

    // Andra körningen: samma fonddataversion. Portföljen är redan kontrollerad.
    const second = await runPortfolioWatch({ store, analyze, sendAlert });

    expect(sendAlert).toHaveBeenCalledOnce();
    expect(second.checked).toBe(0);
    expect(second.skipped).toBe(1);
    expect(state.history).toHaveLength(1);
  });

  it("stoppas av historikens unika constraint även om versionsflaggan missats", async () => {
    // Simulerar att uppdateringen av last_checked_fund_version inte hann skrivas:
    // historikraden finns redan och ska stoppa körningen innan utskicket.
    const { store, state } = makeStore({ portfolios: [portfolio({ score: 10 })] });
    state.history.push({
      portfolio_id: "p-1",
      fund_data_version: VERSION_B,
    } as HistoryRow);

    const result = await runPortfolioWatch({
      store,
      analyze: analyzeReturning(DEGRADED),
      sendAlert,
    });

    expect(sendAlert).not.toHaveBeenCalled();
    expect(result.decisions["already-processed"]).toBe(1);
    expect(state.patches).toHaveLength(0);
  });

  it("markerar inte som notifierad när Resend misslyckas", async () => {
    const failing = vi.fn(async () => ({ ok: false as const, error: "rate limited" }));
    const { store, state } = makeStore({ portfolios: [portfolio({ score: 10 })] });

    const result = await runPortfolioWatch({
      store,
      analyze: analyzeReturning(DEGRADED),
      sendAlert: failing,
    });

    expect(result.notified).toBe(0);
    expect(result.failed).toBe(1);
    expect(state.notified).toHaveLength(0);
    expect(state.failedNotifications).toEqual(["p-1"]);
  });

  it("markerar inte som notifierad när utskicket hoppas över i testläge", async () => {
    const skipping = vi.fn(async () => ({ ok: false as const, skipped: true as const, reason: "testläge" }));
    const { store, state } = makeStore({ portfolios: [portfolio({ score: 10 })] });

    const result = await runPortfolioWatch({
      store,
      analyze: analyzeReturning(DEGRADED),
      sendAlert: skipping,
    });

    expect(result.notified).toBe(0);
    expect(state.notified).toHaveLength(0);
    expect(result.decisions["send-skipped"]).toBe(1);
  });

  it("respekterar avstängda notiser men uppdaterar ändå betyget", async () => {
    const { store, state } = makeStore({
      portfolios: [portfolio({ score: 10 })],
      prefs: new Map([["user-1", false]]),
    });

    const result = await runPortfolioWatch({ store, analyze: analyzeReturning(DEGRADED), sendAlert });

    expect(sendAlert).not.toHaveBeenCalled();
    expect(result.decisions["alerts-disabled"]).toBe(1);
    // Analysen och betyget sparas ändå — bevakning ≠ notiser.
    expect(result.updated).toBe(1);
    expect(state.patches).toHaveLength(1);
  });

  it("behandlar saknad inställning som påslagen", async () => {
    const { store } = makeStore({ portfolios: [portfolio({ score: 10 })], prefs: new Map() });

    await runPortfolioWatch({ store, analyze: analyzeReturning(DEGRADED), sendAlert });

    expect(sendAlert).toHaveBeenCalledOnce();
  });

  it("låter ett fel i en portfölj inte stoppa övriga", async () => {
    const { store, state } = makeStore({
      portfolios: [
        portfolio({ id: "p-broken", score: 10 }),
        portfolio({ id: "p-ok", score: 10 }),
      ],
    });
    const analyze = vi.fn(async (entries: { isin: string }[]) => {
      if (entries[0].isin === "BOOM") throw new Error("fonddata gick inte att läsa");
      return { analysis: DEGRADED, entries: [] as never[] };
    });
    state.portfolios[0].holdings = [{ isin: "BOOM", weight: "100" }];

    const result = await runPortfolioWatch({ store, analyze: analyze as never, sendAlert, batchSize: 5 });

    expect(result.failed).toBe(1);
    expect(result.updated).toBe(1);
    expect(state.patches.map((p) => p.id)).toEqual(["p-ok"]);
    expect(sendAlert).toHaveBeenCalledOnce();
  });

  it("hoppar över hela körningen när fonddataversion saknas", async () => {
    const { store } = makeStore({
      fundDataVersion: null,
      portfolios: [portfolio({ score: 10 })],
    });
    const analyze = analyzeReturning(DEGRADED);

    const result = await runPortfolioWatch({ store, analyze, sendAlert });

    expect(analyze).not.toHaveBeenCalled();
    expect(sendAlert).not.toHaveBeenCalled();
    expect(result.checked).toBe(0);
  });

  it("hoppar över portföljer utan innehav", async () => {
    const { store } = makeStore({ portfolios: [portfolio({ holdings: [] })] });
    const analyze = analyzeReturning(DEGRADED);

    const result = await runPortfolioWatch({ store, analyze, sendAlert });

    expect(analyze).not.toHaveBeenCalled();
    expect(result.decisions["no-holdings"]).toBe(1);
  });

  it("skickar inget mejl utan e-postadress", async () => {
    const { store } = makeStore({
      portfolios: [portfolio({ score: 10 })],
      emails: new Map(),
    });

    const result = await runPortfolioWatch({ store, analyze: analyzeReturning(DEGRADED), sendAlert });

    expect(sendAlert).not.toHaveBeenCalled();
    expect(result.decisions["no-email"]).toBe(1);
  });

  it("skickar orsaker och betyg vidare till mejlet", async () => {
    const { store } = makeStore({ portfolios: [portfolio({ score: 10 })] });

    await runPortfolioWatch({ store, analyze: analyzeReturning(DEGRADED), sendAlert });

    const req = sendAlert.mock.calls[0][0];
    expect(req.portfolioId).toBe("p-1");
    expect(req.previousScore).toBe(10);
    expect(req.newScore).toBeLessThan(10);
    expect(req.fundDataVersion).toBe(VERSION_B);
    expect(req.reasons.length).toBeGreaterThan(0);
    expect(req.reasons.length).toBeLessThanOrEqual(3);
  });

  it("avbryter efter tidsbudgeten och rapporterar återstoden", async () => {
    const { store } = makeStore({
      portfolios: [
        portfolio({ id: "p-1" }),
        portfolio({ id: "p-2" }),
        portfolio({ id: "p-3" }),
        portfolio({ id: "p-4" }),
      ],
    });

    // Klockan hoppar framåt vid varje avläsning, så budgeten passeras direkt
    // efter första batchen.
    let tick = 0;
    const now = () => new Date(tick++ * 10_000);

    const result = await runPortfolioWatch({
      store,
      analyze: analyzeReturning(EXCELLENT),
      sendAlert,
      batchSize: 2,
      timeBudgetMs: 5_000,
      now,
    });

    expect(result.remaining).toBeGreaterThan(0);
    expect(result.checked).toBeLessThan(4);
  });
});
