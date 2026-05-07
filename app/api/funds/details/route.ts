import { NextRequest, NextResponse } from "next/server";
import { fetchFundsByCustodian, Custodian } from "@/lib/funds";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw      = searchParams.get("isins") ?? "";
  const custodian = (searchParams.get("custodian") ?? "avanza") as Custodian;

  const isins = new Set(
    raw.split(",").map(s => s.trim().toUpperCase()).filter(Boolean)
  );

  if (!isins.size) return NextResponse.json([]);

  try {
    const allFunds = await fetchFundsByCustodian(custodian);
    const result   = allFunds.filter(f => isins.has(f.isin));
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
