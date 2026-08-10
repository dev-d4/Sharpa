import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildMultiPortfolioAlertHtml,
  buildMultiPortfolioAlertText,
  buildMultiSubject,
  buildPortfolioAlertHtml,
  buildPortfolioAlertText,
  buildSubject,
  buildPortfolioUpdateHtml,
  buildPortfolioUpdateText,
  buildUpdateSubject,
  escapeHtml,
} from "@/lib/email/portfolio-alert";
import {
  isEmailSendingEnabled,
  getPortfolioAlertFrom,
  sendEmail,
  DEFAULT_PORTFOLIO_ALERT_FROM,
} from "@/lib/email/resend";
import { buildIdempotencyKey, getSiteUrl } from "@/lib/email/send-portfolio-alert";

const links = {
  portfolioUrl: "https://sharpa.se/portfolios#p-abc",
  allPortfoliosUrl: "https://sharpa.se/portfolios",
  unsubscribeUrl: "https://sharpa.se/api/notifications/unsubscribe?token=t",
  preferencesUrl: "https://sharpa.se/account#notiser",
};

const content = {
  ...links,
  portfolioName: "ISK Pension",
  previousScore: 7.8,
  newScore: 7.1,
  reasons: [
    "Portföljens riskjusterade avkastning (Sharpe) har försämrats, från 1,20 till 0,80.",
    "Den genomsnittliga avgiften har ökat, från 0,30 % till 0,45 %.",
  ],
  checkedAt: "1 aug",
};

const multiContent = {
  ...links,
  checkedAt: "1 aug",
  portfolios: [
    { name: "Pension & buffert", previousScore: 7.8, newScore: 6.2, reason: "Riskjusterad avkastning har försämrats" },
    { name: "Globala indexfonder", previousScore: 8.4, newScore: 7.1, reason: "Den historiska avkastningen har gått ned" },
    { name: "Räntesparande", previousScore: 6.9, newScore: 5.8 },
  ],
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
    expect(html).toContain("Öppna portföljen");
    expect(html).toContain('href="https://sharpa.se/portfolios#p-abc"');
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

  it("följer mejlreglerna: tabeller, inline-stilar, inga externa resurser", () => {
    const html = buildPortfolioAlertHtml(content);
    expect(html).toContain('role="presentation"');
    expect(html).not.toMatch(/<style|<script|<img|display:\s*flex|display:\s*grid|position:\s*absolute/);
    expect(html).toContain("max-width:480px");
  });

  it("visar bara de tre första orsakerna och hoppar över tomma", () => {
    const html = buildPortfolioAlertHtml({
      ...content,
      reasons: ["ett", "två", "tre", "fyra", "   "],
    });
    expect(html).toContain("ett");
    expect(html).toContain("tre");
    expect(html).not.toContain("fyra");
  });

  it("utelämnar orsaksblocket helt när det inte finns orsaker", () => {
    const html = buildPortfolioAlertHtml({ ...content, reasons: [] });
    expect(html).not.toContain("Det här har förändrats");
  });

  it("nämner bara portföljen mejlet gäller, aldrig användarens övriga", () => {
    const html = buildPortfolioAlertHtml(content);
    expect(html).not.toContain("Dina övriga portföljer");
    expect(html).toContain(links.portfolioUrl);
  });
});

