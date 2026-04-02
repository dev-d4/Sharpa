import Link from "next/link";
import Hero from "@/components/ui/hero";
import DotPattern from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="relative bg-gradient-to-br from-white via-slate-50 to-blue-50 min-h-screen overflow-hidden">
      {/* Full-page dot pattern */}
      <DotPattern className={cn("[mask-image:radial-gradient(80vw_circle_at_50%_20%,white,transparent)]")} />

      {/* Glow blobs */}
      <div className="absolute top-[-80px] left-[-80px] w-[320px] h-[320px] bg-blue-400/15 blur-[120px] rounded-full z-0 pointer-events-none" />
      <div className="absolute top-[40%] right-[-80px] w-[400px] h-[400px] bg-indigo-400/10 blur-[160px] rounded-full z-0 pointer-events-none" />
      <div className="absolute bottom-0 left-[30%] w-[500px] h-[300px] bg-blue-300/10 blur-[140px] rounded-full z-0 pointer-events-none" />

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
              description="Sök på fondnamn eller ISIN och ange vikten för varje fond i din portfölj."
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

        {/* ── CTA ── */}
        <section className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-10 text-center space-y-4 shadow-lg shadow-blue-200">
          <h2 className="text-2xl font-bold text-white">Börja med din riskprofil</h2>
          <p className="text-blue-100">Svara på 4 frågor så vet du om din portfölj är rätt för dig. Helt gratis.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/risk-profile"
              className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
            >
              Ta fram riskprofil →
            </Link>
            <Link
              href="/analyze"
              className="inline-block text-blue-100 hover:text-white text-sm font-medium underline underline-offset-2 transition-colors"
            >
              Eller analysera direkt
            </Link>
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
