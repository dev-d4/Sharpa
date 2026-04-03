import Link from "next/link";
import Hero from "@/components/ui/hero";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">


      <Hero />
      <div className="relative z-10 max-w-5xl mx-auto px-6 space-y-24 py-16">

        {/* ── Features ── */}
        <section className="pb-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Hur det fungerar</h2>
            <p className="text-slate-500 mt-2">Tre steg för att förbättra din portfölj</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            <FeatureCard
              step={1}
              icon={
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
              title="Ta fram din riskprofil"
              description="Svara på 4 frågor om din tidshorisont och risktolerans. Tar under en minut."
            />
            <FeatureCard
              step={2}
              icon={
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              }
              title="Lägg in dina fonder"
              description="Sök på fondnamn ange vikten för varje fond i din portfölj."
            />
            <FeatureCard
              step={3}
              icon={
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m1.636-6.364-.707-.707M12 21v-1M7.05 7.05l-.707-.707M16.95 7.05l.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
                </svg>
              }
              title="Få personliga förslag"
              description="Se om din portfölj matchar din risknivå och få förslag på fonder som passar dig bättre."
            />
          </div>
        </section>

        {/* ── Example swap ── */}
        <section className="space-y-5 text-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Så här ser ett fondbytesförslag ut</h2>
            <p className="text-slate-500 mt-2 text-sm">Exempel på ett fondbyte — Globalfonder</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 max-w-sm mx-auto">
            <div className="flex items-center gap-3">
              {/* From */}
              <div className="flex-1 text-left">
                <p className="text-xs text-slate-400 mb-0.5">Byt från</p>
                <p className="text-sm font-semibold text-slate-800 leading-tight">Nordea Globalfond</p>
                <p className="text-base font-bold text-red-500 mt-1">1.40% / år</p>
              </div>

              {/* Arrow */}
              <svg className="w-5 h-5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>

              {/* To */}
              <div className="flex-1 text-right">
                <p className="text-xs text-green-600 mb-0.5">Byt till</p>
                <p className="text-sm font-semibold text-slate-800 leading-tight">Avanza Global</p>
                <p className="text-base font-bold text-green-600 mt-1">0.05% / år</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">Avgiftsbesparing</p>
              <p className="text-lg font-bold text-blue-600">−1.35 procentenheter / år</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

function FeatureCard({ step, icon, title, description }: { step: number; icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Steg {step}</span>
      </div>
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
