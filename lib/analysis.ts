import { Fund } from "./supabase";

export type PortfolioEntry = {
  isin: string;
  weight: number;
  fund?: Fund;
};

export type CategoryBreakdown = {
  label: string;
  weight: number;
};

export type SwapSuggestion = {
  currentFund: Fund;
  suggestedFund: Fund;
  reason: string;
  improvement: {
    sharpe?: number;
    cost?: number;
    return1yr?: number;
  };
  consolidate: boolean;
};

export type SuggestedMetrics = {
  avgCost: number | null;
  weightedReturn1yr: number | null;
  weightedReturn3yr: number | null;
  weightedSharpe: number | null;
  funds: { name: string; isin: string; weight: number }[];
};

export type PortfolioAnalysis = {
  totalWeight: number;
  notFound: string[];
  categoryBreakdown: CategoryBreakdown[];
  avgCost: number | null;
  weightedReturn1yr: number | null;
  weightedReturn3yr: number | null;
  weightedSharpe: number | null;
  swapSuggestions: SwapSuggestion[];
  summaryText: string;
  suggestedMetrics: SuggestedMetrics | null;
};
