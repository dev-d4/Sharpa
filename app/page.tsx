import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="space-y-24">
      {/* ── Hero ── */}
      <section className="pt-12 pb-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Baserat på data från Avanza
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
              Optimera din<br />fondportfölj
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed max-w-md">
              Analysera dina fonder kostnadsfritt. Få nyckeltal om avgifter, avkastning och risk — och personliga fondbytesförslag om du kan göra bättre val.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/analyze"
                className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md shadow-blue-200 hover:shadow-blue-300"
              >
                Analysera din portfölj →
              </Link>
              <span className="text-sm text-slate-400">Gratis · Ingen registrering krävs</span>
            </div>
          </div>

          {/* Screenshot placeholder */}
          <div className="bg-slate-100 rounded-2xl aspect-[4/3] flex items-center justify-center border border-slate-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-slate-200 mx-auto flex items-center justify-center">
                <Image src="/logo.svg" alt="Fondanalys" width={28} height={28} />
              </div>
              <p className="text-sm text-slate-400 font-medium">Skärmbild kommer snart</p>
            </div>
          </div>
        </div>
      </section>

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
