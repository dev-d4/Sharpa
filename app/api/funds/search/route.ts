import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchFundsByCustodian, Custodian } from "@/lib/funds";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const custodian = (req.nextUrl.searchParams.get("custodian") ?? "avanza") as Custodian;
  if (q.length < 2) return NextResponse.json([]);

  const table = custodian === "nordnet" ? "nordnet_funds" : "avanza_funds";
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from(table)
      .select("name, isin")
      .or(`name.ilike.%${q}%,isin.ilike.${q}%`)
      .limit(10);

    if (!error && data && data.length > 0) {
      return NextResponse.json(data);
    }
  }

  // Fallback: filter in memory (used when Supabase table is empty)
  const funds = await fetchFundsByCustodian(custodian);
  const results = funds
    .filter((f) => f.name.toLowerCase().includes(q) || f.isin.toLowerCase().startsWith(q))
    .slice(0, 10)
    .map((f) => ({ name: f.name, isin: f.isin }));

  return NextResponse.json(results);
}
