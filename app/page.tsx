import Link from "next/link";
import Hero from "@/components/ui/hero";

export default function LandingPage() {
  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 min-h-screen">
      <Hero />
      <div className="max-w-5xl mx-auto px-6 space-y-24 py-16">

        {/* ── Features ── */}
        <section className="pb-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Hur det fungerar</h2>
            <p className="text-slate-500 mt-2">Tre steg för att förbättra din portfölj</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            <FeatureCard
              step="1"
              title="Lägg in dina fonder"
              description="Sök på fondnamn eller ISIN och ange vikten för varje fond i din portfölj."
            />
            <FeatureCard
              step="2"
              title="Se dina nyckeltal"
              description="Få direkt en bild av din genomsnittliga avgift, avkastning och Sharpe-kvot."
            />
            <FeatureCard
              step="3"
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

function FeatureCard({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-sm">
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
        {step}
      </div>
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
