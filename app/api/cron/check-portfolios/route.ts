import { NextRequest, NextResponse } from "next/server";
import { runPortfolioWatch } from "@/lib/portfolio-watch-runner";
import { createSupabaseWatchStore } from "@/lib/portfolio-watch-store";
import { loadCustodianFunds } from "@/lib/analysis-service";
import { getScoreDropThreshold } from "@/lib/portfolio-watch";

/**
 * Daglig portföljbevakning.
 *
 * Kör igenom sparade portföljer, analyserar om dem mot AKTUELL fonddata,
 * uppdaterar betyg och historik, och mejlar användaren när betyget försämrats
 * minst PORTFOLIO_SCORE_DROP_THRESHOLD poäng.
 *
 * Ordningsval (alternativ A i kravspecen): två separata cron-jobb behålls.
 * refresh-funds kör måndag 03:00, den här kör dagligen 08:00. Att i stället
 * låta fonduppdateringen anropa portföljkontrollen (alternativ B) skulle
 * kedja ihop två långa körningar i en och samma funktionsinvokation och
 * riskera timeout mitt i utskicken. Med två jobb får fonduppdateringen fem
 * timmars marginal innan kontrollen börjar, och kontrollen gör sig ändå
 * oberoende av tajmingen genom att gate:a på fonddataversionen: portföljer
 * som redan kontrollerats mot samma version hoppas över. En körning på
 * halvuppdaterad data kan därför bara leda till att arbetet görs om nästa dag
 * mot den då kompletta versionen — aldrig till dubbla mejl.
 */

export const dynamic = "force-dynamic";
// Vercels maxgräns beror på plan. Körningen har en egen tidsbudget under den
// här och plockar upp återstoden nästa dag, eftersom den är idempotent.
export const maxDuration = 60;

const TIME_BUDGET_MS = 45_000;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPortfolioWatch({
      store: createSupabaseWatchStore(),
      loadFunds: loadCustodianFunds,
      threshold: getScoreDropThreshold(),
      timeBudgetMs: TIME_BUDGET_MS,
    });

    // Aggregerade siffror och en fonddataversion — varken e-postadresser,
    // portföljnamn eller innehav.
    console.log("[cron] check-portfolios klar:", JSON.stringify(result));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cron] check-portfolios avbröts: ${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
