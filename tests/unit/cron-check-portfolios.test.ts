import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Behörighetskontrollen på cron-routen. Store och fondhämtning mockas så att
 * testet aldrig rör databasen — poängen är att ett anrop utan korrekt
 * CRON_SECRET avvisas innan något arbete alls påbörjas.
 */

const listPortfolios = vi.fn(async () => []);

vi.mock("@/lib/portfolio-watch-store", () => ({
  createSupabaseWatchStore: () => ({
    getFundDataVersion: async () => "2026-08-04T03:00:00.000Z",
    listPortfolios,
    getAlertPreferences: async () => new Map(),
    getUserEmail: async () => null,
    getPreviousMetrics: async () => new Map(),
    insertHistory: async () => ({ inserted: true, id: "h1" }),
    updatePortfolio: async () => {},
    markNotified: async () => {},
    markNotificationFailed: async () => {},
  }),
}));

vi.mock("@/lib/analysis-service", () => ({
  loadCustodianFunds: async () => [],
  analyzePortfolioEntries: async () => ({ analysis: {}, entries: [] }),
}));

const originalSecret = process.env.CRON_SECRET;

beforeEach(() => {
  listPortfolios.mockClear();
  process.env.CRON_SECRET = "hemlig-cron-nyckel";
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

function request(authorization?: string) {
  return new NextRequest("https://sharpa.se/api/cron/check-portfolios", {
    headers: authorization ? { authorization } : {},
  });
}

describe("GET /api/cron/check-portfolios", () => {
  it("avvisar anrop utan Authorization-header", async () => {
    const { GET } = await import("@/app/api/cron/check-portfolios/route");
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(listPortfolios).not.toHaveBeenCalled();
  });

  it("avvisar fel CRON_SECRET", async () => {
    const { GET } = await import("@/app/api/cron/check-portfolios/route");
    const res = await GET(request("Bearer fel-nyckel"));
    expect(res.status).toBe(401);
    expect(listPortfolios).not.toHaveBeenCalled();
  });

  it("avvisar rätt nyckel utan Bearer-prefix", async () => {
    const { GET } = await import("@/app/api/cron/check-portfolios/route");
    const res = await GET(request("hemlig-cron-nyckel"));
    expect(res.status).toBe(401);
  });

  it("avvisar allt när CRON_SECRET saknas i miljön", async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import("@/app/api/cron/check-portfolios/route");
    expect((await GET(request("Bearer "))).status).toBe(401);
    expect((await GET(request())).status).toBe(401);
    expect(listPortfolios).not.toHaveBeenCalled();
  });

  it("släpper igenom korrekt CRON_SECRET", async () => {
    const { GET } = await import("@/app/api/cron/check-portfolios/route");
    const res = await GET(request("Bearer hemlig-cron-nyckel"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, checked: 0 });
    expect(listPortfolios).toHaveBeenCalledOnce();
  });
});
