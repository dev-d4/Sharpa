-- 20260801_001_portfolio_score_history.sql
--
-- Portföljbevakning, del 2 av 3: riktig betygshistorik.
--
-- Tidigare skrevs bara senaste betyget över på portfolios.score. Utan historik
-- går det inte att visa en utveckling, felsöka en notis i efterhand eller
-- avgöra om en körning redan behandlats. En rad per (portfölj, fonddataversion).

BEGIN;

CREATE TABLE IF NOT EXISTS portfolio_score_history (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id       UUID NOT NULL REFERENCES portfolios(id)  ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,

  score              NUMERIC(4,2) NOT NULL,   -- nytt betyg, 0–10 med decimaler
  previous_score     NUMERIC(4,2),            -- NULL vid baslinjeraden
  score_delta        NUMERIC(5,2),            -- score - previous_score

  score_breakdown    JSONB,                   -- PortfolioScoreResult
  metrics            JSONB,                   -- kompakt jämförelseunderlag
  analysis_snapshot  JSONB,                   -- hela PortfolioAnalysis
  reasons            JSONB,                   -- härledda orsaker (max 3)

  -- Identifierare för fonddata-/cron-körningen: max(funds.fetched_at) i ISO.
  fund_data_version  TEXT NOT NULL,

  notified           BOOLEAN NOT NULL DEFAULT FALSE,
  notification_message_id TEXT,

  calculated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Idempotens: en körning mot samma fonddata kan aldrig skapa två rader för
  -- samma portfölj. ON CONFLICT DO NOTHING i cron-jobbet blir därmed en
  -- tillförlitlig "har jag redan behandlat den här?"-koll.
  CONSTRAINT portfolio_score_history_run_unique
    UNIQUE (portfolio_id, fund_data_version)
);

CREATE INDEX IF NOT EXISTS idx_psh_portfolio_calculated
  ON portfolio_score_history(portfolio_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_psh_user
  ON portfolio_score_history(user_id);

ALTER TABLE portfolio_score_history ENABLE ROW LEVEL SECURITY;

-- Endast läsning för ägaren. Skrivning sker uteslutande med service role i
-- serverkod (service role går förbi RLS) — därför finns ingen insert/update-
-- policy alls för authenticated.
DROP POLICY IF EXISTS "select own score history" ON portfolio_score_history;
CREATE POLICY "select own score history" ON portfolio_score_history
  FOR SELECT USING (auth.uid() = user_id);

COMMIT;
