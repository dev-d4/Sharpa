-- 20260801_002_notification_preferences.sql
--
-- Portföljbevakning, del 3 av 3: notifieringsinställningar.
--
-- Tabellen fanns redan beskriven i supabase_schema.sql men saknade spårbarhet
-- för avregistrering. Migrationen är skriven så att den fungerar både på ett
-- projekt där tabellen redan finns och på ett tomt projekt.

BEGIN;

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_score_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  email_reminders    BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- När och hur användaren senast avregistrerade sig. 'one-click' = RFC 8058
-- List-Unsubscribe-Post, 'link' = klick på länken i mejlet, 'account' =
-- ändring under Mitt konto.
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS unsubscribed_at     TIMESTAMPTZ;
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS unsubscribe_source  TEXT;

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own" ON notification_preferences;
DROP POLICY IF EXISTS "insert own" ON notification_preferences;
DROP POLICY IF EXISTS "update own" ON notification_preferences;

CREATE POLICY "select own" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMIT;
