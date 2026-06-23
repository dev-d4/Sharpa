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
  selection_id: string | null;
  sharpe_3yr: number | null;
  return_1yr: number | null;
  return_3yr: number | null;
  ongoing_cost_actual: number | null;
  ongoing_cost_estimated: number | null;
  investment_type: string | null;
};

// Category prefix → selection_id mapping (mirrors classify-funds.ts logic)
// Used as fallback when selection_id is null in DB
function inferSelectionId(category: string | null): string | null {
  if (!category) return null;
  const cat = category.trim();
  if (cat.startsWith("Global") || cat === "Global & Sverige") return "global";
  if (cat.startsWith("Sverige")) return "sweden";
  if (cat.startsWith("USA")) return "usa";
  if (cat.startsWith("Europa") || cat.startsWith("Euroland")) return "europe";
  if (cat.startsWith("Norden") || cat.startsWith("Nordic")) return "nordic";
  if (cat.startsWith("Tillväxtmarknader") || cat.startsWith("Emerging")) return "emerging";
  if (cat.startsWith("Asien") || cat.startsWith("Japan") || cat.startsWith("Kina") || cat.startsWith("Indien")) return "asia";
  if (cat.startsWith("Branschfond, Ny teknik") || cat.includes("Teknik")) return "tech";
  if (cat.startsWith("Branschfond, Hälsa") || cat.includes("Hälso")) return "health";
  if (cat.startsWith("Branschfond, Fastigheter") || cat.includes("Fastighet")) return "real-estate";
  if (cat.startsWith("Branschfond, Energi") || cat.startsWith("Branschfond, Råvaror")) return "energy";
  if (cat.startsWith("Branschfond, Finans")) return "finance";
  if (cat.startsWith("Branschfond")) return "other-sector";
  return null;
}

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

    // Fetch all matching rows with pagination (cost filter applied in-memory)
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

    // In-memory cost filter — uses estimated cost as fallback when actual is null
    let results = (maxCost !== null && maxCost !== undefined)
      ? allFunds.filter((f) => {
          const cost = f.ongoing_cost_actual ?? f.ongoing_cost_estimated;
          return cost === null || cost <= maxCost;
        })
      : allFunds;

    // Market / sector filter — uses selection_id with category-based fallback
    if (assetClass === "equity" && market) {
      if (market === "sector") {
        if (sector && sector !== "other-sector") {
          results = results.filter((f) => {
            const sid = f.selection_id ?? inferSelectionId(f.category);
            return sid === sector;
          });
        } else {
          results = results.filter((f) => {
            const sid = f.selection_id ?? inferSelectionId(f.category);
            return (ALL_SECTOR_IDS as readonly string[]).includes(sid ?? "");
          });
        }
      } else {
        results = results.filter((f) => {
          const sid = f.selection_id ?? inferSelectionId(f.category);
          return sid === market;
        });
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
