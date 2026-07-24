import Hero from "@/components/ui/hero";
import StatsRow from "@/components/ui/StatsRow";
import HowItWorks from "@/components/ui/HowItWorks";

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
        <section className="bg-blue-800 mobile-dark-extend">
          <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 sm:py-16">
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="max-w-3xl">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-blue-300">För företag och rådgivare</p>
                <h2 className="font-heading text-2xl font-bold leading-tight text-white sm:text-3xl">
                  Fond- och portföljanalys för professionell rådgivning
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-blue-200 sm:text-base">
                  Jämför fonder och förvaltade portföljer, identifiera avgiftsläckage och skapa transparenta underlag för kundmötet.
                </p>
              </div>
              <a
                href="mailto:sharpakontakt@gmail.com?subject=Professionella%20verktyg%20%E2%80%94%20intresseanm%C3%A4lan"
                className="inline-flex w-fit items-center justify-center rounded-[10px] bg-white px-5 py-2.5 text-sm font-semibold text-accent-press transition-colors hover:bg-blue-50"
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
