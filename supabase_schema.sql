-- Kör detta i Supabase SQL Editor (https://supabase.com/dashboard/project/jgbwzrlkmgyyglscasfe/sql)

CREATE TABLE IF NOT EXISTS funds (
  id SERIAL PRIMARY KEY,
  name TEXT,
  base_currency TEXT,
  isin TEXT UNIQUE NOT NULL,
  category_group TEXT,       -- Equity, Fixed Income, Allocation, etc.
  category TEXT,             -- EAA Fund Global Large-Cap Growth Equity etc.
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index för snabba uppslagningar
CREATE INDEX IF NOT EXISTS idx_funds_isin ON funds(isin);
CREATE INDEX IF NOT EXISTS idx_funds_category_group ON funds(category_group);
CREATE INDEX IF NOT EXISTS idx_funds_category ON funds(category);

-- Tillåt läsning utan inloggning (anon key)
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON funds FOR SELECT USING (true);
