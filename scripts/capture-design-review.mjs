import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = "http://localhost:3001";
const outputDir = path.join(process.cwd(), "design-review-screenshots");
fs.mkdirSync(outputDir, { recursive: true });

const envText = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
const passwordLine = envText.split(/\r?\n/).find((line) => line.startsWith("INTEGRATION_PASSWORD="));
let integrationPassword = passwordLine?.slice(passwordLine.indexOf("=") + 1).trim();
if (
  integrationPassword &&
  (integrationPassword.startsWith('"') || integrationPassword.startsWith("'"))
) {
  integrationPassword = integrationPassword.slice(1, -1);
}

const reportPayload = Buffer.from(JSON.stringify({
  custodian: "avanza",
  amount: 1_000_000,
  client: "Exempelkund",
  funds: [
    { isin: "NO0013583344", weight: 25 },
    { isin: "NO0010827819", weight: 15 },
    { isin: "FI4000530647", weight: 15 },
    { isin: "SE0001838004", weight: 15 },
    { isin: "LU0261948904", weight: 10 },
    { isin: "LU2437452928", weight: 10 },
    { isin: "SE0000813933", weight: 10 },
  ],
})).toString("base64");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

if (integrationPassword) {
  await context.addCookies([{
    name: "integration_auth",
    value: integrationPassword,
    url: baseUrl,
  }]);
}

await context.addInitScript(() => {
  localStorage.setItem("fondanalys_cookie_consent", "accepted");
});

async function capture(name, route, viewport, options = {}) {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  if (options.waitFor) {
    await page.getByText(options.waitFor).first().waitFor({ state: "attached", timeout: 30_000 });
    await page.waitForTimeout(2_000);
  }
  await page.screenshot({
    path: path.join(outputDir, `${name}.png`),
    fullPage: options.fullPage ?? true,
  });
  await page.close();
}

await capture("01-landningssida-desktop", "/", { width: 1440, height: 1000 });
await capture("02-landningssida-mobil", "/", { width: 390, height: 844 });
await capture("03-analyzer-start-desktop", "/analyze", { width: 1440, height: 1000 });
await capture("04-bygg-portfolj-desktop", "/bygg-portfolj", { width: 1440, height: 1000 });
await capture("05-bygg-portfolj-mobil", "/bygg-portfolj", { width: 390, height: 844 });
await capture("06-login-mobil", "/login", { width: 390, height: 844 });
await capture("07-faq-desktop", "/faq", { width: 1440, height: 1000 });
await capture(
  "08-kundrapport-desktop",
  `/rapport?p=${reportPayload}`,
  { width: 1440, height: 1000 },
  { waitFor: "Exempelkund" },
);
await capture(
  "09-kundrapport-mobil",
  `/rapport?p=${reportPayload}`,
  { width: 390, height: 844 },
  { waitFor: "Exempelkund" },
);
await capture(
  "10-professionell-landningssida-desktop",
  "/radgivning/portfolioanalysis",
  { width: 1440, height: 1000 },
);

const analysisPage = await context.newPage();
await analysisPage.setViewportSize({ width: 1440, height: 1000 });
await analysisPage.goto(`${baseUrl}/analyze`, { waitUntil: "networkidle" });
await analysisPage.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
await analysisPage.getByRole("button", { name: "Avanza", exact: true }).click();
await analysisPage.getByRole("button", { name: /Sök manuellt/ }).click();
await analysisPage.getByPlaceholder("Sök fondnamn eller ISIN…").first().fill("SE0005188836");
await analysisPage.getByRole("listitem").filter({ hasText: "SE0005188836" }).first().click();
await analysisPage.getByRole("button", { name: "Analysera portfölj" }).click();
await analysisPage.locator("section.no-print").filter({ hasText: "Portföljbetyg" }).first().waitFor({ timeout: 30_000 });
await analysisPage.waitForTimeout(1_000);
await analysisPage.evaluate(() => window.scrollTo(0, 0));
await analysisPage.screenshot({
  path: path.join(outputDir, "11-analysresultat-desktop.png"),
  fullPage: true,
});
await analysisPage.setViewportSize({ width: 390, height: 844 });
await analysisPage.screenshot({
  path: path.join(outputDir, "12-analysresultat-mobil.png"),
  fullPage: true,
});
await analysisPage.close();

await browser.close();
