import type { PortfolioAnalysis } from "./analysis";

export type PortfolioScoreResult = {
  score: number;          // 0–10
  label: string;
  color: "green" | "blue" | "yellow" | "orange" | "red";
};

/**
 * Compute a 0–10 quality score from a PortfolioAnalysis snapshot.
 * Average of up to four dimensions: cost, Sharpe, 3yr return, diversification.
 */
export function computePortfolioScore(analysis: PortfolioAnalysis): PortfolioScoreResult {
  let total = 0, count = 0;

  if (analysis.avgCost !== null) {
    total += analysis.avgCost < 0.2 ? 10 : analysis.avgCost < 0.4 ? 8 : analysis.avgCost < 0.6 ? 6 : analysis.avgCost < 0.9 ? 4 : 2;
    count++;
  }
  if (analysis.weightedSharpe !== null) {
    total += analysis.weightedSharpe > 1.2 ? 10 : analysis.weightedSharpe > 0.8 ? 8 : analysis.weightedSharpe > 0.5 ? 6 : analysis.weightedSharpe > 0.2 ? 4 : 2;
    count++;
  }
  if (analysis.weightedReturn3yr !== null) {
    total += analysis.weightedReturn3yr > 40 ? 10 : analysis.weightedReturn3yr > 25 ? 9 : analysis.weightedReturn3yr > 15 ? 8 : analysis.weightedReturn3yr > 8 ? 7 : analysis.weightedReturn3yr > 3 ? 5 : 2;
    count++;
  }
  const diversitySource = analysis.detailedBreakdown ?? analysis.categoryBreakdown;
  if (diversitySource?.length) {
    const n = diversitySource.filter(c => c.weight > 5).length;
    total += n >= 4 ? 10 : n === 3 ? 8 : n === 2 ? 5 : 2;
    count++;
  }

  const score = count > 0 ? Math.round((total / count) * 10) / 10 : 5.0;

  let label: string;
  let color: PortfolioScoreResult["color"];
  if (score >= 8.5)     { label = "Utmärkt";         color = "green";  }
  else if (score >= 7)  { label = "Bra";              color = "blue";   }
  else if (score >= 5.5){ label = "OK";               color = "yellow"; }
  else if (score >= 4)  { label = "Kan förbättras";   color = "orange"; }
  else                  { label = "Behöver ses över"; color = "red";    }

  return { score, label, color };
}

export const SCORE_COLOR_CLASSES: Record<PortfolioScoreResult["color"], {
  pill: string;
  text: string;
  dot: string;
}> = {
  green:  { pill: "bg-green-50 border-green-100 text-green-700",     text: "text-green-700",   dot: "bg-green-500"  },
  blue:   { pill: "bg-blue-50 border-blue-100 text-blue-700",       text: "text-blue-700",    dot: "bg-blue-500"   },
  yellow: { pill: "bg-amber-50 border-amber-100 text-amber-700",    text: "text-amber-700",   dot: "bg-amber-500"  },
  orange: { pill: "bg-orange-50 border-orange-100 text-orange-700", text: "text-orange-700",  dot: "bg-orange-500" },
  red:    { pill: "bg-red-50 border-red-100 text-red-700",          text: "text-red-700",     dot: "bg-red-500"    },
};
