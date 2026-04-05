-- Kör detta i Supabase SQL Editor (https://supabase.com/dashboard/project/jgbwzrlkmgyyglscasfe/sql)

-- ── Avanza fund cache ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS avanza_funds (
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
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE avanza_funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read avanza_funds" ON avanza_funds FOR SELECT USING (true);
CREATE POLICY "service write avanza_funds" ON avanza_funds FOR ALL USING (true) WITH CHECK (true);

-- ── Nordnet fund cache ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nordnet_funds (
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
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nordnet_funds ADD COLUMN IF NOT EXISTS display_slug TEXT;

ALTER TABLE nordnet_funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read nordnet_funds" ON nordnet_funds FOR SELECT USING (true);
CREATE POLICY "service write nordnet_funds" ON nordnet_funds FOR ALL USING (true) WITH CHECK (true);

-- ── Nordnet per-fund detail cache (Sharpe, alpha, beta, std dev) ──────────────

CREATE TABLE IF NOT EXISTS nordnet_fund_details (
  isin TEXT PRIMARY KEY,
  sharpe_3yr NUMERIC,
  std_dev_3yr NUMERIC,
  std_dev_1yr NUMERIC,
  alpha_3yr NUMERIC,
  beta_3yr NUMERIC,
  ongoing_cost_actual NUMERIC,
  ongoing_cost_estimated NUMERIC,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nordnet_fund_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read nordnet_fund_details" ON nordnet_fund_details FOR SELECT USING (true);
CREATE POLICY "service write nordnet_fund_details" ON nordnet_fund_details FOR ALL USING (true) WITH CHECK (true);

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
