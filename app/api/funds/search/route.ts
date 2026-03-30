import { NextRequest, NextResponse } from "next/server";
import { fetchAvanzaFunds } from "@/lib/avanza";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const funds = await fetchAvanzaFunds();

  const results = funds
    .filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.isin.toLowerCase().startsWith(q)
    )
    .slice(0, 10)
    .map((f) => ({ name: f.name, isin: f.isin }));

  return NextResponse.json(results);
}
