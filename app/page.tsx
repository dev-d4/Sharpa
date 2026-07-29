import Hero from "@/components/ui/hero";
import StatsRow from "@/components/ui/StatsRow";
import HowItWorks from "@/components/ui/HowItWorks";
import { buttonClass } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <>
      <div className="relative">
        <div className="bg-canvas">
          <Hero />
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
            <div className="h-px bg-line" />
            <StatsRow />
            <div className="h-px bg-line" />
            <HowItWorks />
          </div>
        </div>

        {/* För företag */}
        <section className="border-t border-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="max-w-[720px]">
                <p className="label-meta mb-3">För företag och rådgivare</p>
                <h2 className="font-display text-[26px] leading-tight text-ink sm:text-[32px]">
                  Fond- och portföljanalys för professionell rådgivning
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2 sm:text-base">
                  Jämför fonder och förvaltade portföljer, identifiera avgiftsläckage och skapa transparenta underlag för kundmötet.
                </p>
              </div>
              <a
                href="mailto:sharpakontakt@gmail.com?subject=Professionella%20verktyg%20%E2%80%94%20intresseanm%C3%A4lan"
                className={buttonClass("secondary", "w-fit")}
              >
                Kontakta oss
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
