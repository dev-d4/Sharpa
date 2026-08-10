import { test, expect } from "@playwright/test";
import { ENTERPRISE_FEATURES_ENABLED } from "../../lib/features";

test.describe("Publik åtkomst", () => {
  test("landningssidan är tillgänglig utan lösenord", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("Integrationsguide – innehåll", () => {
  // Guiden är en enterprise-funktion — sidan visar en platshållare när flaggan är av
  test.skip(!ENTERPRISE_FEATURES_ENABLED, "Enterprise-funktioner avstängda (lib/features.ts)");

  test.beforeEach(async ({ page }) => {
    await page.goto("/radgivning/fundguide");
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
