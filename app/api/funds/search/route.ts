import { NextRequest, NextResponse } from "next/server";
import { fetchFundsByCustodian, Custodian } from "@/lib/funds";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const custodian = (req.nextUrl.searchParams.get("custodian") ?? "avanza") as Custodian;
  if (q.length < 2) return NextResponse.json([]);

  const funds = await fetchFundsByCustodian(custodian);

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
