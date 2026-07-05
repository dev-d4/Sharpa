import Hero from "@/components/ui/hero";
import HowItWorks from "@/components/ui/HowItWorks";

export default function LandingPage() {
  return (
    <>
      <div className="relative">
        <div className="bg-canvas">
          <Hero />
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24 sm:pb-32">
            <HowItWorks />
          </div>
        </div>

        {/* För företag */}
        <section className="bg-blue-800 mobile-dark-extend">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-32">
            <div className="max-w-2xl mb-10 sm:mb-12">
              <p className="text-xs font-semibold text-blue-300 uppercase tracking-[0.08em] mb-3">För företag och rådgivare</p>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white leading-tight">
                Professionella verktyg för rådgivare
              </h2>
              <p className="text-blue-200 mt-4 text-base leading-[1.7]">
                För finansiella rådgivare och kapitalförvaltare som vill leverera datadrivna fondanalyser — oberoende och transparenta.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5 max-w-4xl">
              {/* Rådgivningsmodul */}
              <div className="bg-white/[0.06] border border-white/10 rounded-xl p-6 sm:p-7 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-blue-300 uppercase tracking-[0.08em]">Rådgivningsmodul</p>
                  <h3 className="font-heading text-lg font-semibold text-white">Analysera fonder i en rådgivning</h3>
                  <p className="text-sm text-blue-200 leading-relaxed">
                    Ge dina kunder oberoende, datadrivna fondanalyser direkt i rådgivningsflödet. Jämför alternativ, identifiera avgiftsläckage och generera transparenta rapporter.
                  </p>
                </div>
                <a
                  href="mailto:kontakt@sharpa.se?subject=R%C3%A5dgivningsmodulen%20%E2%80%94%20intresseanm%C3%A4lan"
                  className="inline-flex items-center gap-2 bg-white hover:bg-blue-50 text-accent-press text-sm font-semibold px-4 py-2 rounded-[10px] transition-colors"
                >
                  Kontakta oss
                </a>
              </div>

              {/* Portföljmodul */}
              <div className="bg-white/[0.06] border border-white/10 rounded-xl p-6 sm:p-7 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-blue-300 uppercase tracking-[0.08em]">Portföljmodul</p>
                  <h3 className="font-heading text-lg font-semibold text-white">Analysera era portföljer mot kunder</h3>
                  <p className="text-sm text-blue-200 leading-relaxed">
                    Granska och jämför era förvaltade portföljer mot marknadens bästa alternativ. Identifiera avgiftsläckage och förbättringsområden på portföljnivå.
                  </p>
                </div>
                <a
                  href="mailto:kontakt@sharpa.se?subject=Portf%C3%B6ljmodulen%20%E2%80%94%20intresseanm%C3%A4lan"
                  className="inline-flex items-center gap-2 bg-white hover:bg-blue-50 text-accent-press text-sm font-semibold px-4 py-2 rounded-[10px] transition-colors"
                >
                  Kontakta oss
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
