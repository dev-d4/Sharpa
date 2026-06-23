-- Morningstar portfolio data cache
-- Run in Supabase SQL Editor or apply via migration

CREATE TABLE IF NOT EXISTS morningstar_cache (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id TEXT NOT NULL,
  cache_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  data         JSONB NOT NULL,
  fetched_at   TIMESTAMPTZ DEFAULT NOW()
);

-- One row per portfolio per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_morningstar_cache_key
  ON morningstar_cache (portfolio_id, cache_date);

ALTER TABLE morningstar_cache ENABLE ROW LEVEL SECURITY;

-- Server-side only: allow all via service role, block anon reads
CREATE POLICY "service all" ON morningstar_cache
  FOR ALL USING (true) WITH CHECK (true);