describe("mejlmall — flera portföljer", () => {
  it("har ämnesrad och rubrik som speglar antalet", () => {
    expect(buildMultiSubject(3)).toBe("3 av dina portföljer har förändrats");
    expect(buildMultiPortfolioAlertHtml(multiContent)).toContain("Tre av dina portföljer har förändrats");
  });

  it("listar varje portfölj med båda betygen och förändringen", () => {
    const html = buildMultiPortfolioAlertHtml(multiContent);
    expect(html).toContain("Pension &amp; buffert");
    expect(html).toContain("7,8");
    expect(html).toContain("6,2");
    expect(html).toContain("−1,6");
    expect(html).toContain("Riskjusterad avkastning har försämrats");
  });

  it("har en gemensam knapp, inte en per rad", () => {
    const html = buildMultiPortfolioAlertHtml(multiContent);
    expect(html.match(/Öppna Mina portföljer/g)).toHaveLength(1);
    expect(html).toContain(links.allPortfoliosUrl);
  });

  it("gör varje rad till en länk till sin egen portfölj", () => {
    const html = buildMultiPortfolioAlertHtml({
      ...multiContent,
      portfolios: multiContent.portfolios.map((p, i) => ({
        ...p,
        url: `https://sharpa.se/portfolios#p-${i}`,
      })),
    });
    for (let i = 0; i < multiContent.portfolios.length; i++) {
      expect(html).toContain(`href="https://sharpa.se/portfolios#p-${i}"`);
    }
  });

  it("renderar raden som text när portföljen saknar länk", () => {
    const html = buildMultiPortfolioAlertHtml(multiContent);
    expect(html).toContain("Pension &amp; buffert");
    expect(html).not.toContain('href="undefined"');
  });

  it("har friskrivning och avregistrering även i flervarianten", () => {
    const html = buildMultiPortfolioAlertHtml(multiContent);
    expect(html).toContain("inte personlig finansiell rådgivning");
    expect(html).toContain(links.unsubscribeUrl);
    expect(html).toContain(links.preferencesUrl);
  });

  it("escapar portföljnamn", () => {
    const html = buildMultiPortfolioAlertHtml({
      ...multiContent,
      portfolios: [{ name: "<b>x</b>", previousScore: 8, newScore: 7 }, multiContent.portfolios[1]],
    });
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  it("har en klartextversion utan markup", () => {
    const text = buildMultiPortfolioAlertText(multiContent);
    expect(text).not.toContain("<");
    expect(text).toContain("Pension & buffert: 7,8 → 6,2 (−1,6)");
  });
});

describe("mejlmall — kontroll utan tydlig försämring", () => {
  const update = {
    ...links,
    checkedAt: "10 aug",
    threshold: 0.5,
    portfolios: [
      { name: "ISK", score: 7.8, url: "https://sharpa.se/portfolios#p-1" },
      { name: "Pension", score: 8.2, url: "https://sharpa.se/portfolios#p-2" },
    ],
  };

  it("bekräftar kontrollen och visar samtliga granskade portföljer", () => {
    const html = buildPortfolioUpdateHtml(update);
    expect(buildUpdateSubject(2)).toBe("Dina 2 portföljer är kontrollerade");
    expect(html).toContain("Kontrollen är klar");
    expect(html).toContain("0,5 poäng");
    expect(html).toContain("ISK");
    expect(html).toContain("Pension");
    expect(html).toContain("7,8 / 10");
  });

  it("har klartext, portföljlänkar och avregistrering", () => {
    const text = buildPortfolioUpdateText(update);
    expect(text).toContain("Ingen av de granskade portföljerna");
    expect(text).toContain("https://sharpa.se/portfolios#p-1");
    expect(text).toContain(links.unsubscribeUrl);
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
  const one = {
    portfolioId: "p1",
    portfolioName: "ISK",
    previousScore: 7.8,
    newScore: 7.1,
    reasons: [],
  };
  const req = {
    to: "a@example.com",
    userId: "u1",
    portfolios: [one],
    fundDataVersion: "2026-08-04T03:00:00.000Z",
  };

  it("bygger på portfölj, betyg och körningens identifierare", () => {
    expect(buildIdempotencyKey(req)).toBe(
      "portfolio-alert:p1:7.80:7.10:2026-08-04T03:00:00.000Z"
    );
  });

  it("är stabil för samma förändring och skiljer sig för en ny", () => {
    expect(buildIdempotencyKey(req)).toBe(buildIdempotencyKey({ ...req }));
    expect(
      buildIdempotencyKey({ ...req, portfolios: [{ ...one, newScore: 6.5 }] })
    ).not.toBe(buildIdempotencyKey(req));
    expect(buildIdempotencyKey({ ...req, fundDataVersion: "annan" })).not.toBe(buildIdempotencyKey(req));
  });

  it("är oberoende av ordningen när flera portföljer samlas i ett mejl", () => {
    const two = { ...one, portfolioId: "p2", previousScore: 9, newScore: 8 };
    const a = buildIdempotencyKey({ ...req, portfolios: [one, two] });
    const b = buildIdempotencyKey({ ...req, portfolios: [two, one] });
    expect(a).toBe(b);
    expect(a).toContain("multi:u1");
    expect(a).not.toBe(buildIdempotencyKey(req));
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
