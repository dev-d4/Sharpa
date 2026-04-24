import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative w-full min-h-[70vh] sm:min-h-[90vh] flex flex-col items-center justify-center px-6 py-12 sm:py-24">
      <div className="relative z-10 text-center max-w-2xl space-y-6">

        <div className="animate-fade-in-down inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-4 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          AI-driven fondanalys &amp; portföljoptimering
        </div>

        <h1 className="animate-fade-in-up text-3xl sm:text-4xl md:text-6xl font-bold leading-tight tracking-tight text-slate-900 [animation-delay:100ms]">
          Optimera din{" "}
          <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-indigo-400 bg-clip-text text-transparent">
            fondportfölj
          </span>
        </h1>

        <p className="animate-fade-in-up text-lg text-slate-500 leading-relaxed max-w-md mx-auto [animation-delay:200ms]">
          Svara på 6 frågor och få en komplett fondportfölj anpassad till din risknivå, dina mål och din horisont.
        </p>

        <div className="animate-fade-in-up flex items-center justify-center gap-3 flex-wrap [animation-delay:350ms]">
          <Link
            href="/bygg-portfolj"
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-200 text-sm"
          >
            Bygg din portfölj gratis →
          </Link>
          <Link
            href="/analyze"
            className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-7 py-3.5 rounded-xl transition-all text-sm shadow-sm"
          >
            Analysera befintlig portfölj
          </Link>
        </div>
        <p className="animate-fade-in-up text-xs text-slate-400 [animation-delay:450ms]">Gratis · Ingen registrering krävs</p>

        <div className="animate-fade-in-up flex items-center justify-center gap-4 sm:gap-8 pt-4 [animation-delay:500ms]">
          {[
            { value: "1 500+", label: "Fonder analyserade" },
            { value: "Gratis", label: "Alltid kostnadsfritt" },
            { value: "< 1 min", label: "Tid för analys" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-lg font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
