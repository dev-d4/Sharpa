import { formatScore } from "../portfolio-watch";

/**
 * Mejlmallar för portföljbevakningen — enligt designhandoffen "transaktionsmejl".
 *
 * Två varianter:
 *   1. en portfölj har försämrats  → {@link buildPortfolioAlertHtml}
 *   2. flera har försämrats        → {@link buildMultiPortfolioAlertHtml}
 *
 * Mejl-HTML har hårda regler som ser föråldrade ut men är avsiktliga: tabeller
 * i stället för flex/grid, alla stilar inline, inga webbtypsnitt, inga bilder,
 * max 480px i en kolumn. Outlook och Gmail stryper <style>-block och det mesta
 * av modern CSS.
 *
 * Mallarna är ren strängformattering utan I/O, så de går att testa direkt.
 */

// ── Designtokens (handoffens palett — inga andra färger får införas) ──────────

const ACCENT = "#1F3A5F";
const INK = "#17212B";
const INK_2 = "#4B5A68";
const INK_3 = "#6F7D89";
const LINE = "#E7EAEE";
const LINE_SOFT = "#EDF0F2";
const CANVAS = "#F7F8F9";
const NEG = "#9B3B34";

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

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

// ── Innehållstyper ───────────────────────────────────────────────────────────

export type PortfolioAlertLinks = {
  /** Portföljen i Mina portföljer, ankrad så att rätt kort markeras. */
  portfolioUrl: string;
  allPortfoliosUrl: string;
  unsubscribeUrl: string;
  preferencesUrl: string;
};

export type PortfolioAlertContent = PortfolioAlertLinks & {
  portfolioName: string;
  previousScore: number;
  newScore: number;
  reasons: string[];
  /** Datum för kontrollen, t.ex. "1 aug". Utelämnas raden bort. */
  checkedAt?: string;
};

export type ChangedPortfolio = {
  name: string;
  previousScore: number;
  newScore: number;
  /** Kortaste orsaken, visas under namnet. */
  reason?: string;
  /** Egen länk till portföljen. Utan den renderas raden som ren text. */
  url?: string;
};

export type MultiPortfolioAlertContent = PortfolioAlertLinks & {
  portfolios: ChangedPortfolio[];
  checkedAt?: string;
};

export type StablePortfolio = {
  name: string;
  score: number;
  url?: string;
};

export type PortfolioUpdateContent = PortfolioAlertLinks & {
  portfolios: StablePortfolio[];
  checkedAt?: string;
  threshold: number;
};

// ── Text som återkommer i båda varianterna ───────────────────────────────────

const DISCLAIMER =
  "Det här är automatiskt genererad information, inte personlig finansiell rådgivning. " +
  "Sharpa tar inte hänsyn till din ekonomiska situation eller dina mål, och rekommenderar " +
  "inte att du köper eller säljer något. Alla beslut fattar du själv.";

const METHOD =
  "Sharpa jämför fonder utifrån avgift, historisk avkastning och risk, och håller " +
  "löpande koll på dina sparade portföljer.";

const COUNT_WORDS = ["", "En", "Två", "Tre", "Fyra", "Fem", "Sex", "Sju", "Åtta", "Nio", "Tio"];

/** "Tre av dina portföljer…" läser bättre än "3 av dina portföljer…". */
export function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}

export function buildSubject(portfolioName: string): string {
  return `Din portfölj “${portfolioName}” har förändrats`;
}

export function buildMultiSubject(count: number): string {
  return `${count} av dina portföljer har förändrats`;
}

export function buildUpdateSubject(count: number): string {
  return count === 1
    ? "Din portfölj är kontrollerad"
    : `Dina ${count} portföljer är kontrollerade`;
}

/** Alltid med tecken, svenskt decimaltecken och riktigt minustecken (U+2212). */
function signedScore(delta: number): string {
  return `${delta > 0 ? "+" : "−"}${formatScore(Math.abs(delta))}`;
}

