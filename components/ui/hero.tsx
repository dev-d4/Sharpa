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
                Avgift, avkastning och risk — jämfört mot liknande fonder. Gratis och oberoende.
              </p>
              <div className="mx-auto mt-6 flex max-w-[520px] items-center gap-3">
                <div className="h-px flex-1 bg-line" />
                <span className="text-xs text-ink-4">eller</span>
                <div className="h-px flex-1 bg-line" />
              </div>
              <div className="mt-4">
                <Link
                  href="/bygg-portfolj"
                  className="inline-flex flex-col items-center rounded-xl border border-info-line bg-white/70 px-6 py-3.5 transition-colors hover:bg-white"
                >
                  <span className="text-sm font-semibold text-accent">
                    Jag vill bygga en ny portfölj <span aria-hidden="true">→</span>
                  </span>
                  <span className="mt-0.5 text-xs text-ink-3">Svara på 4 frågor och se ett portföljexempel</span>
                </Link>
              </div>
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
