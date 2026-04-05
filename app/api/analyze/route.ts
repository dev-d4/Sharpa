import { NextRequest, NextResponse } from "next/server";
import { fetchFundsByCustodian, Custodian } from "@/lib/funds";
import { fetchNordnetDetail } from "@/lib/nordnet";
import { analyzePortfolio, PortfolioEntry } from "@/lib/analysis";
import { fetchAvanzaFunds } from "@/lib/avanza";
import { Fund } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entries: { isin: string; weight: number }[] = body.entries;
    const custodian: Custodian = body.custodian ?? "avanza";

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: "Inga fonder angivna" }, { status: 400 });
    }

    const allFunds = await fetchFundsByCustodian(custodian);
    const fundMap = new Map(allFunds.map((f) => [f.isin, f]));

    const requestedIsins = entries.map((e) => e.isin.trim().toUpperCase());

    // For Nordnet-exclusive ISINs (no Sharpe), fetch details on-demand
    if (custodian === "nordnet") {
      const avanzaFunds = await fetchAvanzaFunds();
      const avanzaIsins = new Set(avanzaFunds.map((f) => f.isin));

      const needsDetail = requestedIsins.filter(
        (isin) => !avanzaIsins.has(isin) && fundMap.has(isin)
      );

      if (needsDetail.length > 0) {
        // Read slugs from Supabase (stored during fund list fetch)
        const supabase = getSupabase();
        const nordnetSlugMap = new Map<string, string>();
        if (supabase) {
          const { data } = await supabase
            .from("nordnet_funds")
            .select("isin, display_slug")
            .in("isin", needsDetail);
          for (const row of data ?? []) {
            if (row.display_slug) nordnetSlugMap.set(row.isin, row.display_slug);
          }
        }

        console.log(`[analyze] needsDetail=${needsDetail.length} slugsFound=${nordnetSlugMap.size}`);

        const details = await Promise.all(
          needsDetail.map(async (isin) => {
            const slug = nordnetSlugMap.get(isin) ?? "";
            console.log(`[analyze] isin=${isin} slug=${slug}`);
            if (!slug) {
              console.log(`[analyze] no slug for ${isin}, skipping detail fetch`);
              return { isin, detail: {} };
            }
            const detail = await fetchNordnetDetail(isin, slug);
            console.log(`[analyze] detail keys=${Object.keys(detail).join(",")}`);
            return { isin, detail };
          })
        );
        for (const { isin, detail } of details) {
          const fund = fundMap.get(isin);
          if (fund && Object.keys(detail).length > 0) {
            fundMap.set(isin, { ...fund, ...detail } as Fund);
          }
        }
      }
    }

    const portfolioEntries: PortfolioEntry[] = requestedIsins.map((isin, i) => ({
      isin,
      weight: entries[i].weight,
      fund: fundMap.get(isin) ?? null,
    }));

    const categories = new Set(
      portfolioEntries.filter((e) => e.fund?.category).map((e) => e.fund!.category!)
    );

    const peerFunds = Array.from(fundMap.values()).filter(
      (f) => f.category !== null && categories.has(f.category)
    );

    const analysis = analyzePortfolio(portfolioEntries, peerFunds);
    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

