/**
 * Skickar ETT riktigt notismejl till din egen adress, för att verifiera
 * Resend-nyckel, avsändardomän, rendering i mejlklienten och att
 * avregistreringslänken fungerar.
 *
 * Säkerhetsspärrar:
 *  - Adressen måste anges explicit med --to.
 *  - Adressen måste tillhöra ett riktigt konto i Supabase Auth.
 *  - Portföljen som används måste ägas av samma konto. Skriptet kan alltså
 *    inte mejla en adress om en portfölj som någon annan äger.
 *
 * Kör:
 *   npx tsx --conditions=react-server --env-file=.env.local \
 *     scripts/send-test-portfolio-alert.ts --to din@adress.se
 *
 * --conditions=react-server behövs eftersom lib/email/resend.ts importerar
 * `server-only`. Det paketet exporterar en tom modul under react-server och en
 * som kastar under alla andra villkor — utan flaggan avbryts skriptet direkt.
 *
 * Kräver att RESEND_API_KEY finns i .env.local, och att EMAIL_DRY_RUN INTE
 * gör det. Produktionens EMAIL_DRY_RUN i Vercel påverkas inte.
 *
 * Betygen i mejlet är illustrativa (nuvarande betyg → 0,7 poäng lägre) med
 * exempelorsaker. Syftet är att granska utseendet och leveransen — att
 * beslutsreglerna räknar rätt täcks av enhetstesterna.
 */

import { createClient } from "@supabase/supabase-js";
import { computePortfolioScore } from "../lib/portfolio-score";
import { sendPortfolioAlert } from "../lib/email/send-portfolio-alert";
import { isEmailSendingEnabled, getPortfolioAlertFrom } from "../lib/email/resend";
import type { PortfolioAnalysis } from "../lib/analysis";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const toIndex = process.argv.indexOf("--to");
const TO = toIndex >= 0 ? process.argv[toIndex + 1] : "";

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

if (!TO) fail("Ange mottagare: --to din@adress.se");
if (!SUPABASE_URL || !SUPABASE_KEY) {
  fail("Saknar env. Kör med: npx tsx --env-file=.env.local scripts/send-test-portfolio-alert.ts --to …");
}
if (!process.env.LINK_SECRET) {
  fail("LINK_SECRET saknas — avregistreringstoken kan inte signeras.");
}
if (!isEmailSendingEnabled()) {
  fail(
    "Utskick är avstängt lokalt. Kontrollera att RESEND_API_KEY finns i .env.local " +
    "och att EMAIL_DRY_RUN inte är satt där."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function findUserByEmail(email: string) {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`Kunde inte läsa användare: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  const user = await findUserByEmail(TO);
  if (!user) fail(`Hittade inget konto med adressen ${TO}.`);

  // Endast portföljer som ägs av just det kontot.
  const { data: portfolios, error } = await supabase
    .from("portfolios")
    .select("id, name, analysis, score")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) fail(`Kunde inte läsa portföljer: ${error.message}`);
  if (!portfolios?.length) fail(`Kontot ${TO} har inga sparade portföljer att testa med.`);

  const portfolio = portfolios[0];
  const stored = portfolio.score === null ? null : Number(portfolio.score);
  const current =
    stored ?? computePortfolioScore(portfolio.analysis as PortfolioAnalysis).score;

  const previousScore = Number(current.toFixed(1));
  const newScore = Number((previousScore - 0.7).toFixed(1));

  const reasons = [
    "Portföljens riskjusterade avkastning (Sharpe) har försämrats, från 1,20 till 0,80.",
    "Den historiska treårsavkastningen har gått ned, från 31,4 % till 24,9 %.",
    "Den genomsnittliga avgiften har ökat, från 0,30 % till 0,45 %.",
  ];

  console.log(`Mottagare:  ${TO}`);
  console.log(`Portfölj:   ${portfolio.name}`);
  console.log(`Avsändare:  ${getPortfolioAlertFrom()}`);
  console.log(`Betyg:      ${previousScore} → ${newScore} (illustrativt)\n`);

  const result = await sendPortfolioAlert({
    to: TO,
    userId: user.id,
    portfolioId: portfolio.id,
    portfolioName: portfolio.name,
    previousScore,
    newScore,
    reasons,
    fundDataVersion: `manuellt-test-${new Date().toISOString()}`,
  });

  if (!result.ok) {
    fail("skipped" in result && result.skipped ? `Utskick hoppades över: ${result.reason}` : `Resend svarade med fel: ${result.error}`);
  }

  console.log(`✓ Skickat. Resend message-id: ${result.messageId}`);
  console.log("\nAtt granska i mejlet:");
  console.log("  · rubrik, betygsruta och de tre orsakerna");
  console.log("  · knappen 'Se vad som har förändrats' → ska öppna din portfölj");
  console.log("  · avsändaren bevakning@sharpa.se, inte no-reply@");
  console.log("  · Gmails 'Avprenumerera' högst upp (List-Unsubscribe)");
  console.log("\nOBS: avregistreringslänken är skarp. Klickar du på den stängs");
  console.log("dina egna notiser av — slå på dem igen under Mitt konto.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
