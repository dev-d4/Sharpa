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
    <section className="relative w-full overflow-hidden px-5 sm:px-10 lg:px-20 pt-16 sm:pt-24 lg:pt-28 pb-16 sm:pb-20">
      {/* Diskret djup bakom heron — brandblå ton, långt under gradient-tröskeln */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[440px]"
        style={{ background: "radial-gradient(ellipse 75% 100% at 50% 0%, rgba(11,110,153,0.055), transparent 70%)" }}
      />
      <div className="relative max-w-[720px] mx-auto w-full">
        <HeroDemo
          belowSearch={
            <>
              <p className="mt-6 text-sm text-ink-3">
                Börjar du från noll?{" "}
                <Link
                  href="/bygg-portfolj"
                  className="inline-flex items-center gap-1 font-semibold text-accent transition-colors hover:text-accent-hover"
                >
                  Bygg en portfölj på 2 minuter
                  <span aria-hidden="true">→</span>
                </Link>
              </p>
              {rawCount > 0 && (
                <p className="mt-8 inline-flex items-center gap-2 text-[13px] text-ink-4">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-pos" />
                  {portfolioCount} portföljer analyserade hittills
                </p>
              )}
            </>
          }
        >
          <h1 className="font-heading font-bold text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.1] text-ink max-w-[680px]">
            Hur bra är <span className="text-accent">dina fonder</span> egentligen?
          </h1>
          <p className="mt-4 text-[15px] sm:text-base text-ink-2 leading-[1.6] max-w-[520px]">
            Sök upp dina fonder och se direkt hur de står sig — avgift, avkastning och risk. Vi jämför dem mot marknadens bästa alternativ
          </p>
        </HeroDemo>
      </div>
    </section>
  );
}
