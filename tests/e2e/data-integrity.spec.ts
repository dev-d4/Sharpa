import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { absoluteScore } from "../../lib/analysis";
import { FUND_SOURCES, formatRefreshDate, oldestSourceRefresh } from "../../lib/freshness";
import type { Fund } from "../../lib/supabase";

/**
 * Dataintegritet hela vägen: databas → analys-API → UI.
 *
 * Verifierar mot den RIKTIGA databasen att
 *  1. nyckeltalen som analysen visar är exakt databasens värden (som i sin tur
 *     är källornas värden — fältmappningen låses av source-mapping.test.ts),
 *  2. fonden som föreslås i fondbytesförslagen faktiskt vinner på de nyckeltal
 *     som visas i jämförelsen (avgift, avkastning 3 år, Sharpe),
 *  3. datanoten "Fonddata senast uppdaterad X" visar den äldsta källans
 *     senaste uppdatering — inte den färskaste radens.
 */

function loadEnv(): Record<string, string> | null {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return null;
  return Object.fromEntries(
    fs.readFileSync(p, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")])
  );
}

const env = loadEnv();

async function dbQuery<T>(query: string): Promise<T> {
  const res = await fetch(`${env!.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${query}`, {
    headers: { apikey: env!.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  });
  if (!res.ok) throw new Error(`Supabase REST ${res.status}: ${query}`);
  return res.json();
}

function fundCost(f: Fund): number | null {
  return f.ongoing_cost_actual ?? f.ongoing_cost_estimated;
}

// Deterministiskt testobjekt: första Avanza-fonden (per ISIN) med kompletta nyckeltal
async function pickTestFund(): Promise<Fund> {
  const rows = await dbQuery<Fund[]>(
    "funds?source=eq.avanza&sharpe_3yr=not.is.null&return_3yr=not.is.null&ongoing_cost_actual=not.is.null&category=not.is.null&order=isin&limit=1"
  );
  expect(rows.length).toBe(1);
  return rows[0];
}

test.describe("dataintegritet: databas → API → UI", () => {
  test.skip(!env, "kräver .env.local med Supabase-uppgifter");

  test("analys-API:t levererar exakt databasens nyckeltal", async ({ request }) => {
    const dbFund = await pickTestFund();

    const res = await request.post("/api/analyze", {
      data: { custodian: "avanza", entries: [{ isin: dbFund.isin, weight: 100 }] },
    });
    expect(res.ok()).toBe(true);
    const analysis = await res.json();

    // Portföljens viktade nyckeltal för en enda fond = fondens egna värden
    expect(analysis.weightedSharpe).toBeCloseTo(dbFund.sharpe_3yr!, 10);
    expect(analysis.weightedReturn3yr).toBeCloseTo(dbFund.return_3yr!, 10);
    expect(analysis.weightedReturn1yr === null || dbFund.return_1yr === null
      ? analysis.weightedReturn1yr === dbFund.return_1yr
      : Math.abs(analysis.weightedReturn1yr - dbFund.return_1yr!) < 1e-9).toBe(true);
    expect(analysis.avgCost).toBeCloseTo(fundCost(dbFund)!, 10);

    // Bytesförslagets fondobjekt ska vara databasens rådata, orörd
    for (const swap of analysis.swapSuggestions ?? []) {
      expect(swap.currentFund.isin).toBe(dbFund.isin);
      expect(swap.currentFund.sharpe_3yr).toBe(dbFund.sharpe_3yr);
      expect(swap.currentFund.return_3yr).toBe(dbFund.return_3yr);
      expect(swap.currentFund.return_1yr).toBe(dbFund.return_1yr);
      expect(swap.currentFund.ongoing_cost_actual).toBe(dbFund.ongoing_cost_actual);

      const [dbSuggested] = await dbQuery<Fund[]>(`funds?isin=eq.${swap.suggestedFund.isin}&limit=1`);
      expect(dbSuggested).toBeDefined();
      expect(swap.suggestedFund.sharpe_3yr).toBe(dbSuggested.sharpe_3yr);
      expect(swap.suggestedFund.return_3yr).toBe(dbSuggested.return_3yr);
      expect(swap.suggestedFund.ongoing_cost_actual).toBe(dbSuggested.ongoing_cost_actual);
      expect(swap.suggestedFund.ongoing_cost_estimated).toBe(dbSuggested.ongoing_cost_estimated);
    }
  });

  test("föreslagen fond vinner på jämförelsens nyckeltal och skälen matchar råvärdena", async ({ request }) => {
    const dbFund = await pickTestFund();

    const res = await request.post("/api/analyze", {
      data: { custodian: "avanza", entries: [{ isin: dbFund.isin, weight: 100 }] },
    });
    const analysis = await res.json();

    for (const swap of analysis.swapSuggestions ?? []) {
      // Scoren bygger enbart på jämförelsens nyckeltal — alternativet måste vinna
      expect(absoluteScore(swap.suggestedFund)).toBeGreaterThan(absoluteScore(swap.currentFund));
      // Aldrig en fond utan avgiftsdata
      expect(fundCost(swap.suggestedFund)).not.toBeNull();
      // Improvement = exakt differens av råvärdena; inga legacy-fält skrivs längre
      expect(swap.improvement.return1yr).toBeUndefined();
      if (swap.improvement.sharpe !== undefined) {
        expect(swap.improvement.sharpe).toBeCloseTo(swap.suggestedFund.sharpe_3yr - swap.currentFund.sharpe_3yr, 10);
      }
      if (swap.improvement.cost !== undefined) {
        expect(swap.improvement.cost).toBeCloseTo(fundCost(swap.currentFund)! - fundCost(swap.suggestedFund)!, 10);
      }
      if (swap.improvement.return3yr !== undefined) {
        expect(swap.improvement.return3yr).toBeCloseTo(swap.suggestedFund.return_3yr - swap.currentFund.return_3yr, 10);
      }
    }
  });

  test("datanoten visar den äldsta källans senaste uppdatering", async ({ page }) => {
    // Förväntat datum direkt ur databasen — per källa, äldsta vinner
    const perSource = await Promise.all(
      FUND_SOURCES.map(async (source) => {
        const rows = await dbQuery<{ fetched_at: string }[]>(
          `funds?source=eq.${source}&select=fetched_at&order=fetched_at.desc&limit=1`
        );
        return { source, fetchedAt: rows[0]?.fetched_at ?? null };
      })
    );
    const expectedTs = oldestSourceRefresh(perSource);
    expect(expectedTs).not.toBeNull();
    const expectedText = `Fonddata senast uppdaterad ${formatRefreshDate(expectedTs!)}`;

    // Kör en analys i UI:t så att noten visas, och jämför exakt text
    const dbFund = await pickTestFund();
    await page.goto("/analyze");
    await page.getByRole("button", { name: "Avanza", exact: true }).click();
    await page.getByRole("button", { name: /Sök manuellt/ }).click();
    await page.getByPlaceholder("Sök fondnamn eller ISIN…").first().fill(dbFund.isin);
    await page.getByRole("listitem").filter({ hasText: dbFund.isin }).first().click();
    await page.getByRole("button", { name: "Analysera portfölj" }).click();

    await expect(page.getByText(/^Fonddata senast uppdaterad /)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/^Fonddata senast uppdaterad /)).toHaveText(expectedText);
  });
});
