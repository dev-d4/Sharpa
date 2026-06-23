import type { PortfolioAnalysis } from "./analysis";
import type { PortfolioScoreResult } from "./portfolio-score";

export type PortfolioHolding = { isin: string; name: string; weight: string; amount?: string };

export type SavedPortfolio = {
  id: string;
  user_id: string;
  name: string;
  custodian: string;
  holdings: PortfolioHolding[];
  analysis: PortfolioAnalysis;
  score: number | null;
  score_breakdown: PortfolioScoreResult | null;
  score_notified_at: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
};
