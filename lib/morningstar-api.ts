export type AssetAllocationItem = { category: string; percentage: number };
export type RegionItem          = { name: string; percentage: number };
export type SectorItem          = { name: string; percentage: number };
export type StyleboxItem        = { name: string; code: string; percentage: number };
export type HoldingItem         = {
  name:       string;
  isin:       string;
  weight:     number;
  fund_type?: "Räntefond" | "Aktiefond" | "Blandfond" | "Kassa";
  management?: "Index" | "Aktiv" | "-";
  fee?:       number;
};

export type PortfolioData = {
  portfolio_id:    string;
  portfolio_type:  "equity" | "bond";
  period:          { start: string; end: string };
  fetch_duration_s: number;
  asset_allocation: AssetAllocationItem[];
  regions:          RegionItem[];
  sectors:          SectorItem[];
  stylebox:         StyleboxItem[];
  holdings:         HoldingItem[];
  _source?:         "cache" | "live";
  _stale_date?:     string;
};

const MS_API_URL = process.env.MORNINGSTAR_API_URL ?? "http://localhost:8000";

export async function fetchFromMorningstar(
  portfolioId: string,
  portfolioType: "equity" | "bond" = "equity",
): Promise<PortfolioData> {
  const url = new URL(`/portfolio/${encodeURIComponent(portfolioId)}`, MS_API_URL);
  url.searchParams.set("portfolio_type", portfolioType);

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(120_000),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Morningstar API ${res.status}: ${detail}`);
  }

  return res.json() as Promise<PortfolioData>;
}
