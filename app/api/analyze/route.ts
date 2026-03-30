import { NextRequest, NextResponse } from "next/server";
import { fetchAvanzaFunds } from "@/lib/avanza";
import { analyzePortfolio, PortfolioEntry } from "@/lib/analysis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entries: { isin: string; weight: number }[] = body.entries;

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: "Inga fonder angivna" }, { status: 400 });
    }

    const allFunds = await fetchAvanzaFunds();
    const fundMap = new Map(allFunds.map((f) => [f.isin, f]));

    const portfolioEntries: PortfolioEntry[] = entries.map((e) => ({
      isin: e.isin.trim().toUpperCase(),
      weight: e.weight,
      fund: fundMap.get(e.isin.trim().toUpperCase()) ?? null,
    }));

    const categories = new Set(
      portfolioEntries.filter((e) => e.fund?.category).map((e) => e.fund!.category!)
    );
    const peerFunds = allFunds.filter(
      (f) => f.category !== null && categories.has(f.category)
    );

    const analysis = analyzePortfolio(portfolioEntries, peerFunds);
    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
