import { test, expect } from "@playwright/test";
import { ENTERPRISE_FEATURES_ENABLED } from "../../lib/features";

const PASSWORD = process.env.INTEGRATION_PASSWORD ?? "password123";

test.describe("Integrationsguidens lösenordsskydd", () => {
  test.beforeEach(async ({ context }) => {
    // Börja utan integration_auth-cookie
    await context.clearCookies();
  });

  test("omdirigerar till login när integration_auth saknas", async ({ page }) => {
    await page.goto("/radgivning/fundguide");
    await expect(page).toHaveURL(/\/radgivning\/fundguide\/login/);
  });

  test("visar felmeddelande vid fel lösenord", async ({ page }) => {
    await page.goto("/radgivning/fundguide/login");
    await page.getByRole("textbox").fill("fel-lösenord");
    await page.getByRole("button", { name: /logga in|fortsätt/i }).click();
    await expect(page.getByText(/fel lösenord/i)).toBeVisible();
    await expect(page).toHaveURL(/\/radgivning\/fundguide\/login/);
  });

  test("beviljar åtkomst vid rätt lösenord", async ({ page }) => {
    await page.goto("/radgivning/fundguide/login");
    await page.getByRole("textbox").fill(PASSWORD);
    await page.getByRole("button", { name: /logga in|fortsätt/i }).click();
    await expect(page).toHaveURL(/\/radgivning\/fundguide/);
    await expect(page).not.toHaveURL(/\/radgivning\/fundguide\/login/);
  });

  test("integration_auth-cookien bevaras vid sidladdning", async ({ page }) => {
    // Logga in
    await page.goto("/radgivning/fundguide/login");
    await page.getByRole("textbox").fill(PASSWORD);
    await page.getByRole("button", { name: /logga in|fortsätt/i }).click();
    await page.waitForURL(/\/radgivning\/fundguide(?!\/login)/);

    // Ladda om utan att rensa cookies → ska fortfarande ha åtkomst
    await page.reload();
    await expect(page).not.toHaveURL(/\/radgivning\/fundguide\/login/);
  });

  test("tomma API-routes utanför /radgivning/fundguide blockeras inte", async ({ request }) => {
    // /api/analyze ska vara tillgänglig utan integration_auth-cookie
    const res = await request.post("/api/analyze", {
      data: { custodian: "avanza", entries: [{ isin: "SE0005188836", weight: 100 }] },
    });
    // Ska inte ge 302-redirect (middleware-blockering)
    expect(res.status()).not.toBe(302);
    expect(res.status()).not.toBe(401);
  });
});

test.describe("Integrationsguide – innehåll", () => {
  // Guiden är en enterprise-funktion — sidan visar en platshållare när flaggan är av
  test.skip(!ENTERPRISE_FEATURES_ENABLED, "Enterprise-funktioner avstängda (lib/features.ts)");

  test.beforeEach(async ({ page }) => {
    // Logga in inför varje test
    await page.goto("/radgivning/fundguide/login");
    await page.getByRole("textbox").fill(PASSWORD);
    await page.getByRole("button", { name: /logga in|fortsätt/i }).click();
    await page.waitForURL(/\/radgivning\/fundguide(?!\/login)/);
  });

  test("visar URL-byggaren", async ({ page }) => {
    await expect(page.getByText(/custodian|plattform/i).first()).toBeVisible();
  });

  test("visar kodexempel", async ({ page }) => {
    // TypeScript-exemplet ska visa Buffer.from (UTF-8 safe)
    await expect(page.getByText(/Buffer\.from/)).toBeVisible();
  });

  test("genererar URL när fonder fylls i", async ({ page }) => {
    // Sidan laddas med defaultfonder → "Öppna rapport"-länken visas direkt
    await expect(page.getByRole("link", { name: /öppna rapport/i })).toBeVisible({ timeout: 10_000 });

    // ISIN-fältet med placeholder "SE0000000000" ska finnas
    await expect(page.getByPlaceholder("SE0000000000").first()).toBeVisible();
  });
});
