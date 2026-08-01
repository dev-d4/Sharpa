import { NextRequest, NextResponse } from "next/server";
import { analyzePortfolioEntries } from "@/lib/analysis-service";
import type { Custodian } from "@/lib/funds";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entries: { isin: string; weight: number }[] = body.entries;
    const custodian: Custodian = body.custodian ?? "avanza";

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: "Inga fonder angivna" }, { status: 400 });
    }

    const { analysis } = await analyzePortfolioEntries(entries, custodian);
    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
