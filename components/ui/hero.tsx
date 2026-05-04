import Link from "next/link";
import DonutChart from "@/components/ui/DonutChart";

const PORTFOLIO_SLICES = [
  { label: "Global",   weight: 45 },
  { label: "Räntor",   weight: 30 },
  { label: "Sverige",  weight: 15 },
  { label: "Tillväxt", weight: 10 },
];

// ── Brush strokes ─────────────────────────────────────────────────────────────
// feTurbulence + feDisplacementMap ger oregelbundna "målade" kanter.
// overflow: visible krävs — SVG klipper annars bort cap-ändarna.

function BrushStrokes() {
  const s1 = "M -20 470 C  80 360 185 245 285 150 C 358  82 415  44 510  0";
  const s2 = "M  35 520 C 130 410 230 295 328 202 C 398 136 452  98 544 56";
  const s3 = "M -65 425 C  35 318 138 210 238 120 C 310  55 368  18 462 -22";
  const s4 = "M  80 560 C 172 448 268 338 362 248 C 430 183 482 146 572 106";

  return (
    <svg
      className="absolute pointer-events-none hidden lg:block"
      style={{ right: -50, top: -30, width: 580, height: 600, zIndex: 0, overflow: "visible" }}
      viewBox="0 0 580 600"
      fill="none"
      aria-hidden
    >
      <defs>
        {/* Pensel-textur: turbulens förskjuter pixlar och skapar ojämna kanter */}
        <filter id="b-rough" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045 0.018" numOctaves="4" seed="5" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="20" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="b-medium" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03 0.012" numOctaves="3" seed="11" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="b-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="b-soft" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.022" numOctaves="3" seed="17" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="2" />
        </filter>

        {/* Linjär fade i bägge ändar */}
        <linearGradient id="bfade" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="white" stopOpacity="0"   />
          <stop offset="14%"  stopColor="white" stopOpacity="1"   />
          <stop offset="86%"  stopColor="white" stopOpacity="1"   />
          <stop offset="100%" stopColor="white" stopOpacity="0"   />
        </linearGradient>
        <mask id="bm" maskUnits="userSpaceOnUse" x="-150" y="-150" width="880" height="900">
          <rect x="-150" y="-150" width="880" height="900" fill="url(#bfade)" />
        </mask>
      </defs>

      {/* Alla lager inuti mask-gruppen så faden appliceras på det slutliga resultatet */}
      <g mask="url(#bm)">
        {/* 1. Mjuk glow i botten — ger det luftiga blå glödet */}
        <path d={s2} stroke="#BFDBFE" strokeWidth="110" strokeLinecap="round" opacity="0.22" filter="url(#b-glow)" />

        {/* 2. Brett basslag med pensel-textur */}
        <path d={s1} stroke="#93C5FD" strokeWidth="62"  strokeLinecap="round" opacity="0.26" filter="url(#b-medium)" />

        {/* 3. Förskjutet parallellt drag */}
        <path d={s4} stroke="#A5B4FC" strokeWidth="44"  strokeLinecap="round" opacity="0.20" filter="url(#b-rough)"  />

        {/* 4. Smalt drag med stark textur — synliga penselborsttag */}
        <path d={s3} stroke="#60A5FA" strokeWidth="24"  strokeLinecap="round" opacity="0.28" filter="url(#b-rough)"  />

        {/* 5. Tunn ljus kant-highlight */}
        <path d={s1} stroke="#EFF6FF" strokeWidth="7"   strokeLinecap="round" opacity="0.70" filter="url(#b-soft)"   />
      </g>
    </svg>
  );
}

// ── Portfolio card ─────────────────────────────────────────────────────────────

