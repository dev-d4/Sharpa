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

  // ── Portföljbevakning ───────────────────────────────────────────────────────
  /** När cron-jobbet senast analyserade om portföljen mot aktuell fonddata. */
  last_checked_at?: string | null;
  /** Fonddataversionen den senaste kontrollen använde. */
  last_checked_fund_version?: string | null;
  /** Betyget vid det senast skickade notismejlet. */
  last_notification_score?: number | null;
  last_notification_message_id?: string | null;
  last_notification_status?: string | null;
};

/** En rad i portfolio_score_history. */
export type PortfolioScoreHistoryEntry = {
  id: string;
  portfolio_id: string;
  score: number;
  previous_score: number | null;
  score_delta: number | null;
  reasons: string[] | null;
  notified: boolean;
  calculated_at: string;
};
