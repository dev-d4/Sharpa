import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// Live counts used by the hero's stats row. Cached for 10 minutes so the landing
// page stays static-fast while still refreshing the numbers reasonably often.
const STATS_REVALIDATE = 600;

async function countRows(table: string): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return 0;
  const supabase = createClient(url, key);
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}

// Number of saved portfolios on the platform.
export const getAnalyzedPortfolioCount = unstable_cache(
  () => countRows("portfolios"),
  ["platform-portfolio-count"],
  { revalidate: STATS_REVALIDATE }
);

// Number of funds available for analysis.
export const getAnalyzedFundCount = unstable_cache(
  () => countRows("funds"),
  ["platform-fund-count"],
  { revalidate: STATS_REVALIDATE }
);

export function formatPortfolioCount(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 100) * 100}+`;
  if (n >= 100) return `${Math.floor(n / 10) * 10}+`;
  if (n >= 10) return `${Math.floor(n / 5) * 5}+`;
  return String(n);
}

// Rounds down to the nearest 100 with a locale-aware thousands separator
// (e.g. 2120 → "2 100+" in Swedish, "2,100+" in English).
export function formatFundCount(n: number, locale: string = "sv-SE"): string {
  if (n < 100) return String(n);
  return `${(Math.floor(n / 100) * 100).toLocaleString(locale)}+`;
}
