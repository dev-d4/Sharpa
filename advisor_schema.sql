-- Rådgivare-tabeller
-- Kör i Supabase SQL Editor
-- Säkert att köra om — tabeller och policies droppas/återskapas om de redan finns

-- ── Advisor profiles ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advisor_profiles (
  code       TEXT PRIMARY KEY, -- personnummer + rådgivningssystemets ID
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE advisor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read profiles" ON advisor_profiles;
CREATE POLICY "public read profiles" ON advisor_profiles FOR SELECT USING (true);

-- ── Advisor dashboards ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advisor_dashboards (
  advisor_code TEXT PRIMARY KEY,
  sections     JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE advisor_dashboards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read dashboard"  ON advisor_dashboards;
DROP POLICY IF EXISTS "public write dashboard" ON advisor_dashboards;
CREATE POLICY "public read dashboard"  ON advisor_dashboards FOR SELECT USING (true);
CREATE POLICY "public write dashboard" ON advisor_dashboards FOR ALL    USING (true) WITH CHECK (true);

-- ── Dashboard commentary ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dashboard_commentary (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content    TEXT        NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dashboard_commentary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read commentary" ON dashboard_commentary;
CREATE POLICY "public read commentary" ON dashboard_commentary FOR SELECT USING (true);

-- ── App settings ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
-- Endast service role (admin-routes) har åtkomst — inga policies för anon/authenticated
