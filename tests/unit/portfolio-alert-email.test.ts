import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildPortfolioAlertHtml,
  buildPortfolioAlertText,
  buildSubject,
  escapeHtml,
} from "@/lib/email/portfolio-alert";
import {
  isEmailSendingEnabled,
  getPortfolioAlertFrom,
  sendEmail,
  DEFAULT_PORTFOLIO_ALERT_FROM,
} from "@/lib/email/resend";
import { buildIdempotencyKey, getSiteUrl } from "@/lib/email/send-portfolio-alert";

const content = {
  portfolioName: "ISK Pension",
  previousScore: 7.8,
  newScore: 7.1,
  reasons: [
    "Portföljens riskjusterade avkastning (Sharpe) har försämrats, från 1,20 till 0,80.",
    "Den genomsnittliga avgiften har ökat, från 0,30 % till 0,45 %.",
  ],
  portfolioUrl: "https://sharpa.se/analyze?portfolio=abc",
  unsubscribeUrl: "https://sharpa.se/api/notifications/unsubscribe?token=t",
  preferencesUrl: "https://sharpa.se/account#notiser",
};

describe("mejlmall", () => {
  it("använder den begärda ämnesraden", () => {
    expect(buildSubject("ISK Pension")).toBe('Din portfölj “ISK Pension” har förändrats');
  });

  it("har rubriken 'Din portfölj har förändrats'", () => {
    expect(buildPortfolioAlertHtml(content)).toContain("Din portfölj har förändrats");
    expect(buildPortfolioAlertText(content)).toContain("Din portfölj har förändrats");
  });

  it("visar båda betygen och förändringen i poäng", () => {
    const html = buildPortfolioAlertHtml(content);
    expect(html).toContain("7,8");
    expect(html).toContain("7,1");
    expect(html).toContain("−0,7 poäng");
  });

  it("listar orsakerna och knappen som länkar till rätt portfölj", () => {
    const html = buildPortfolioAlertHtml(content);
    for (const reason of content.reasons) expect(html).toContain(escapeHtml(reason));
    expect(html).toContain("Se vad som har förändrats");
    expect(html).toContain('href="https://sharpa.se/analyze?portfolio=abc"');
  });

  it("förklarar metoden och att det inte är personlig rådgivning", () => {
    const html = buildPortfolioAlertHtml(content);
    expect(html).toContain("avgift, historisk avkastning och risk");
    expect(html).toContain("inte personlig finansiell rådgivning");
    expect(buildPortfolioAlertText(content)).toContain("inte personlig finansiell rådgivning");
  });

  it("har länkar för att hantera och stänga av bevakningen", () => {
    const html = buildPortfolioAlertHtml(content);
    expect(html).toContain(content.unsubscribeUrl);
    expect(html).toContain(content.preferencesUrl);
  });

  it("använder projektets accentfärg", () => {
    expect(buildPortfolioAlertHtml(content)).toContain("#1F3A5F");
    expect(buildPortfolioAlertHtml(content)).not.toContain("#0B6E99");
  });

  it("renderar inte HTML i portföljnamnet", () => {
    const html = buildPortfolioAlertHtml({
      ...content,
      portfolioName: '<img src=x onerror="alert(1)">Min "portfölj"',
    });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain('onerror="alert(1)"');
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("escapar även orsakstexter", () => {
    const html = buildPortfolioAlertHtml({ ...content, reasons: ["<b>fetstil</b>"] });
    expect(html).not.toContain("<b>fetstil</b>");
    expect(html).toContain("&lt;b&gt;fetstil&lt;/b&gt;");
  });

  it("har en klartextversion utan markup", () => {
    const text = buildPortfolioAlertText(content);
    expect(text).not.toContain("<");
    expect(text).toContain("Tidigare betyg: 7,8 / 10");
    expect(text).toContain("Nytt betyg:     7,1 / 10");
  });
});

describe("resend-wrapper", () => {
  it("skickar inte i testläge", () => {
    expect(isEmailSendingEnabled({ NODE_ENV: "test", RESEND_API_KEY: "re_123" })).toBe(false);
    expect(isEmailSendingEnabled({ VITEST: "true", RESEND_API_KEY: "re_123" })).toBe(false);
  });

  it("skickar inte utan API-nyckel", () => {
    expect(isEmailSendingEnabled({ NODE_ENV: "production" })).toBe(false);
  });

  it("skickar inte när EMAIL_DRY_RUN är på", () => {
    expect(
      isEmailSendingEnabled({ NODE_ENV: "production", RESEND_API_KEY: "re_123", EMAIL_DRY_RUN: "true" })
    ).toBe(false);
  });

  it("skickar i produktion med nyckel", () => {
    expect(isEmailSendingEnabled({ NODE_ENV: "production", RESEND_API_KEY: "re_123" })).toBe(true);
  });

  it("sendEmail gör ingen faktisk sändning under test", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await sendEmail({
      to: "a@example.com",
      subject: "test",
      html: "<p>x</p>",
      text: "x",
    });
    expect(result).toEqual({ ok: false, skipped: true, reason: "testläge" });
    // Ämnesraden loggas, aldrig mottagaradressen.
    expect(log.mock.calls.flat().join(" ")).not.toContain("a@example.com");
    log.mockRestore();
  });

  it("faller tillbaka på standardavsändaren", () => {
    expect(getPortfolioAlertFrom({})).toBe(DEFAULT_PORTFOLIO_ALERT_FROM);
    expect(getPortfolioAlertFrom({})).toBe("Sharpa Portföljbevakning <bevakning@sharpa.se>");
    expect(getPortfolioAlertFrom({ RESEND_FROM_PORTFOLIO_ALERTS: "X <x@sharpa.se>" })).toBe("X <x@sharpa.se>");
  });
});

describe("idempotensnyckel", () => {
  const req = {
    to: "a@example.com",
    userId: "u1",
    portfolioId: "p1",
    portfolioName: "ISK",
    previousScore: 7.8,
    newScore: 7.1,
    reasons: [],
    fundDataVersion: "2026-08-04T03:00:00.000Z",
  };

  it("bygger på portfölj, betyg och körningens identifierare", () => {
    expect(buildIdempotencyKey(req)).toBe(
      "portfolio-alert:p1:7.80:7.10:2026-08-04T03:00:00.000Z"
    );
  });

  it("är stabil för samma förändring och skiljer sig för en ny", () => {
    expect(buildIdempotencyKey(req)).toBe(buildIdempotencyKey({ ...req }));
    expect(buildIdempotencyKey({ ...req, newScore: 6.5 })).not.toBe(buildIdempotencyKey(req));
    expect(buildIdempotencyKey({ ...req, fundDataVersion: "annan" })).not.toBe(buildIdempotencyKey(req));
  });
});

describe("getSiteUrl", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;
  beforeEach(() => { delete process.env.NEXT_PUBLIC_SITE_URL; });
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = original;
  });

  it("faller tillbaka på sharpa.se och tar bort avslutande snedstreck", () => {
    expect(getSiteUrl({})).toBe("https://sharpa.se");
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://x.se/" })).toBe("https://x.se");
  });
});
