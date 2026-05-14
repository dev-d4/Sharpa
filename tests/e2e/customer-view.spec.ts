import { test, expect } from "@playwright/test";

function buildRapportUrl(params: {
  custodian: string;
  funds: { isin: string; weight: number }[];
  amount?: number;
  client?: string;
}): string {
  const p = Buffer.from(JSON.stringify(params)).toString("base64");
  return `/rapport?p=${p}`;
}

const BASE_URL = buildRapportUrl({
  custodian: "avanza",
  funds: [
    { isin: "SE0005188836", weight: 70 },
    { isin: "SE0000813933", weight: 30 },
  ],
  amount: 500_000,
  client: "Test Kund",
});

const CUSTOMER_URL = BASE_URL + "&kund=1";

test.describe("Kundvy (kund=1) – skrivskyddat läge", () => {
  test("renderar rapporten utan JS-krasch", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(CUSTOMER_URL);
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });

  test("redigeringskontroller är dolda", async ({ page }) => {
    await page.goto(CUSTOMER_URL);
    await page.waitForLoadState("networkidle");

    // Pencil-ikoner (redigera sammanfattning) ska inte synas
    await expect(page.locator("svg.lucide-pencil")).not.toBeVisible();
  });

  test("sektionsinställningar (layout-editor) är dolda", async ({ page }) => {
    await page.goto(CUSTOMER_URL);
    await page.waitForLoadState("networkidle");

    // Settings2-ikon för layoutjustering
    await expect(page.locator("svg.lucide-settings-2")).not.toBeVisible();
  });

  test("dela-knappen är dold", async ({ page }) => {
    await page.goto(CUSTOMER_URL);
    await page.waitForLoadState("networkidle");

    // Link2-ikon för att generera kundlänk
    await expect(page.locator("svg.lucide-link-2")).not.toBeVisible();
  });

  test("acceptera-knappar för fondbyte är dolda", async ({ page }) => {
    await page.goto(CUSTOMER_URL);
    await page.waitForLoadState("networkidle");

    // CheckCircle2-ikon för att acceptera swap
    await expect(page.locator("svg.lucide-check-circle-2")).not.toBeVisible();
  });

  test("portföljinnehållet är fortfarande synligt", async ({ page }) => {
    await page.goto(CUSTOMER_URL);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByText(/Länsförsäkringar|Global Index|SE0005188836/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("avgiftsräknaren är synlig när amount är satt", async ({ page }) => {
    await page.goto(CUSTOMER_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/avgiftsräknare|avgift per år/i).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Layout-persistens via ?layout=", () => {
  test("bevarar layout från URL-parameter", async ({ page }) => {
    // En anpassad layout: holdings + metrics sida vid sida
    const layout = JSON.stringify([
      { ids: ["holdings", "metrics"] },
      { ids: ["swaps"] },
    ]);
    const layoutParam = Buffer.from(layout).toString("base64");
    const url = CUSTOMER_URL + `&layout=${layoutParam}`;

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(url);
    await page.waitForLoadState("networkidle");

    // Ska inte krascha på en giltig layout
    expect(errors).toHaveLength(0);
  });

  test("ignorerar ogiltig layout-parameter utan krasch", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(CUSTOMER_URL + "&layout=!!!ogiltigt!!!");
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });
});

test.describe("Rådgivarvy – dela kundlänk", () => {
  test("dela-knappen finns i rådgivarläge", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    // Link2-ikon för delningsfunktion ska finnas
    await expect(page.locator("svg.lucide-link-2").first()).toBeAttached({ timeout: 10_000 });
  });
});
