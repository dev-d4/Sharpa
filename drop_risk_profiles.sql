-- Migration: remove the risk_profiles feature.
--
-- The standalone "riskprofil" was removed from the product to reduce the
-- appearance of a lämplighetsbedömning (suitability assessment). The Bygg flow
-- now asks a single per-session risk-level question and nothing is persisted
-- about the user's risk tolerance.
--
-- Dropping the table also removes its RLS policies (select/insert/update own).
-- Safe to run once against the Supabase project.

DROP TABLE IF EXISTS risk_profiles;
