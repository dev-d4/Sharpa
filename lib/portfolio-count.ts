import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// Live count of portfolios analyzed on the platform. Cached for an hour so the
// landing page stays static-fast. Used by the hero's stats row.
export const getAnalyzedPortfolioCount = unstable_cache(
  async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return 0;
    const supabase = createClient(url, key);
    const { count } = await supabase
      .from("portfolios")
      .select("*", { count: "exact", head: true });
    return count ?? 0;
  },
  ["platform-portfolio-count"],
  { revalidate: 3600 }
);

export function formatPortfolioCount(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 100) * 100}+`;
  if (n >= 100) return `${Math.floor(n / 10) * 10}+`;
  if (n >= 10) return `${Math.floor(n / 5) * 5}+`;
  return String(n);
}
