import { sendEmail, type SendEmailResult } from "./resend";
import {
  buildPortfolioAlertHtml,
  buildPortfolioAlertText,
  buildSubject,
} from "./portfolio-alert";
import { createUnsubscribeToken } from "../unsubscribe-token";

/**
 * Sätter ihop och skickar en portföljnotis.
 *
 * Egen modul så att cron-jobbet kan mocka exakt en sak i test
 * (`vi.mock("@/lib/email/send-portfolio-alert")`) utan att behöva mocka
 * Resend-klienten, tokensignering och mallar var för sig.
 */

export function getSiteUrl(env: Record<string, string | undefined> = process.env): string {
  return (env.NEXT_PUBLIC_SITE_URL || "https://sharpa.se").replace(/\/+$/, "");
}

export type PortfolioAlertRequest = {
  to: string;
  userId: string;
  portfolioId: string;
  portfolioName: string;
  previousScore: number;
  newScore: number;
  reasons: string[];
  /** Identifierare för fonddatakörningen — ingår i idempotensnyckeln. */
  fundDataVersion: string;
};

/**
 * Idempotensnyckeln bygger på portfölj, gammalt betyg, nytt betyg och
 * körningens identifierare. Två körningar mot samma fonddata som kommer fram
 * till samma betygsförändring producerar därför samma nyckel, och Resend
 * levererar bara ett mejl.
 */
export function buildIdempotencyKey(req: PortfolioAlertRequest): string {
  const score = (n: number) => n.toFixed(2);
  return [
    "portfolio-alert",
    req.portfolioId,
    score(req.previousScore),
    score(req.newScore),
    req.fundDataVersion,
  ].join(":");
}

export async function sendPortfolioAlert(
  req: PortfolioAlertRequest
): Promise<SendEmailResult> {
  const site = getSiteUrl();
  const token = createUnsubscribeToken(req.userId, "portfolio-alerts");
  const unsubscribeUrl = `${site}/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`;

  const content = {
    portfolioName: req.portfolioName,
    previousScore: req.previousScore,
    newScore: req.newScore,
    reasons: req.reasons,
    portfolioUrl: `${site}/analyze?portfolio=${encodeURIComponent(req.portfolioId)}`,
    unsubscribeUrl,
    preferencesUrl: `${site}/account#notiser`,
  };

  return sendEmail({
    to: req.to,
    subject: buildSubject(req.portfolioName),
    html: buildPortfolioAlertHtml(content),
    text: buildPortfolioAlertText(content),
    idempotencyKey: buildIdempotencyKey(req),
    listUnsubscribeUrl: unsubscribeUrl,
  });
}
