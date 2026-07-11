import Link from "next/link";
import HeroDemo from "@/components/ui/HeroSearch";
import HeroGradient from "@/components/ui/HeroGradient";

export default function Hero() {
  return (
    <section className="relative z-10 w-full overflow-visible bg-canvas px-5 sm:px-10 lg:px-20 pt-16 sm:pt-36 lg:pt-40 pb-14 sm:pb-28">
      {/* Animerad gradient-bakgrund — subtila, roterande klot som tonar ut vid skroll */}
      <HeroGradient />
      <div className="relative z-10 max-w-[720px] mx-auto w-full">
        {/* Sökfältet är sidans dominanta yta — rubriken är medvetet nedtonad ovanför det. */}
        <HeroDemo
          belowSearch={
            <>
              <p className="mt-5 text-[15px] text-ink-2 leading-[1.6] max-w-[520px] mx-auto">
                Avgift, avkastning och risk — jämfört mot liknande fonder med starka nyckeltal. Gratis och oberoende.
              </p>
              <p className="mt-4 sm:mt-5 text-sm text-ink-3">
                Äger du inga fonder?{" "}
                <Link
                  href="/bygg-portfolj"
                  className="font-semibold text-accent transition-colors hover:text-accent-hover"
                >
                  Svara på 4 frågor och se ett portföljexempel
                  <span aria-hidden="true"> →</span>
                </Link>
              </p>
            </>
          }
        >
          <h1 className="font-heading font-bold text-[30px] sm:text-[40px] lg:text-[44px] leading-[1.15] text-ink max-w-[620px] mx-auto">
            Hur bra är <span className="text-accent">dina fonder</span> egentligen?
          </h1>
        </HeroDemo>
      </div>
    </section>
  );
}
