import { formatScore } from "../portfolio-watch";

/**
 * Mejlmall för portföljnotiser.
 *
 * Samma visuella identitet som inloggningsmejlet (supabase/templates/) —
 * tabellayout, inline-stilar, samma ytor och radavstånd — men med projektets
 * nuvarande accentfärg #1F3A5F i stället för den gamla #0B6E99.
 *
 * Tabeller och inline-CSS är avsiktliga: Outlook och Gmail stryper
 * <style>-block, flexbox och de flesta moderna CSS-egenskaper.
 *
 * Mallen är ren strängformattering utan I/O, så den går att testa direkt.
 */

const ACCENT = "#1F3A5F";
const INK = "#17212B";
const INK_2 = "#4B5A68";
const INK_3 = "#6F7D89";
const LINE = "#E7EAEE";
const LINE_SOFT = "#EDF0F2";
const CANVAS = "#F7F8F9";

/**
 * Escapa all användargenererad text. Portföljnamn sätts av användaren och får
 * aldrig tolkas som markup — varken i HTML-delen eller i attributvärden.
 */
export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type PortfolioAlertContent = {
  portfolioName: string;
  previousScore: number;
  newScore: number;
  reasons: string[];
  portfolioUrl: string;
  unsubscribeUrl: string;
  preferencesUrl: string;
};

export function buildSubject(portfolioName: string): string {
  return `Din portfölj “${portfolioName}” har förändrats`;
}

const DISCLAIMER =
  "Det här är automatiskt genererad information, inte personlig finansiell rådgivning. " +
  "Sharpa tar inte hänsyn till din ekonomiska situation eller dina mål, och rekommenderar " +
  "inte att du köper eller säljer något. Alla beslut fattar du själv.";

const METHOD =
  "Sharpa jämför fonder utifrån avgift, historisk avkastning och risk. När fonddatan " +
  "uppdateras räknas din sparade portfölj om automatiskt.";

export function buildPortfolioAlertHtml(c: PortfolioAlertContent): string {
  const name = escapeHtml(c.portfolioName);
  const delta = c.newScore - c.previousScore;
  const deltaText = `${delta > 0 ? "+" : "−"}${formatScore(Math.abs(delta))} poäng`;

  const reasonRows = c.reasons
    .map(
      (r) => `
              <tr>
                <td valign="top" style="padding:0 8px 8px 0;font-size:15px;line-height:23px;color:${ACCENT};">•</td>
                <td valign="top" style="padding:0 0 8px 0;font-size:15px;line-height:23px;color:${INK_2};">${escapeHtml(r)}</td>
              </tr>`
    )
    .join("");

  const reasonBlock =
    c.reasons.length > 0
      ? `
        <tr>
          <td style="padding:20px 32px 0 32px;">
            <p style="margin:0 0 10px 0;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${INK_3};">Det här har förändrats</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${reasonRows}
            </table>
          </td>
        </tr>`
      : "";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CANVAS};margin:0;padding:32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background-color:#FFFFFF;border:1px solid ${LINE};border-radius:12px;">
        <tr>
          <td style="padding:32px 32px 0 32px;">
            <span style="font-size:19px;font-weight:700;letter-spacing:-0.3px;color:${ACCENT};">Sharpa</span>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 32px 0 32px;">
            <h1 style="margin:0;font-size:20px;line-height:28px;font-weight:600;color:${INK};">Din portfölj har förändrats</h1>
            <p style="margin:12px 0 0 0;font-size:15px;line-height:23px;color:${INK_2};">
              Vi har analyserat om <strong style="color:${INK};font-weight:600;">${name}</strong> mot den senaste fonddatan.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px 0 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${LINE};border-radius:10px;">
              <tr>
                <td style="padding:16px 18px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-size:13px;line-height:20px;color:${INK_3};">Tidigare betyg</td>
                      <td align="right" style="font-size:15px;line-height:20px;font-weight:600;color:${INK};">${formatScore(c.previousScore)} / 10</td>
                    </tr>
                    <tr>
                      <td style="padding-top:8px;font-size:13px;line-height:20px;color:${INK_3};">Nytt betyg</td>
                      <td align="right" style="padding-top:8px;font-size:15px;line-height:20px;font-weight:600;color:${ACCENT};">${formatScore(c.newScore)} / 10</td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding-top:12px;border-top:1px solid ${LINE_SOFT};"></td>
                    </tr>
                    <tr>
                      <td style="font-size:13px;line-height:20px;color:${INK_3};">Förändring</td>
                      <td align="right" style="font-size:15px;line-height:20px;font-weight:600;color:${INK};">${deltaText}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
${reasonBlock}
        <tr>
          <td style="padding:24px 32px 0 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background-color:${ACCENT};border-radius:10px;">
                  <a href="${escapeHtml(c.portfolioUrl)}"
                     style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">
                    Se vad som har förändrats
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 32px 0 32px;">
            <p style="margin:0;font-size:13px;line-height:20px;color:${INK_3};">
              ${METHOD}
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px 32px 32px;">
            <div style="border-top:1px solid ${LINE_SOFT};padding-top:16px;">
              <p style="margin:0;font-size:13px;line-height:20px;color:${INK_3};">
                ${DISCLAIMER}
              </p>
              <p style="margin:12px 0 0 0;font-size:13px;line-height:20px;color:${INK_3};">
                <a href="${escapeHtml(c.preferencesUrl)}" style="color:${ACCENT};text-decoration:underline;">Hantera portföljbevakning</a>
                &nbsp;·&nbsp;
                <a href="${escapeHtml(c.unsubscribeUrl)}" style="color:${ACCENT};text-decoration:underline;">Stäng av notiser</a>
              </p>
            </div>
          </td>
        </tr>
      </table>

      <p style="margin:20px 0 0 0;font-size:12px;line-height:18px;color:#9CA8B3;">
        Sharpa · Automatiserad fondanalys · sharpa.se
      </p>
    </td>
  </tr>
</table>`;
}

export function buildPortfolioAlertText(c: PortfolioAlertContent): string {
  const delta = c.newScore - c.previousScore;
  const deltaText = `${delta > 0 ? "+" : "−"}${formatScore(Math.abs(delta))} poäng`;

  const lines = [
    "Din portfölj har förändrats",
    "",
    `Vi har analyserat om "${c.portfolioName}" mot den senaste fonddatan.`,
    "",
    `Tidigare betyg: ${formatScore(c.previousScore)} / 10`,
    `Nytt betyg:     ${formatScore(c.newScore)} / 10`,
    `Förändring:     ${deltaText}`,
  ];

  if (c.reasons.length > 0) {
    lines.push("", "Det här har förändrats:");
    for (const r of c.reasons) lines.push(`- ${r}`);
  }

  lines.push(
    "",
    `Se vad som har förändrats: ${c.portfolioUrl}`,
    "",
    METHOD,
    "",
    DISCLAIMER,
    "",
    `Hantera portföljbevakning: ${c.preferencesUrl}`,
    `Stäng av notiser: ${c.unsubscribeUrl}`,
    "",
    "Sharpa · Automatiserad fondanalys · sharpa.se"
  );

  return lines.join("\n");
}