// ── Delar som är gemensamma för båda mallarna ────────────────────────────────

const divider = (paddingTop: number) => `
                <tr>
                  <td style="padding:${paddingTop}px 34px 0 34px;">
                    <div style="height:1px;line-height:1px;font-size:1px;background-color:${LINE_SOFT};">&nbsp;</div>
                  </td>
                </tr>`;

const button = (href: string, label: string, paddingTop: number) => `
                <tr>
                  <td style="padding:${paddingTop}px 34px 0 34px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="${ACCENT}" style="border-radius:5px;">
                          <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;color:#FFFFFF;text-decoration:none;">
                            ${label}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`;

const methodAndDisclaimer = `
                <tr>
                  <td style="padding:28px 34px 0 34px;font-family:${FONT};">
                    <p style="margin:0;font-size:14px;line-height:21px;color:${INK_2};">
                      ${METHOD}
                    </p>
                  </td>
                </tr>
${divider(24)}
                <tr>
                  <td style="padding:18px 34px 32px 34px;font-family:${FONT};">
                    <p style="margin:0;font-size:12px;line-height:19px;color:${INK_3};">
                      ${DISCLAIMER}
                    </p>
                  </td>
                </tr>`;

/**
 * Gemensamt skal: preheader, avsändarrad, kortet och sidfoten. Varianterna
 * skickar in sitt eget innehåll som rader i korttabellen.
 */
