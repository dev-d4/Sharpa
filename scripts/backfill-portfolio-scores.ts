/**
 * Räknar om `portfolios.score` och `portfolios.score_breakdown` med en decimal.
 *
 * Bakgrund: före portföljbevakningen sparade API-routerna `Math.round(score)`,
 * så en portfölj som egentligen låg på 7,6 står som 8. Efter typbytet till
 * NUMERIC(4,2) blir den 8,00 — ett värde som aldrig funnits. Jämförs den mot
 * första riktiga decimalbetyget ser det ut som en försämring, och cron-jobbet
 * skulle mejla om en förändring som aldrig skett.
 *
 * Skriptet räknar om betyget från varje portföljs sparade `analysis` med exakt
 * samma funktion som resten av produkten, så baslinjen blir det verkliga
 * betyget för det senast kända tillståndet — inte en avrundning och inte NULL.
 *
 * Kör EN gång, efter migration 20260801_000 och före första cron-körningen.
 * Torrkörning som bara visar vad som skulle ändras:
 *
 *   npx tsx --env-file=.env.local scripts/backfill-portfolio-scores.ts --dry-run
 *
 * Skarpt:
 *
 *   npx tsx --env-file=.env.local scripts/backfill-portfolio-scores.ts
 *
 * OBS: `source .env.local && npx tsx …` fungerar INTE. `source` tilldelar
 * variablerna i skalet men exporterar dem inte, så barnprocessen ser dem
 * aldrig. Node läser filen själv med --env-file (kräver Node 20+).
 *
 * Skriptet är idempotent — en andra körning skriver samma värden.
 */

import { createClient } from "@supabase/supabase-js";
import { computePortfolioScore } from "../lib/portfolio-score";
import type { PortfolioAnalysis } from "../lib/analysis";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Saknar env: NEXT_PUBLIC_SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

type Row = {
  id: string;
  score: number | string | null;
  analysis: PortfolioAnalysis | null;
};

async function main() {
  const { data, error } = await supabase
    .from("portfolios")
    .select("id, score, analysis");

  if (error) {
    console.error(`Kunde inte läsa portföljer: ${error.message}`);
    process.exit(1);
  }

  const rows = (data ?? []) as Row[];
  console.log(`${rows.length} portföljer hittade${DRY_RUN ? " (torrkörning)" : ""}\n`);

  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.analysis) {
      // Ingen sparad analys att räkna på. Lämnas orörd — cron-jobbet skapar en
      // baslinje vid första kontrollen i stället.
      skipped++;
      continue;
    }

    let result;
    try {
      result = computePortfolioScore(row.analysis);
    } catch (err) {
      failed++;
      console.error(`  ${row.id}: kunde inte räkna om — ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    const before = row.score === null ? null : Number(row.score);
    const after = result.score;

    if (before !== null && Math.abs(before - after) < 0.005) {
      unchanged++;
      continue;
    }

    console.log(`  ${row.id}: ${before ?? "—"} → ${after.toFixed(1)}`);

    if (DRY_RUN) {
      updated++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("portfolios")
      .update({ score: after, score_breakdown: result })
      .eq("id", row.id);

    if (updateError) {
      failed++;
      console.error(`  ${row.id}: kunde inte spara — ${updateError.message}`);
      continue;
    }
    updated++;
  }

  console.log(
    `\nKlart: ${updated} ${DRY_RUN ? "skulle uppdateras" : "uppdaterade"}, ` +
    `${unchanged} redan korrekta, ${skipped} utan analys, ${failed} misslyckades`
  );

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
