import Hero from "@/components/ui/hero";
import HowItWorks from "@/components/ui/HowItWorks";


export default function LandingPage() {
  return (
    <div className="relative min-h-screen">
      <Hero />
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-0 pb-10 sm:pb-16">
        <HowItWorks />
      </div>

      {/* För företag */}
      <section className="bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-28">
          <div className="text-center mb-12">
            <h2
              className="text-2xl sm:text-4xl font-bold text-white leading-tight"
              style={{ fontFamily: "var(--font-dm-serif), Georgia, serif" }}
            >
              För företag och rådgivare
            </h2>
            <p className="text-slate-400 mt-4 text-base max-w-lg mx-auto leading-relaxed">
              Professionella verktyg för finansiella rådgivare och kapitalförvaltare som vill leverera datadrivna fondanalyser — oberoende och transparenta.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Rådgivningsmodul */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-7 space-y-5">
              <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Rådgivningsmodul</p>
                <h3 className="text-xl font-semibold text-white">Analysera fonder i en rådgivning</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Ge dina kunder oberoende, datadrivna fondanalyser direkt i rådgivningsflödet. Jämför alternativ, identifiera avgiftsläckage och generera transparenta rapporter.
                </p>
              </div>
              <button
                disabled
                className="inline-flex items-center gap-2 border border-white/15 text-slate-400 text-sm font-medium px-5 py-2.5 rounded-xl cursor-default"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                Lanseras snart
              </button>
            </div>

            {/* Portföljmodul */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-7 space-y-5">
              <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Portföljmodul</p>
                <h3 className="text-xl font-semibold text-white">Analysera era portföljer mot kunder</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Granska och jämför era förvaltade portföljer mot marknadens bästa alternativ. Identifiera avgiftsläckage och förbättringsområden på portföljnivå.
                </p>
              </div>
              <button
                disabled
                className="inline-flex items-center gap-2 border border-white/15 text-slate-400 text-sm font-medium px-5 py-2.5 rounded-xl cursor-default"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                Lanseras snart
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
