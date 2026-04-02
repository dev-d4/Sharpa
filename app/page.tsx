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
              icon={
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              }
              title="Lägg in dina fonder"
              description="Sök på fondnamn eller ISIN och ange vikten för varje fond i din portfölj."
            />
            <FeatureCard
              icon={
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
                </svg>
              }
              title="Se dina nyckeltal"
              description="Få direkt en bild av din genomsnittliga avgift, avkastning och Sharpe-kvot."
            />
            <FeatureCard
              icon={
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m1.636-6.364-.707-.707M12 21v-1M7.05 7.05l-.707-.707M16.95 7.05l.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
                </svg>
              }
              title="Optimera portföljen"
              description="Logga in för att se personliga fondbytesförslag och hur din portfölj kan förbättras."
            />
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl p-10 text-center space-y-4 shadow-lg shadow-blue-200">
          <h2 className="text-2xl font-bold text-white">Redo att analysera din portfölj?</h2>
          <p className="text-blue-100">Det tar under en minut och är helt kostnadsfritt.</p>
          <Link
            href="/analyze"
            className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
          >
            Kom igång nu →
          </Link>
        </section>

      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
