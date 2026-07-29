import Link from "next/link";
import HeroDemo from "@/components/ui/HeroSearch";

export default function Hero() {
  return (
    // Platt pappersyta — gradienten och de roterande kloten är borttagna.
    // Sökfältet är sidans dominanta yta, rubriken satt i redaktionell serif.
    <section className="relative w-full bg-canvas px-5 py-16 sm:px-10 sm:pt-24 sm:pb-20 lg:px-20">
      <div className="mx-auto w-full max-w-[760px]">
        <HeroDemo
          belowSearch={
            <>
              <p className="mx-auto mt-5 max-w-[560px] text-[15px] leading-[1.6] text-ink-2 sm:text-base">
                Avgift, avkastning och risk — jämfört mot liknande fonder. Gratis och oberoende.
              </p>
              <p className="mt-4 text-sm text-ink-3 sm:text-[15px]">
                Har du inga fonder att analysera?{" "}
                <Link
                  href="/bygg-portfolj"
                  className="text-accent underline decoration-line-strong underline-offset-2 transition-colors duration-150 hover:decoration-accent"
                >
                  Skapa ett portföljexempel
                </Link>
              </p>
            </>
          }
        >
          <h1 className="mx-auto max-w-[680px] font-display text-[34px] leading-[1.1] text-ink sm:text-[48px] lg:text-[52px]">
            Hur bra är dina fonder egentligen?
          </h1>
        </HeroDemo>
      </div>
    </section>
  );
}
