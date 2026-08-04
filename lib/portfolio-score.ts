import type { PortfolioAnalysis } from "./analysis";

/** De fyra dimensionerna betyget vägs samman av. */
export type ScoreComponentKey = "cost" | "sharpe" | "return3yr" | "diversification";

/**
 * En dimensions delpoäng (0–10). Sparas i score_breakdown och jämförs mellan två
 * kontroller för att kunna säga VILKEN del av betyget som sjunkit — utan den här
 * uppdelningen går det bara att konstatera att totalen ändrats.
 */
export type ScoreComponent = { key: ScoreComponentKey; points: number };

export type PortfolioScoreResult = {
  score: number;          // 0–10
  label: string;
  color: "green" | "blue" | "yellow" | "orange" | "red";
  /** Dimensioner som kunde beräknas. Saknad data ger ingen post alls. */
  components: ScoreComponent[];
};

/**
 * Compute a 0–10 quality score from a PortfolioAnalysis snapshot.
 * Unweighted average of up to four equally weighted dimensions: cost, Sharpe,
 * 3yr return, and diversification.
 */
export function computePortfolioScore(analysis: PortfolioAnalysis): PortfolioScoreResult {
  let total = 0, count = 0;
  const components: ScoreComponent[] = [];
  const add = (key: ScoreComponentKey, points: number) => {
    total += points; count++;
    components.push({ key, points });
  };

  if (analysis.avgCost !== null) {
    add("cost", analysis.avgCost < 0.2 ? 10 : analysis.avgCost < 0.4 ? 8 : analysis.avgCost < 0.6 ? 6 : analysis.avgCost < 0.9 ? 4 : 2);
  }
  if (analysis.weightedSharpe !== null) {
    add("sharpe", analysis.weightedSharpe > 1.2 ? 10 : analysis.weightedSharpe > 0.8 ? 8 : analysis.weightedSharpe > 0.5 ? 6 : analysis.weightedSharpe > 0.2 ? 4 : 2);
  }
  if (analysis.weightedReturn3yr !== null) {
    add("return3yr", analysis.weightedReturn3yr > 40 ? 10 : analysis.weightedReturn3yr > 25 ? 9 : analysis.weightedReturn3yr > 15 ? 8 : analysis.weightedReturn3yr > 8 ? 7 : analysis.weightedReturn3yr > 3 ? 5 : 2);
  }
  const diversitySource = analysis.detailedBreakdown ?? analysis.categoryBreakdown;
  if (diversitySource?.length) {
    const n = diversitySource.filter(c => c.weight > 5).length;
    add("diversification", n >= 4 ? 10 : n === 3 ? 8 : n === 2 ? 5 : 2);
  }

  const score = count > 0 ? Math.round((total / count) * 10) / 10 : 5.0;

  let label: string;
  let color: PortfolioScoreResult["color"];
  if (score >= 8.5)     { label = "Utmärkt";         color = "green";  }
  else if (score >= 7)  { label = "Bra";              color = "blue";   }
  else if (score >= 5.5){ label = "OK";               color = "yellow"; }
  else if (score >= 4)  { label = "Kan förbättras";   color = "orange"; }
  else                  { label = "Behöver ses över"; color = "red";    }

  return { score, label, color, components };
}

export const SCORE_COLOR_CLASSES: Record<PortfolioScoreResult["color"], {
  pill: string;
  text: string;
  dot: string;
}> = {
  green:  { pill: "bg-pos-soft border-pos/20 text-pos",              text: "text-pos",          dot: "bg-pos"        },
  blue:   { pill: "bg-info border-info-line text-accent",           text: "text-accent",       dot: "bg-accent"     },
  yellow: { pill: "bg-warn-soft border-warn/25 text-warn",           text: "text-warn",         dot: "bg-warn"       },
  orange: { pill: "bg-[#F6E9E0] border-[#E8CDBB] text-[#A9542A]",    text: "text-[#A9542A]",    dot: "bg-[#C26A3A]"  },
  red:    { pill: "bg-neg-soft border-neg/20 text-neg",              text: "text-neg",          dot: "bg-neg"        },
};
