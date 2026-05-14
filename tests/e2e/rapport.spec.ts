import { test, expect } from "@playwright/test";

// ── Hjälpfunktion: bygger en /rapport-URL med UTF-8-säker base64 ───────────────
function buildRapportUrl(params: {
  custodian: string;
  funds: { isin: string; weight: number }[];
  amount?: number;
  client?: string;
  comment?: string;
}): string {
  // Node.js Buffer hanterar UTF-8 korrekt
  const p = Buffer.from(JSON.stringify(params)).toString("base64");
  return `/rapport?p=${p}`;
}

// Riktiga ISINar som finns i databasen (Avanza)
const VALID_URL = buildRapportUrl({
  custodian: "avanza",
  funds: [
    { isin: "SE0005188836", weight: 70 }, // Länsförsäkringar Global Index
    { isin: "SE0000813933", weight: 30 }, // SPP Aktiefond Sverige
  ],
});

const VALID_URL_WITH_META = buildRapportUrl({
  custodian: "avanza",
  funds: [{ isin: "SE0005188836", weight: 100 }],
  amount: 850_000,
  client: "Björn Åkesson",
  comment: "Rådgivarens kommentar till kunden.",
});

test.describe("Rapport – giltig URL", () => {
  test("renderar rapporten utan JS-krasch", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(VALID_URL);
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });

  test("visar portföljinnehåll (Holdings-sektion)", async ({ page }) => {
    await page.goto(VALID_URL);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByText(/Länsförsäkringar|Global Index|SE0005188836/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("visar nyckeltal (avgift, avkastning)", async ({ page }) => {
    await page.goto(VALID_URL);
    await page.waitForLoadState("networkidle");
    // Avgiftskolumn eller Sharpe-text
    await expect(page.getByText(/avgift|Sharpe|avkastning/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("visar tillgångsfördelning (donut-diagram) när sektionen ingår i layout", async ({ page }) => {
    // asset-allocation är inte i DEFAULT_LAYOUT — måste skickas via ?layout=
    const layout = JSON.stringify([{ ids: ["asset-allocation"] }, { ids: ["holdings"] }]);
    const layoutParam = Buffer.from(layout).toString("base64");
    await page.goto(VALID_URL + `&layout=${layoutParam}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Tillgångsfördelning").first()).toBeVisible({ timeout: 15_000 });
  });

  test("visar kundnamn när client är satt", async ({ page }) => {
    await page.goto(VALID_URL_WITH_META);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Björn Åkesson").first()).toBeVisible({ timeout: 15_000 });
  });

  test("visar rådgivarkommentar när comment är satt", async ({ page }) => {
    await page.goto(VALID_URL_WITH_META);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Rådgivarens kommentar till kunden.")).toBeVisible({ timeout: 15_000 });
  });

  test("visar avgiftsräknare när amount är satt", async ({ page }) => {
    await page.goto(VALID_URL_WITH_META);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/avgiftsräknare|avgift per år/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("döljer avgiftsräknare när amount saknas", async ({ page }) => {
    const urlWithoutAmount = buildRapportUrl({
      custodian: "avanza",
      funds: [{ isin: "SE0005188836", weight: 100 }],
    });
    await page.goto(urlWithoutAmount);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/avgiftsräknare/i)).not.toBeVisible();
  });

  test("hanterar svenska tecken i kundnamn (UTF-8)", async ({ page }) => {
    const url = buildRapportUrl({
      custodian: "avanza",
      funds: [{ isin: "SE0005188836", weight: 100 }],
      client: "Åsa Öberg",
      comment: "Välkommen till rådgivningen!",
    });
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(url);
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
    await expect(page.getByText("Åsa Öberg").first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Rapport – ogiltig URL", () => {
  test("visar felmeddelande för ogiltig base64", async ({ page }) => {
    await page.goto("/rapport?p=!!!ogiltig!!!base64");
    await expect(page.getByText(/ogiltig länk|fel|saknas/i)).toBeVisible({ timeout: 10_000 });
  });

  test("visar felmeddelande när p-parametern saknas", async ({ page }) => {
    await page.goto("/rapport");
    await expect(page.getByText(/ogiltig länk|fel|saknas/i)).toBeVisible({ timeout: 10_000 });
  });

  test("visar felmeddelande för giltig base64 men ogiltig payload", async ({ page }) => {
    const bad = Buffer.from(JSON.stringify({ felaktigt: "format" })).toString("base64");
    await page.goto(`/rapport?p=${bad}`);
    await expect(page.getByText(/ogiltig länk|fel|saknas/i)).toBeVisible({ timeout: 10_000 });
  });

  test("kraschar inte vid okänd ISIN", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const url = buildRapportUrl({
      custodian: "avanza",
      funds: [{ isin: "XX0000OKAND99", weight: 100 }],
    });
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });

  test("visar varning för ISIN som inte hittades", async ({ page }) => {
    const url = buildRapportUrl({
      custodian: "avanza",
      funds: [{ isin: "XX0000OKAND99", weight: 100 }],
    });
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/hittades inte|okänd|XX0000OKAND99/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Rapport – redigeringsläge (ej kund)", () => {
  test("redigeringsknappar är synliga i rådgivarläge", async ({ page }) => {
    await page.goto(VALID_URL);
    await page.waitForLoadState("networkidle");
    // Redigera-knapp eller liknande redigeringskontroll
    const editBtn = page.locator("[data-testid='edit'], button[aria-label*='redigera'], button svg.lucide-pencil").first();
    // Minst en redigeringssymbol ska finnas i DOM (Pencil-ikon från lucide)
    await expect(page.locator("svg.lucide-pencil, [aria-label*='edit']").first()).toBeAttached({ timeout: 10_000 });
  });
});
