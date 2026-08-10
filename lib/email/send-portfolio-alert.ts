import { sendEmail, type SendEmailResult } from "./resend";
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
} from "./portfolio-alert";
import { createUnsubscribeToken } from "../unsubscribe-token";

/**
 * Sätter ihop och skickar en portföljnotis.
 *
 * Egen modul så att cron-jobbet kan mocka exakt en sak i test
 * (`vi.mock("@/lib/email/send-portfolio-alert")`) utan att behöva mocka
 * Resend-klienten, tokensignering och mallar var för sig.
 *
 * Ett mejl går till en användare, inte till en portfölj: har flera av
 * användarens portföljer försämrats i samma körning skickas ett samlat mejl med
 * listvarianten i stället för ett mejl per portfölj.
 */

export function getSiteUrl(env: Record<string, string | undefined> = process.env): string {
  return (env.NEXT_PUBLIC_SITE_URL || "https://sharpa.se").replace(/\/+$/, "");
}

/** En portfölj som försämrats tillräckligt för att mejlas om. */
export type AlertPortfolio = {
  portfolioId: string;
  portfolioName: string;
  previousScore: number;
  newScore: number;
  reasons: string[];
};

export type PortfolioAlertRequest = {
  to: string;
  userId: string;
  /** Minst en. Fler än en ger den samlade listvarianten. */
  portfolios: AlertPortfolio[];
  /** Datum för kontrollen, t.ex. "1 aug". */
  checkedAt?: string;
  /** Identifierare för fonddatakörningen — ingår i idempotensnyckeln. */
  fundDataVersion: string;
};

export type PortfolioUpdateRequest = {
  to: string;
  userId: string;
  portfolios: { portfolioId: string; portfolioName: string; score: number }[];
  checkedAt?: string;
  fundDataVersion: string;
  threshold: number;
};

/**
 * Idempotensnyckeln bygger på portföljerna, deras betygsförändring och
 * körningens identifierare. Två körningar mot samma fonddata som kommer fram
 * till samma förändring producerar därför samma nyckel, och Resend levererar
 * bara ett mejl. Flervarianten sorterar portföljerna så att nyckeln inte beror
 * på i vilken ordning batcharna råkade bli klara.
 */
export function buildIdempotencyKey(req: PortfolioAlertRequest): string {
  const score = (n: number) => n.toFixed(2);
  const part = (p: AlertPortfolio) =>
    [p.portfolioId, score(p.previousScore), score(p.newScore)].join(":");

  if (req.portfolios.length === 1) {
    return ["portfolio-alert", part(req.portfolios[0]), req.fundDataVersion].join(":");
  }

  return [
    "portfolio-alert",
    "multi",
    req.userId,
    req.portfolios.map(part).sort().join(","),
    req.fundDataVersion,
  ].join(":");
}

/**
 * Länken går till Mina portföljer, ankrad på portföljen — inte till analysvyn.
 * Översikten visar betygsförändringen direkt, ser likadan ut oavsett hur många
 * portföljer mejlet gäller, och slipper analysvyns omkörning innan något syns.
 * Vidare till analysen är ett klick därifrån.
 */
export function portfolioUrlFor(site: string, portfolioId: string): string {
  return `${site}/portfolios#p-${encodeURIComponent(portfolioId)}`;
}

export async function sendPortfolioAlert(
  req: PortfolioAlertRequest
): Promise<SendEmailResult> {
  if (req.portfolios.length === 0) {
    return { ok: false, skipped: true, reason: "inga portföljer" };
  }

  const site = getSiteUrl();
  const token = createUnsubscribeToken(req.userId, "portfolio-alerts");
  const unsubscribeUrl = `${site}/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`;
  const first = req.portfolios[0];

  const allPortfoliosUrl = `${site}/portfolios`;

  const links = {
    portfolioUrl: portfolioUrlFor(site, first.portfolioId),
    allPortfoliosUrl,
    unsubscribeUrl,
    preferencesUrl: `${site}/account#notiser`,
  };

  if (req.portfolios.length === 1) {
    const content = {
      ...links,
      portfolioName: first.portfolioName,
      previousScore: first.previousScore,
      newScore: first.newScore,
      reasons: first.reasons,
      checkedAt: req.checkedAt,
    };

    return sendEmail({
      to: req.to,
      subject: buildSubject(first.portfolioName),
      html: buildPortfolioAlertHtml(content),
      text: buildPortfolioAlertText(content),
      idempotencyKey: buildIdempotencyKey(req),
      listUnsubscribeUrl: unsubscribeUrl,
    });
  }

  const content = {
    ...links,
    checkedAt: req.checkedAt,
    portfolios: req.portfolios.map((p) => ({
      name: p.portfolioName,
      previousScore: p.previousScore,
      newScore: p.newScore,
      reason: p.reasons[0],
      url: portfolioUrlFor(site, p.portfolioId),
    })),
  };

  return sendEmail({
    to: req.to,
    subject: buildMultiSubject(req.portfolios.length),
    html: buildMultiPortfolioAlertHtml(content),
    text: buildMultiPortfolioAlertText(content),
    idempotencyKey: buildIdempotencyKey(req),
    listUnsubscribeUrl: unsubscribeUrl,
  });
}

/** Kontrollbesked när ingen av användarens portföljer nådde larmgränsen. */
export async function sendPortfolioUpdate(
  req: PortfolioUpdateRequest
): Promise<SendEmailResult> {
  if (req.portfolios.length === 0) {
    return { ok: false, skipped: true, reason: "inga portföljer" };
  }

  const site = getSiteUrl();
  const token = createUnsubscribeToken(req.userId, "portfolio-alerts");
  const unsubscribeUrl = `${site}/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`;
  const links = {
    portfolioUrl: portfolioUrlFor(site, req.portfolios[0].portfolioId),
    allPortfoliosUrl: `${site}/portfolios`,
    unsubscribeUrl,
    preferencesUrl: `${site}/account#notiser`,
  };
  const content = {
    ...links,
    checkedAt: req.checkedAt,
    threshold: req.threshold,
    portfolios: req.portfolios.map((p) => ({
      name: p.portfolioName,
      score: p.score,
      url: portfolioUrlFor(site, p.portfolioId),
    })),
  };

  return sendEmail({
    to: req.to,
    subject: buildUpdateSubject(req.portfolios.length),
    html: buildPortfolioUpdateHtml(content),
    text: buildPortfolioUpdateText(content),
    idempotencyKey: ["portfolio-update", req.userId, req.fundDataVersion].join(":"),
    listUnsubscribeUrl: unsubscribeUrl,
  });
}
