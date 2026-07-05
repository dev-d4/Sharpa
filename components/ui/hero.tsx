import Link from "next/link";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import HeroDemo from "@/components/ui/HeroSearch";

const getAnalyzedPortfolioCount = unstable_cache(
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

function formatPortfolioCount(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 100) * 100}+`;
  if (n >= 100) return `${Math.floor(n / 10) * 10}+`;
  if (n >= 10) return `${Math.floor(n / 5) * 5}+`;
  return String(n);
}

export default async function Hero() {
  const rawCount = await getAnalyzedPortfolioCount();
  const portfolioCount = formatPortfolioCount(rawCount);

  return (
    <section className="w-full px-4 sm:px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
      <div className="max-w-6xl mx-auto">
        <HeroDemo
          belowSearch={
            <div className="mt-5 space-y-3">
              <Link
                href="/bygg-portfolj"
                className="group flex items-center justify-between gap-4 w-full max-w-xl bg-white border border-line hover:border-accent rounded-[10px] px-4 py-3 transition-colors"
                style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04)" }}
              >
                <span className="text-sm text-ink-2 min-w-0 truncate">Äger du inga fonder?</span>
                <span className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-accent group-hover:text-accent-hover">
                  Bygg min portfölj
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </Link>
              {rawCount > 0 && (
                <p className="text-sm text-ink-4">
                  {portfolioCount} portföljer analyserade hittills
                </p>
              )}
            </div>
          }
        >
          <h1 className="font-heading font-bold text-[34px] sm:text-[46px] lg:text-[52px] leading-[1.15] sm:leading-[1.1] tracking-[-0.01em] text-ink">
            Hur bra är <span className="text-accent">dina fonder</span> egentligen?
          </h1>
          <p className="mt-6 text-base sm:text-lg text-ink-2 leading-[1.7] max-w-[480px]">
            Sök upp dina fonder och se direkt hur de står sig — avgift, avkastning
            och risk. Vi jämför dem mot marknadens bästa alternativ. Gratis och oberoende.
          </p>
        </HeroDemo>
      </div>
    </section>
  );
}
