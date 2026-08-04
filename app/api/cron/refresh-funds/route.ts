import { NextRequest, NextResponse } from "next/server";
import { fetchAvanzaFunds } from "@/lib/avanza";
import { fetchNordnetFunds } from "@/lib/nordnet";
import { createSupabaseWatchStore } from "@/lib/portfolio-watch-store";

/**
 * Fonddatauppdatering, måndag 03:00.
 *
 * Triggar inte portföljkontrollen direkt — den kör som eget cron-jobb och
 * upptäcker den nya datan via fonddataversionen (max funds.fetched_at). Se
 * kommentaren i app/api/cron/check-portfolios/route.ts för motiveringen.
 * Versionen loggas här så att de två körningarna går att para ihop vid
 * felsökning.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  try {
    const avanza = await fetchAvanzaFunds({ force: true });
    results.avanza = avanza.length;
  } catch (err) {
    results.avanzaError = String(err);
  }

  try {
    const nordnet = await fetchNordnetFunds({ force: true });
    results.nordnet = nordnet.length;
  } catch (err) {
    results.nordnetError = String(err);
  }

  try {
    results.fundDataVersion = await createSupabaseWatchStore().getFundDataVersion();
  } catch (err) {
    results.fundDataVersionError = String(err);
  }

  console.log("[cron] refresh-funds done:", results);
  return NextResponse.json({ ok: true, ...results });
}
