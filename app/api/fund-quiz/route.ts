import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface QuizAnswers {
  custodian: string;
  assetClass: string;       // "equity" | "fixed-income" | "allocation" | "alternative"
  market?: string;          // "global" | "sweden" | "usa" | "europe" | "nordic" | "emerging" | "asia" | "sector"
  sector?: string;          // "tech" | "health" | "real-estate" | "energy" | "other-sector"
  management?: string;      // "any" | "passive" | "active"
  maxCost?: number | null;  // 0.3 | 0.5 | 1.0 | null (null = no limit)
  sortBy?: string;          // "sharpe" | "return" | "cost"
}

// All sector SelectionIds — used when the quiz asks for "any sector fund"
const ALL_SECTOR_IDS = ["tech", "health", "real-estate", "energy", "finance", "consumer", "industry"] as const;

type FundRow = {
  isin: string | null;
  name: string | null;
  category: string | null;
  category_group: string | null;
  selection_id: string | null;   // pre-classified in DB
  sharpe_3yr: number | null;
  return_1yr: number | null;
  return_3yr: number | null;
  ongoing_cost_actual: number | null;
  ongoing_cost_estimated: number | null;
  investment_type: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const answers: QuizAnswers = await req.json();
    const { custodian, assetClass, market, sector, management, maxCost, sortBy } = answers;

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "DB ej tillgänglig" }, { status: 500 });

    const view =
      custodian === "avanza" ? "avanza_fund_data"
      : custodian === "nordnet" ? "nordnet_fund_data"
      : "funds";

    let dbQuery = supabase
      .from(view)
      .select("isin, name, category, category_group, selection_id, sharpe_3yr, return_1yr, return_3yr, ongoing_cost_actual, ongoing_cost_estimated, investment_type")
      .not("name", "is", null);

    // Asset class filter (DB-level)
    if (assetClass === "equity") {
      dbQuery = dbQuery.eq("category_group", "Equity");
    } else if (assetClass === "fixed-income") {
      dbQuery = dbQuery.in("category_group", ["Fixed Income", "Money Market"]);
    } else if (assetClass === "allocation") {
      dbQuery = dbQuery.eq("category_group", "Allocation");
    } else if (assetClass === "alternative") {
      dbQuery = dbQuery.eq("category_group", "Alternative");
    }

    // Max cost filter (DB-level)
    if (maxCost !== null && maxCost !== undefined) {
      dbQuery = dbQuery.lte("ongoing_cost_actual", maxCost);
    }

    // Fetch all matching rows with pagination
    const FETCH_PAGE = 1000;
    const allFunds: FundRow[] = [];
    const orderedQuery = dbQuery.order("isin");
    for (let from = 0; ; from += FETCH_PAGE) {
      const { data, error } = await orderedQuery.range(from, from + FETCH_PAGE - 1);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!data || data.length === 0) break;
      allFunds.push(...(data as FundRow[]));
      if (data.length < FETCH_PAGE) break;
    }

    // Market / sector filter — applied at DB level via selection_id.
    // selection_id is pre-classified by scripts/classify-funds.ts and is
    // authoritative: no string matching, no edge-case bugs.
    let results = allFunds;

    if (assetClass === "equity" && market) {
      if (market === "sector") {
        if (sector && sector !== "other-sector") {
          // Specific sector requested (tech, health, real-estate, energy, finance, consumer, industry)
          results = results.filter((f) => f.selection_id === sector);
        } else {
          // "other-sector" or no sector specified — return all sector funds
          results = results.filter((f) => (ALL_SECTOR_IDS as readonly string[]).includes(f.selection_id ?? ""));
        }
      } else {
        // Geographic market (global, sweden, usa, europe, nordic, emerging, asia, etc.)
        results = results.filter((f) => f.selection_id === market);
      }
    }

    // Management style filter (in-memory)
    if (management === "passive") {
      results = results.filter((f) => {
        if (f.investment_type === "INDEX") return true;
        const n = f.name?.toLowerCase() ?? "";
        return n.includes("index") || n.includes("msci") || n.includes("s&p") || n.includes("etf");
      });
    } else if (management === "active") {
      results = results.filter((f) => {
        if (f.investment_type === "INDEX") return false;
        const n = f.name?.toLowerCase() ?? "";
        return !n.includes("index") && !n.includes("msci") && !n.includes("s&p") && !n.includes("etf");
      });
    }

    // Sort
    if (sortBy === "sharpe") {
      results.sort((a, b) => (b.sharpe_3yr ?? -Infinity) - (a.sharpe_3yr ?? -Infinity));
    } else if (sortBy === "return") {
      results.sort((a, b) => (b.return_3yr ?? -Infinity) - (a.return_3yr ?? -Infinity));
    } else if (sortBy === "cost") {
      results.sort((a, b) => {
        const ca = a.ongoing_cost_actual ?? a.ongoing_cost_estimated ?? Infinity;
        const cb = b.ongoing_cost_actual ?? b.ongoing_cost_estimated ?? Infinity;
        return ca - cb;
      });
    } else {
      // Default composite score
      results.sort((a, b) => {
        const sa = (a.sharpe_3yr ?? 0) * 3 + (a.return_3yr ?? 0) * 0.05 - (a.ongoing_cost_actual ?? a.ongoing_cost_estimated ?? 0) * 1.5;
        const sb = (b.sharpe_3yr ?? 0) * 3 + (b.return_3yr ?? 0) * 0.05 - (b.ongoing_cost_actual ?? b.ongoing_cost_estimated ?? 0) * 1.5;
        return sb - sa;
      });
    }

    return NextResponse.json({ funds: results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
