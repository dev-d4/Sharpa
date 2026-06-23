-- Portfolio documents
-- Kör i Supabase SQL Editor

-- 1. Skapa bucket (om den inte finns)
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-docs', 'portfolio-docs', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Metadata-tabell
CREATE TABLE IF NOT EXISTS portfolio_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id TEXT        NOT NULL,
  file_name    TEXT        NOT NULL,
  storage_path TEXT        NOT NULL,
  size_bytes   BIGINT,
  uploaded_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_documents_portfolio
  ON portfolio_documents (portfolio_id, uploaded_at DESC);

ALTER TABLE portfolio_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service all documents" ON portfolio_documents;
CREATE POLICY "service all documents" ON portfolio_documents
  FOR ALL USING (true) WITH CHECK (true);