function PortfolioCard() {
  return (
    <div
      className="relative bg-white/[0.32] backdrop-blur-md border border-white/60 p-7 w-full max-w-sm"
      style={{
        borderRadius: 24,
        zIndex: 1,
        boxShadow:
          "0 24px 60px rgba(0,0,0,0.10), 0 8px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.5)",
      }}
    >
      {/* Card header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
            Rekommenderad portfölj
          </p>
          <p className="text-base font-bold text-slate-900">Din personliga mix</p>
        </div>
        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-semibold shrink-0">
          Balanserad
        </span>
      </div>

      {/* Donut chart */}
      <DonutChart
        slices={PORTFOLIO_SLICES}
        centerLabel="70%"
        centerSub="Aktier"
        size={112}
        thickness={18}
        horizontal
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 pt-5 mt-5 border-t border-slate-100">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mb-1">
            Avgift
          </p>
          <p className="text-lg font-bold text-slate-900 leading-none">
            0.12<span className="text-sm font-normal text-slate-400">% / år</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mb-1">
            Risknivå
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i <= 3 ? "bg-blue-500" : "bg-slate-100"}`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1">Medel</p>
        </div>
      </div>

      <p className="text-[10px] text-slate-300 mt-4 text-center tracking-wide">
        Exempelportfölj · din anpassas efter dina svar
      </p>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative w-full px-4 sm:px-6 pt-8 pb-12 sm:pt-10 sm:pb-16 lg:pt-12 lg:pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">

          {/* ── Content column ─────────────────────────────────────────────────
              Mobil: centrerat.  Desktop (lg): vänsterjusterat.
          ──────────────────────────────────────────────────────────────────── */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 lg:space-y-9 w-full">

            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 border border-slate-200 bg-white px-4 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              Oberoende analys · För smartare sparande
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1
                className="text-[40px] sm:text-[52px] lg:text-[62px] leading-[1.06] tracking-[-0.02em] text-slate-900"
                style={{ fontFamily: "var(--font-dm-serif), Georgia, serif" }}
              >
                Bygg en smartare<br />
                fondportfölj på{" "}
                <span className="hero-accent">2 minuter</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-500 leading-relaxed max-w-[430px] mx-auto lg:mx-0">
                Få personliga fondförslag baserat på dina mål, risk och tusentals timmars analys — helt gratis.
              </p>
            </div>

            {/* Mobil: donut + legend (vänster) och knappar (höger) — dolt på desktop */}
            <div className="lg:hidden flex items-center gap-6 w-full">

              {/* Vänster: donut + legend under */}
              <div className="shrink-0 flex flex-col items-center gap-2.5">
                <DonutChart
                  slices={PORTFOLIO_SLICES}
                  centerLabel="70%"
                  centerSub="Aktier"
                  size={116}
                  thickness={17}
                  showLegend={false}
                />
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {PORTFOLIO_SLICES.map((s, i) => {
                    const colors = ["#3B82F6", "#F59E0B", "#10B981", "#8B5CF6"];
                    return (
                      <div key={s.label} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors[i] }} />
                        <span className="text-[10px] text-slate-500">{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Höger: knappar */}
              <div className="flex flex-col gap-3 flex-1 min-w-0">
                <Link
                  href="/bygg-portfolj"
                  className="inline-flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-3 rounded-xl text-sm transition-all duration-200 shadow-md shadow-blue-500/25 active:scale-[0.98]"
                >
                  Bygg portfölj
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link
                  href="/analyze"
                  className="inline-flex items-center justify-center bg-slate-900 hover:bg-slate-700 text-white font-semibold px-4 py-3 rounded-xl text-sm transition-all duration-200 active:scale-[0.98]"
                >
                  Analysera fonder →
                </Link>
              </div>

            </div>

            {/* Desktop: CTA-knappar (rad) — dolt på mobil */}
            <div className="hidden lg:flex flex-row gap-3">
              <Link
                href="/bygg-portfolj"
                className="inline-flex items-center justify-center gap-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-4 rounded-2xl text-sm transition-all duration-200 shadow-lg shadow-blue-500/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/30 active:translate-y-0"
              >
                Bygg din portfölj gratis
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="/analyze"
                className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold px-8 py-4 rounded-2xl text-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:translate-y-0"
              >
                Analysera mina fonder →
              </Link>
            </div>

            {/* Trust stats */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div>
                <p className="text-[15px] sm:text-[17px] font-bold text-slate-900 leading-tight">1 500+</p>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">fonder analyserade</p>
              </div>
              <div className="w-px h-7 sm:h-9 bg-slate-200" />
              <div>
                <p className="text-[15px] sm:text-[17px] font-bold text-slate-900 leading-tight">Gratis</p>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">ingen registrering</p>
              </div>
              <div className="w-px h-7 sm:h-9 bg-slate-200" />
              <div>
                <p className="text-[15px] sm:text-[17px] font-bold text-slate-900 leading-tight">&lt; 2 min</p>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">att komma igång</p>
              </div>
            </div>
          </div>

          {/* ── Right column — dolt på mobil, synligt på desktop ───────────────
              'relative' gör denna kolumn till containing block för BrushStrokes.
          ──────────────────────────────────────────────────────────────────── */}
          <div className="hidden lg:relative lg:flex lg:justify-end">
            <BrushStrokes />
            <PortfolioCard />
          </div>

        </div>
      </div>
    </section>
  );
}
