import { NextRequest, NextResponse } from "next/server";
import { fetchAvanzaFunds } from "@/lib/avanza";
import { fetchNordnetFunds } from "@/lib/nordnet";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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

  console.log("[cron] refresh-funds done:", results);
  return NextResponse.json({ ok: true, ...results });
}
