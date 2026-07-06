import Link from "next/link";
import HeroDemo from "@/components/ui/HeroSearch";

export default function Hero() {
  return (
    <section className="relative w-full overflow-hidden px-5 sm:px-10 lg:px-20 pt-20 sm:pt-28 lg:pt-32 pb-16 sm:pb-24">
      {/* Diskret djup bakom heron — brandblå ton, långt under gradient-tröskeln */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[440px]"
        style={{ background: "radial-gradient(ellipse 75% 100% at 50% 0%, rgba(11,110,153,0.055), transparent 70%)" }}
      />
      <div className="relative max-w-[720px] mx-auto w-full">
        {/* Sökfältet är sidans dominanta yta — rubriken är medvetet nedtonad ovanför det. */}
        <HeroDemo
          belowSearch={
            <>
              <p className="mt-5 text-[15px] text-ink-2 leading-[1.6] max-w-[520px] mx-auto">
                Avgift, avkastning och risk — jämfört mot marknadens bästa alternativ. Gratis och oberoende.
              </p>
              <p className="mt-5 text-sm text-ink-3">
                Äger du inga fonder?{" "}
                <Link
                  href="/bygg-portfolj"
                  className="font-semibold text-accent transition-colors hover:text-accent-hover"
                >
                  Svara på 6 frågor och få en portfölj föreslagen
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
