-- 20260801_000_portfolio_score_precision.sql
--
-- Portföljbevakning, del 1 av 3: betygsprecision och kontrollmetadata.
--
-- Bakgrund: portfolios.score skapades som INTEGER. Betyget beräknas på skalan
-- 0–10 med en decimal, så en försämring från 7,6 till 7,0 avrundades tidigare
-- till 8 → 7 i ena fallet och 8 → 8 i ett annat. Tröskeljämförelsen blev därmed
-- godtycklig. Kolumnen byter typ till NUMERIC(4,2) så att decimaler bevaras.
--
-- Körs i Supabase SQL Editor eller via supabase db push. Idempotent.

BEGIN;

-- ── Betyg med decimaler ───────────────────────────────────────────────────────
-- ALTER TYPE på INTEGER → NUMERIC är en säker vidgning: befintliga heltal
-- bevaras exakt. DO-blocket gör migrationen omkörningsbar.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'portfolios'
      AND column_name  = 'score'
      AND data_type   <> 'numeric'
  ) THEN
    ALTER TABLE portfolios
      ALTER COLUMN score TYPE NUMERIC(4,2) USING score::NUMERIC(4,2);
  END IF;
END $$;

-- ── Kontroll- och notifieringsmetadata ────────────────────────────────────────

-- När portföljen senast analyserades om av cron-jobbet.
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;

-- Vilken fonddataversion (max funds.fetched_at) kontrollen använde. Gör den
-- dagliga körningen idempotent: samma version kontrolleras aldrig två gånger.
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS last_checked_fund_version TEXT;

-- Betyget vid det senast SKICKADE notismejlet. Skiljer sig från score, som
-- uppdateras vid varje kontroll. Används för att inte mejla om samma
-- förändring två gånger.
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS last_notification_score NUMERIC(4,2);

-- Resends message-id för senaste notis, samt utfall ('sent' | 'failed').
-- Enbart för felsökning — innehåller ingen persondata.
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS last_notification_message_id TEXT;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS last_notification_status TEXT;

-- Cron-jobbet plockar portföljer som ännu inte kontrollerats mot aktuell
-- fonddataversion.
CREATE INDEX IF NOT EXISTS idx_portfolios_last_checked_fund_version
  ON portfolios(last_checked_fund_version);

COMMIT;
