-- Kör detta i Supabase SQL Editor (https://supabase.com/dashboard/project/jgbwzrlkmgyyglscasfe/sql)
--
-- OBS: nyare schemaändringar ligger som versionshanterade migrationer i
-- supabase/migrations/ och ska köras i filnamnsordning. Den här filen beskriver
-- grundschemat och uppdateras inte längre för varje ändring. Portföljbevakningen
-- (augusti 2026) ändrar bland annat portfolios.score till NUMERIC(4,2) — se
-- supabase/migrations/20260801_000_portfolio_score_precision.sql.

-- ── Unified fund data (one row per ISIN) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS funds (
  isin TEXT PRIMARY KEY,
  id INTEGER,
  name TEXT,
  base_currency TEXT,
  category_group TEXT,
  category TEXT,
  global_category TEXT,
  equity_style_box TEXT,
  return_ytd NUMERIC,
  return_1yr NUMERIC,
  return_2yr NUMERIC,
  return_3yr NUMERIC,
  return_5yr NUMERIC,
  investment_type TEXT,
  std_dev_3yr NUMERIC,
  std_dev_1yr NUMERIC,
  sharpe_3yr NUMERIC,
  alpha_3yr NUMERIC,
  beta_3yr NUMERIC,
  sri_value INTEGER,
  ongoing_cost_actual NUMERIC,
  ongoing_cost_estimated NUMERIC,
  source TEXT DEFAULT 'unknown',
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read funds" ON funds FOR SELECT USING (true);
CREATE POLICY "service write funds" ON funds FOR ALL USING (true) WITH CHECK (true);

-- ── Avanza offerings (which ISINs Avanza carries) ─────────────────────────────

CREATE TABLE IF NOT EXISTS avanza_offerings (
  isin TEXT PRIMARY KEY,
  name TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE avanza_offerings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read avanza_offerings" ON avanza_offerings FOR SELECT USING (true);
CREATE POLICY "service write avanza_offerings" ON avanza_offerings FOR ALL USING (true) WITH CHECK (true);

-- ── Nordnet offerings (which ISINs Nordnet carries) ───────────────────────────

CREATE TABLE IF NOT EXISTS nordnet_offerings (
  isin TEXT PRIMARY KEY,
  name TEXT,
  display_slug TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nordnet_offerings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read nordnet_offerings" ON nordnet_offerings FOR SELECT USING (true);
CREATE POLICY "service write nordnet_offerings" ON nordnet_offerings FOR ALL USING (true) WITH CHECK (true);

-- ── Views for easy browsing and cache reads ───────────────────────────────────

CREATE OR REPLACE VIEW avanza_fund_data AS
SELECT f.* FROM funds f
INNER JOIN avanza_offerings ao ON f.isin = ao.isin;

CREATE OR REPLACE VIEW nordnet_fund_data AS
SELECT f.* FROM funds f
INNER JOIN nordnet_offerings no ON f.isin = no.isin;

GRANT SELECT ON avanza_fund_data TO anon, authenticated;
GRANT SELECT ON nordnet_fund_data TO anon, authenticated;

-- ── Portfolios ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portfolios (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  custodian  TEXT NOT NULL,
  holdings   JSONB NOT NULL,  -- [{isin, name, weight}]
  analysis   JSONB NOT NULL,  -- full PortfolioAnalysis snapshot
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select own" ON portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own" ON portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own" ON portfolios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete own" ON portfolios FOR DELETE USING (auth.uid() = user_id);

-- (Risk profiles removed — see migration drop_risk_profiles.sql. The Bygg flow
--  now asks a single per-session risk-level question and persists nothing.)

-- ── Old tables (can be dropped after migration) ───────────────────────────────
-- DROP TABLE IF EXISTS avanza_funds;
-- DROP TABLE IF EXISTS nordnet_funds;
-- DROP TABLE IF EXISTS nordnet_fund_details;

-- ── Fund classification (run in Supabase SQL Editor) ─────────────────────────
-- Step 1: Add the column
ALTER TABLE funds ADD COLUMN IF NOT EXISTS selection_id TEXT;

-- Step 2: Index for fast filtering in build-portfolio and fund-quiz
CREATE INDEX IF NOT EXISTS idx_funds_selection_id ON funds(selection_id);

-- Step 3: Recreate views so SELECT * picks up the new column.
-- Postgres freezes the column list at view-creation time, so we must recreate.
CREATE OR REPLACE VIEW avanza_fund_data AS
SELECT f.* FROM funds f
INNER JOIN avanza_offerings ao ON f.isin = ao.isin;

CREATE OR REPLACE VIEW nordnet_fund_data AS
SELECT f.* FROM funds f
INNER JOIN nordnet_offerings no ON f.isin = no.isin;

-- Step 4: After running the SQL above, run the classification script:
--   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/classify-funds.ts

-- ── Portfolio health score (migration 2024-06) ────────────────────────────────
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS score             INTEGER;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS score_breakdown   JSONB;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS score_notified_at TIMESTAMPTZ;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS reminder_sent_at  TIMESTAMPTZ;

-- ── Notification preferences ──────────────────────────────────────────────────
-- Utskick kräver aktivt samtycke: kolumnerna defaultar till FALSE, och en saknad
-- rad behandlas som AV i både API och cron-jobb (GDPR art. 4.11, MFL 19 §).
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_score_alerts BOOLEAN NOT NULL DEFAULT FALSE,
  email_reminders    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select own" ON notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own" ON notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own" ON notification_preferences FOR UPDATE USING (auth.uid() = user_id);
