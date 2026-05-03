import Link from "next/link";
import DonutChart from "@/components/ui/DonutChart";

const PORTFOLIO_SLICES = [
  { label: "Global",   weight: 45 },
  { label: "Räntor",   weight: 30 },
  { label: "Sverige",  weight: 15 },
  { label: "Tillväxt", weight: 10 },
];

// ── Brush stroke ──────────────────────────────────────────────────────────────
// overflow: visible is critical — SVG default is hidden, which clips the
// round stroke caps that extend beyond the viewBox edges.

function BrushStrokes() {
  const d =
    "M 15 400 C 60 355 110 255 175 195 C 220 150 245 215 270 248 C 295 278 320 242 370 172 C 408 118 436 82 450 65";

  return (
    <svg
      className="absolute pointer-events-none hidden lg:block"
      style={{
        right: -20,
        top: -30,
        width: 460,
        height: 510,
        zIndex: 0,
        overflow: "visible",
      }}
      viewBox="0 0 460 510"
      fill="none"
      aria-hidden
    >
      <defs>
        {/* Centred at the actual cap tip (path endpoint + half-strokeWidth along tangent) */}
        <radialGradient id="rStart" cx="-42" cy="457" r="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="black" stopOpacity="1" />
          <stop offset="100%" stopColor="black" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rEnd" cx="501" cy="3" r="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="black" stopOpacity="1" />
          <stop offset="100%" stopColor="black" stopOpacity="0" />
        </radialGradient>
        <mask id="endFade" maskUnits="userSpaceOnUse" x="-200" y="-200" width="860" height="860">
          <rect x="-200" y="-200" width="860" height="860" fill="white" />
          <circle cx="-42" cy="457" r="105" fill="url(#rStart)" />
          <circle cx="501" cy="3"   r="105" fill="url(#rEnd)" />
        </mask>
      </defs>

      <path
        d={d}
        stroke="#2F6BFF"
        strokeWidth="72"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.28"
        mask="url(#endFade)"
      />
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
    <section className="relative w-full flex items-center pt-8 pb-14 sm:pt-10 sm:pb-16 lg:pt-12 lg:pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">

        {/* ── Left column ── */}
        <div className="space-y-9">

          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 border border-slate-200 bg-white px-4 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            Oberoende analys · För smartare sparande
          </div>

          {/* Headline */}
          <div className="space-y-5">
            <h1
              className="text-[44px] sm:text-[54px] lg:text-[62px] leading-[1.06] tracking-[-0.02em] text-slate-900"
              style={{ fontFamily: "var(--font-dm-serif), Georgia, serif" }}
            >
              Bygg en smartare<br />
              fondportfölj på{" "}
              <span className="hero-accent">2 minuter</span>
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed max-w-[430px]">
              Få personliga fondförslag baserat på dina mål, risk och tusentals timmars analys — helt gratis.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
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
          <div className="flex items-center gap-6 pt-1">
            <div>
              <p className="text-[17px] font-bold text-slate-900 leading-tight">1 500+</p>
              <p className="text-xs text-slate-400 mt-0.5">fonder analyserade</p>
            </div>
            <div className="w-px h-9 bg-slate-200" />
            <div>
              <p className="text-[17px] font-bold text-slate-900 leading-tight">Gratis</p>
              <p className="text-xs text-slate-400 mt-0.5">ingen registrering</p>
            </div>
            <div className="w-px h-9 bg-slate-200" />
            <div>
              <p className="text-[17px] font-bold text-slate-900 leading-tight">&lt; 2 min</p>
              <p className="text-xs text-slate-400 mt-0.5">att komma igång</p>
            </div>
          </div>
        </div>

        {/* ── Right column ──────────────────────────────────────────────────────
            'relative' here makes this the containing block for BrushStrokes.
            The SVG is anchored from the right edge of this column so it tracks
            the card position at every viewport width without any clipping math.
        ──────────────────────────────────────────────────────────────────────── */}
        <div className="relative flex justify-center lg:justify-end">

          <BrushStrokes />

          <PortfolioCard />
        </div>

      </div>
    </section>
  );
}
