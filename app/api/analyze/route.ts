import { NextRequest, NextResponse } from "next/server";
import { supabase, Fund } from "@/lib/supabase";
import { analyzePortfolio, PortfolioEntry } from "@/lib/analysis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entries: { isin: string; weight: number }[] = body.entries;

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: "Inga fonder angivna" }, { status: 400 });
    }

    const isins = entries.map((e) => e.isin.trim().toUpperCase());

    // Hämta de angivna fonderna
    const { data: foundFunds, error } = await supabase
      .from("funds")
      .select("*")
      .in("isin", isins);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const fundMap = new Map<string, Fund>(
      (foundFunds ?? []).map((f: Fund) => [f.isin, f])
    );

    const portfolioEntries: PortfolioEntry[] = entries.map((e) => ({
      isin: e.isin.trim().toUpperCase(),
      weight: e.weight,
      fund: fundMap.get(e.isin.trim().toUpperCase()),
    }));

    // Hämta alla fonder i relevanta kategorier för byteförslag
    const categories = [
      ...new Set(
        portfolioEntries
          .filter((e) => e.fund?.category)
          .map((e) => e.fund!.category!)
      ),
    ];

    let allFunds: Fund[] = [];
    if (categories.length > 0) {
      const { data: peers } = await supabase
        .from("funds")
        .select("*")
        .in("category", categories);
      allFunds = peers ?? [];
    }

    const analysis = analyzePortfolio(portfolioEntries, allFunds);

    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
