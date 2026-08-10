import HeroDemo from "@/components/ui/HeroSearch";
import HeroBackground from "@/components/ui/HeroBackground";
import StatsRow from "@/components/ui/StatsRow";

export default function Hero() {
  return (
    // Platt pappersyta — gradienten och de roterande kloten är borttagna.
    // Sökfältet är sidans dominanta yta, rubriken satt i redaktionell serif.
    <section className="relative z-20 w-full bg-canvas px-5 py-16 sm:px-10 sm:pt-24 sm:pb-20 lg:px-20">
      <HeroBackground />
      <div className="relative z-20 mx-auto w-full max-w-[760px]">
        <HeroDemo
          belowSearch={
            <p className="mx-auto mt-5 max-w-[560px] text-[15px] leading-[1.6] text-ink-2 sm:text-base">
              Analysera dina fonder gratis. Spara sedan portföljen så håller vi koll på betyget
              och mejlar dig vid en tydlig försämring.
            </p>
          }
        >
          <h1 className="mx-auto max-w-[680px] font-display text-[34px] leading-[1.1] text-ink sm:text-[48px] lg:text-[52px]">
            Hur bra är <em className="italic">dina fonder</em> egentligen?
          </h1>
        </HeroDemo>
      </div>
      <div className="relative z-10 mx-auto mt-8 max-w-6xl border-y border-line sm:mt-10">
        <StatsRow />
      </div>
    </section>
  );
}