function shell(opts: { preheader: string; cardRows: string; links: PortfolioAlertLinks }): string {
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${CANVAS};opacity:0;">
  ${opts.preheader}
  &#8202;&#8203;&#8202;&#8203;&#8202;&#8203;&#8202;&#8203;&#8202;&#8203;&#8202;&#8203;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CANVAS};">
  <tr>
    <td align="center" style="padding:36px 16px;">

      <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:480px;max-width:480px;">

        <tr>
          <td style="padding:0 2px 14px 2px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:${FONT};font-size:16px;font-weight:700;letter-spacing:0.2px;color:${ACCENT};">Sharpa</td>
                <td align="right" style="font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:${INK_3};">Portföljbevakning</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="background-color:#FFFFFF;border:1px solid ${LINE};border-radius:4px;border-top:2px solid ${ACCENT};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${opts.cardRows}
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 4px 8px 4px;font-family:${FONT};">
            <p style="margin:0;font-size:13px;line-height:20px;color:${INK_3};">
              <a href="${escapeHtml(opts.links.preferencesUrl)}" target="_blank" style="color:${INK_2};text-decoration:underline;">Hantera bevakningen</a>
              &nbsp;&middot;&nbsp;
              <a href="${escapeHtml(opts.links.unsubscribeUrl)}" target="_blank" style="color:${INK_2};text-decoration:underline;">Stäng av notiser</a>
            </p>
            <p style="margin:9px 0 0 0;font-size:12px;line-height:18px;color:${INK_3};">
              Sharpa &middot; bevakning@sharpa.se
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>`;
}

// ── Variant 1: en portfölj ───────────────────────────────────────────────────

export function buildPortfolioAlertHtml(c: PortfolioAlertContent): string {
  const name = escapeHtml(c.portfolioName);
  const delta = c.newScore - c.previousScore;

  const checkedRow = c.checkedAt
    ? `
                    <p style="margin:3px 0 0 0;font-size:13px;line-height:18px;color:${INK_3};">
                      Senast kontrollerad ${escapeHtml(c.checkedAt)}
                    </p>`
    : "";

  // Max tre orsaker; tomma rader renderas inte alls.
  const reasons = c.reasons.filter((r) => r.trim().length > 0).slice(0, 3);
  const reasonRows = reasons
    .map((r, i) => {
      const pad = i === reasons.length - 1 ? "" : "padding:0 0 11px 0;";
      return `
                      <tr>
                        <td valign="top" width="14" style="${pad}font-family:${FONT};font-size:15px;line-height:22px;color:${ACCENT};">&bull;</td>
                        <td valign="top" style="${pad}font-family:${FONT};font-size:15px;line-height:22px;color:${INK};">${escapeHtml(r)}</td>
                      </tr>`;
    })
    .join("");

  const reasonBlock = reasons.length
    ? `
                <tr>
                  <td style="padding:28px 34px 0 34px;font-family:${FONT};">
                    <p style="margin:0 0 14px 0;font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:${INK_3};">
                      Det här har förändrats
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${reasonRows}
                    </table>
                  </td>
                </tr>`
    : "";

  const cardRows = `
                <tr>
                  <td style="padding:34px 34px 0 34px;font-family:${FONT};">
                    <p style="margin:0;font-size:21px;line-height:27px;font-weight:700;color:${INK};letter-spacing:-0.2px;">
                      Din portfölj har förändrats
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:16px 34px 0 34px;font-family:${FONT};">
                    <p style="margin:0;font-size:16px;line-height:22px;font-weight:600;color:${INK};">
                      ${name}
                    </p>${checkedRow}
                  </td>
                </tr>

                <tr>
                  <td style="padding:22px 34px 0 34px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CANVAS};border-radius:4px;">
                      <tr>
                        <td style="padding:22px 24px;" align="center">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center" valign="middle" style="font-family:${FONT};font-size:40px;line-height:44px;font-weight:700;color:${INK_3};letter-spacing:-0.5px;">
                                ${formatScore(c.previousScore)}
                              </td>
                              <td align="center" valign="middle" style="padding:0 16px;font-family:${FONT};font-size:22px;line-height:22px;color:${INK_3};">
                                &rarr;
                              </td>
                              <td align="center" valign="middle" style="font-family:${FONT};font-size:40px;line-height:44px;font-weight:700;color:${INK};letter-spacing:-0.5px;">
                                ${formatScore(c.newScore)}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:0 24px 20px 24px;font-family:${FONT};font-size:13px;line-height:18px;color:${INK_3};">
                          <span style="color:${INK_3};">Betyg av 10&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span><span style="font-weight:700;color:${delta < 0 ? NEG : INK};">${signedScore(delta)} poäng</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
${reasonBlock}
${button(c.portfolioUrl, "Öppna portföljen", 28)}
${methodAndDisclaimer}`;

  return shell({
    preheader: `Nytt betyg ${formatScore(c.newScore)} av 10 – en förändring på ${signedScore(delta)} poäng sedan den senaste kontrollen.`,
    cardRows,
    links: c,
  });
}

// ── Variant 2: flera portföljer ──────────────────────────────────────────────

export function buildMultiPortfolioAlertHtml(c: MultiPortfolioAlertContent): string {
  const items = c.portfolios;
  const count = items.length;

  const rows = items
    .map((p, i) => {
      const delta = p.newScore - p.previousScore;
      const border = i === items.length - 1 ? "" : `border-bottom:1px solid ${LINE_SOFT};`;
      const reasonRow = p.reason
        ? `
                            <tr>
                              <td style="padding-top:5px;font-family:${FONT};font-size:13px;line-height:18px;color:${INK_3};">${escapeHtml(p.reason)}</td>
                              <td align="right" valign="top" style="padding-top:5px;font-family:${FONT};font-size:13px;line-height:18px;font-weight:700;color:${NEG};white-space:nowrap;">${signedScore(delta)}</td>
                            </tr>`
        : `
                            <tr>
                              <td></td>
                              <td align="right" valign="top" style="padding-top:5px;font-family:${FONT};font-size:13px;line-height:18px;font-weight:700;color:${NEG};white-space:nowrap;">${signedScore(delta)}</td>
                            </tr>`;
      // Namnet är radens länk. Klienterna gör inte hela tabellceller klickbara,
      // så ankaret läggs runt texten — och utelämnas helt när url saknas.
      const nameCell = p.url
        ? `<a href="${escapeHtml(p.url)}" target="_blank" style="color:${ACCENT};text-decoration:none;font-weight:600;">${escapeHtml(p.name)}&nbsp;&rsaquo;</a>`
        : `<span style="color:${INK};font-weight:600;">${escapeHtml(p.name)}</span>`;

      return `
                      <tr>
                        <td style="padding:16px 20px;${border}">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-family:${FONT};font-size:15px;line-height:20px;font-weight:600;">${nameCell}</td>
                              <td align="right" style="font-family:${FONT};font-size:15px;line-height:20px;color:${INK_3};white-space:nowrap;">${formatScore(p.previousScore)} <span style="color:${INK_3};">&rarr;</span> <span style="font-weight:700;color:${INK};">${formatScore(p.newScore)}</span></td>
                            </tr>${reasonRow}
                          </table>
                        </td>
                      </tr>`;
    })
    .join("");

  const footnote = c.checkedAt
    ? `Betyg av 10. Förändring sedan den senaste kontrollen ${escapeHtml(c.checkedAt)}.`
    : "Betyg av 10. Förändring sedan den senaste kontrollen.";

  const cardRows = `
                <tr>
                  <td style="padding:34px 34px 0 34px;font-family:${FONT};">
                    <p style="margin:0;font-size:21px;line-height:27px;font-weight:700;color:${INK};letter-spacing:-0.2px;">
                      ${countWord(count)} av dina portföljer har förändrats
                    </p>
                    <p style="margin:12px 0 0 0;font-size:15px;line-height:22px;color:${INK_2};">
                      Betyget har sjunkit för ${countWord(count).toLowerCase()} av dina bevakade portföljer.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 34px 0 34px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${LINE};border-radius:4px;">${rows}
                    </table>
                    <p style="margin:10px 0 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:${INK_3};">
                      ${footnote}
                    </p>
                  </td>
                </tr>
${button(c.allPortfoliosUrl, "Öppna Mina portföljer", 26)}
${divider(30)}
${methodAndDisclaimer}`;

  return shell({
    preheader: `${count} bevakade portföljer har fått lägre betyg efter den senaste kontrollen.`,
    cardRows,
    links: c,
  });
}

// ── Variant 3: kontroll genomförd, ingen tydlig försämring ───────────────────

export function buildPortfolioUpdateHtml(c: PortfolioUpdateContent): string {
  const rows = c.portfolios.map((p, i) => {
    const border = i === c.portfolios.length - 1 ? "" : `border-bottom:1px solid ${LINE_SOFT};`;
    const name = p.url
      ? `<a href="${escapeHtml(p.url)}" target="_blank" style="color:${ACCENT};text-decoration:none;font-weight:600;">${escapeHtml(p.name)}&nbsp;&rsaquo;</a>`
      : `<span style="color:${INK};font-weight:600;">${escapeHtml(p.name)}</span>`;
    return `
                      <tr>
                        <td style="padding:15px 20px;${border};font-family:${FONT};font-size:15px;line-height:20px;">${name}</td>
                        <td align="right" style="padding:15px 20px;${border};font-family:${FONT};font-size:15px;line-height:20px;font-weight:700;color:${INK};white-space:nowrap;">${formatScore(p.score)} / 10</td>
                      </tr>`;
  }).join("");

  const checked = c.checkedAt
    ? ` Senast kontrollerade ${escapeHtml(c.checkedAt)}.`
    : "";
  const cardRows = `
                <tr>
                  <td style="padding:34px 34px 0 34px;font-family:${FONT};">
                    <p style="margin:0;font-size:21px;line-height:27px;font-weight:700;color:${INK};letter-spacing:-0.2px;">Kontrollen är klar</p>
                    <p style="margin:12px 0 0 0;font-size:15px;line-height:22px;color:${INK_2};">
                      Ingen av de granskade portföljerna har försämrats med ${formatScore(c.threshold)} poäng eller mer.${checked}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 34px 0 34px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${LINE};border-radius:4px;">${rows}
                    </table>
                  </td>
                </tr>
${button(c.allPortfoliosUrl, "Öppna Mina portföljer", 26)}
${divider(30)}
${methodAndDisclaimer}`;

  return shell({
    preheader: `Vi har kontrollerat ${c.portfolios.length === 1 ? "din portfölj" : `dina ${c.portfolios.length} portföljer`} – ingen tydlig försämring upptäcktes.`,
    cardRows,
    links: c,
  });
}

// ── Klartextversioner ────────────────────────────────────────────────────────

function textFooter(links: PortfolioAlertLinks): string[] {
  return [
    "",
    METHOD,
    "",
    DISCLAIMER,
    "",
    `Hantera bevakningen: ${links.preferencesUrl}`,
    `Stäng av notiser: ${links.unsubscribeUrl}`,
    "",
    "Sharpa · bevakning@sharpa.se",
  ];
}

export function buildPortfolioAlertText(c: PortfolioAlertContent): string {
  const delta = c.newScore - c.previousScore;

  const lines = [
    "Din portfölj har förändrats",
    "",
    c.portfolioName,
  ];
  if (c.checkedAt) lines.push(`Senast kontrollerad ${c.checkedAt}`);
  lines.push(
    "",
    `Tidigare betyg: ${formatScore(c.previousScore)} / 10`,
    `Nytt betyg:     ${formatScore(c.newScore)} / 10`,
    `Förändring:     ${signedScore(delta)} poäng`
  );

  const reasons = c.reasons.filter((r) => r.trim().length > 0).slice(0, 3);
  if (reasons.length) {
    lines.push("", "Det här har förändrats:");
    for (const r of reasons) lines.push(`- ${r}`);
  }

  lines.push("", `Öppna portföljen: ${c.portfolioUrl}`);

  lines.push(...textFooter(c));
  return lines.join("\n");
}

export function buildMultiPortfolioAlertText(c: MultiPortfolioAlertContent): string {
  const count = c.portfolios.length;

  const lines = [
    `${countWord(count)} av dina portföljer har förändrats`,
    "",
    `Betyget har sjunkit för ${countWord(count).toLowerCase()} av dina bevakade portföljer.`,
    "",
  ];

  for (const p of c.portfolios) {
    const delta = p.newScore - p.previousScore;
    lines.push(
      `- ${p.name}: ${formatScore(p.previousScore)} → ${formatScore(p.newScore)} (${signedScore(delta)})`
    );
    if (p.reason) lines.push(`  ${p.reason}`);
    if (p.url) lines.push(`  ${p.url}`);
  }

  lines.push(
    "",
    c.checkedAt
      ? `Betyg av 10. Förändring sedan den senaste kontrollen ${c.checkedAt}.`
      : "Betyg av 10. Förändring sedan den senaste kontrollen.",
    "",
    `Öppna Mina portföljer: ${c.allPortfoliosUrl}`
  );

  lines.push(...textFooter(c));
  return lines.join("\n");
}

export function buildPortfolioUpdateText(c: PortfolioUpdateContent): string {
  const lines = [
    "Kontrollen är klar",
    "",
    `Ingen av de granskade portföljerna har försämrats med ${formatScore(c.threshold)} poäng eller mer.`,
  ];
  if (c.checkedAt) lines.push(`Senast kontrollerade ${c.checkedAt}.`);
  lines.push("");
  for (const p of c.portfolios) {
    lines.push(`- ${p.name}: ${formatScore(p.score)} / 10`);
    if (p.url) lines.push(`  ${p.url}`);
  }
  lines.push("", `Öppna Mina portföljer: ${c.allPortfoliosUrl}`);
  lines.push(...textFooter(c));
  return lines.join("\n");
}
