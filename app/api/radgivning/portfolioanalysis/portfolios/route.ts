import { NextResponse } from "next/server";

const MS_API_URL = process.env.MORNINGSTAR_API_URL ?? "http://localhost:8000";

export async function GET() {
  const res = await fetch(`${MS_API_URL}/portfolios`, {
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    return NextResponse.json({ error: detail }, { status: 502 });
  }
  return NextResponse.json(await res.json());
}
