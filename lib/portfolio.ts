import type { PortfolioAnalysis } from "./analysis";

export type PortfolioHolding = { isin: string; name: string; weight: string };

export type SavedPortfolio = {
  id: string;
  user_id: string;
  name: string;
  custodian: string;
  holdings: PortfolioHolding[];
  analysis: PortfolioAnalysis;
  created_at: string;
  updated_at: string;
};
