import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchFromMorningstar, type PortfolioData } from "@/lib/morningstar-api";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ portfolioId: string }> },
) {
  const { portfolioId } = await params;
  const portfolioType = (req.nextUrl.searchParams.get("type") ?? "equity") as "equity" | "bond";
  const forceRefresh  = req.nextUrl.searchParams.get("refresh") === "1";

  const supabase  = adminClient();
  const today     = new Date().toISOString().slice(0, 10);

  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from("morningstar_cache")
      .select("data")
      .eq("portfolio_id", portfolioId)
      .eq("cache_date", today)
      .maybeSingle();

    if (cached?.data) {
      return NextResponse.json({ ...(cached.data as PortfolioData), _source: "cache" });
    }
  }

  let fresh: PortfolioData;
  try {
    fresh = await fetchFromMorningstar(portfolioId, portfolioType);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  await supabase.from("morningstar_cache").upsert(
    { portfolio_id: portfolioId, cache_date: today, data: fresh },
    { onConflict: "portfolio_id,cache_date" },
  );

  return NextResponse.json({ ...fresh, _source: "live" });
}
