import { FUND_VIDEOS, type FundVideoData } from "./portfolio.generated";

export type FundVideoInput = FundVideoData & {
  /**
   * Skärminspelning som spelas inne i telefonramen, relativt video/public/.
   * Utelämnas den visas en platshållare i stället för att renderingen kraschar.
   */
  screencast?: string;
};

/** Inspelning per fond-slugg. Saknas en post används platshållaren. */
const SCREENCASTS: Record<string, string> = {};

/**
 * Underlaget till FeeVideo — en video per fond. Fonderna, avgifterna,
 * kategorisnitten och alternativen kommer ur data/avanza-funds.json via
 * scripts/build-data.ts. Lägg till fler genom FUND_VIDEO_ISINS i det scriptet.
 */
export const FUNDS: FundVideoInput[] = FUND_VIDEOS.map((f) => ({
  ...f,
  screencast: SCREENCASTS[f.slug],
}));
