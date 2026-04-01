import { NextRequest, NextResponse } from "next/server";
import { fetchFundsByCustodian, Custodian } from "@/lib/funds";
import { fetchNordnetDetail } from "@/lib/nordnet";
import { analyzePortfolio, PortfolioEntry } from "@/lib/analysis";
import { fetchAvanzaFunds } from "@/lib/avanza";
import { Fund } from "@/lib/supabase";

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
      const slugs = await fetchNordnetListWithSlugs();
      const nordnetSlugMap = new Map(slugs.map((s) => [s.isin, s.slug]));

      const needsDetail = requestedIsins.filter(
        (isin) => !avanzaIsins.has(isin) && fundMap.has(isin)
      );

      if (needsDetail.length > 0) {
        const details = await Promise.all(
          needsDetail.map(async (isin) => {
            const slug = nordnetSlugMap.get(isin) ?? "";
            if (!slug) return { isin, detail: {} };
            return { isin, detail: await fetchNordnetDetail(isin, slug) };
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

// ── Fetch Nordnet list with display slugs (cached) ────────────────────────────

import { unstable_cache } from "next/cache";

const fetchNordnetListWithSlugs = unstable_cache(
  async (): Promise<{ isin: string; slug: string }[]> => {
    const headers = {
      "client-id": "NEXT",
      ntag: "NO_NTAG_RECEIVED_YET",
      Accept: "application/json",
      Referer: "https://www.nordnet.se/",
    };

    const results: { isin: string; slug: string }[] = [];
    let offset = 0;
    let total = 9999;

    while (offset < total) {
      const url = `https://www.nordnet.se/api/2/instrument_search/query/fundlist?sort_order=asc&sort_attribute=fund_yearly_fee&limit=100&offset=${offset}`;
      const res = await fetch(url, { headers });
      if (!res.ok) break;
      const data = await res.json();
      total = data.total_hits ?? 0;
      for (const r of data.results ?? []) {
        if (r.instrument_info?.isin && r.nnx_info?.display_slug) {
          results.push({ isin: r.instrument_info.isin, slug: r.nnx_info.display_slug });
        }
      }
      offset += 100;
    }

    return results;
  },
  ["nordnet-slugs"],
  { revalidate: 30 * 24 * 60 * 60 }
);
