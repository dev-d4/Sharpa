import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Custodian } from "@/lib/funds";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

type FundEntry = { name: string; isin: string };
type CacheEntry = { funds: FundEntry[]; loadedAt: number };

// Module-level cache — survives across requests in the same Node.js process
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

async function getFundsForCustodian(custodian: string): Promise<FundEntry[]> {
  const hit = cache.get(custodian);
  if (hit && Date.now() - hit.loadedAt < CACHE_TTL_MS) return hit.funds;

  const supabase = getSupabase();
  if (!supabase) return [];

  const view = custodian === "nordnet" ? "nordnet_fund_data" : "avanza_fund_data";
  const all: FundEntry[] = [];
  const PAGE = 1000;

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(view)
      .select("name, isin")
      .not("name", "is", null)
      .order("isin")
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as FundEntry[]));
    if (data.length < PAGE) break;
  }

  if (all.length > 0) cache.set(custodian, { funds: all, loadedAt: Date.now() });
  return all;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const custodian = (req.nextUrl.searchParams.get("custodian") ?? "avanza") as Custodian;

  // Warmup: pre-populate cache, return empty
  if (q === "__warmup__") {
    getFundsForCustodian(custodian).catch(() => {});
    getFundsForCustodian(custodian === "nordnet" ? "avanza" : "nordnet").catch(() => {});
    return NextResponse.json([]);
  }

  if (q.length < 2) return NextResponse.json([]);

  const funds = await getFundsForCustodian(custodian);

  const results = funds
    .filter((f) => f.name.toLowerCase().includes(q) || f.isin.toLowerCase().startsWith(q))
    .slice(0, 100);

  return NextResponse.json(results);
}
