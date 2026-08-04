-- Bevakningsmejl kräver aktivt samtycke.
--
-- Förvalt påslagna utskick är inget giltigt samtycke (GDPR art. 4.11, skäl 32)
-- och e-post till fysiska personer kräver föregående samtycke enligt 19 §
-- marknadsföringslagen (2008:486). Kolumnernas default vänds till FALSE.
--
-- Befintliga rader lämnas orörda: de användare som faktiskt kryssat i rutan har
-- en rad med TRUE och behåller sin bevakning. Användare som aldrig tagit
-- ställning saknar rad, och både API:t och cron-jobbet behandlar nu en saknad
-- rad som AV.

ALTER TABLE notification_preferences
  ALTER COLUMN email_score_alerts SET DEFAULT FALSE;

ALTER TABLE notification_preferences
  ALTER COLUMN email_reminders SET DEFAULT FALSE;
