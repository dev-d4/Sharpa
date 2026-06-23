-- Managed portfolios — curated list exposed via portfolio analysis tool
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS managed_portfolios (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  morningstar_id   TEXT         NOT NULL,
  slug             TEXT         NOT NULL,
  display_name     TEXT         NOT NULL DEFAULT '',
  fee              NUMERIC(5,2),
  risk_level       SMALLINT     CHECK (risk_level BETWEEN 1 AND 5),
  portfolio_type   TEXT         NOT NULL DEFAULT 'equity' CHECK (portfolio_type IN ('equity', 'bond')),
  commentary       TEXT         NOT NULL DEFAULT '',
  metadata         JSONB        NOT NULL DEFAULT '{}',
  active           BOOLEAN      NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_managed_portfolios_morningstar_id
  ON managed_portfolios (morningstar_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_managed_portfolios_slug
  ON managed_portfolios (slug);

ALTER TABLE managed_portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service all" ON managed_portfolios;
CREATE POLICY "service all" ON managed_portfolios
  FOR ALL USING (true) WITH CHECK (true);
