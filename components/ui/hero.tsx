import Link from "next/link";
import DonutChart from "@/components/ui/DonutChart";

const PORTFOLIO_SLICES = [
  { label: "Global",   weight: 45 },
  { label: "Räntor",   weight: 30 },
  { label: "Sverige",  weight: 15 },
  { label: "Tillväxt", weight: 10 },
];

// ── Brush strokes ─────────────────────────────────────────────────────────────
// Tre överlappande diagonala penseldrag med linjära fade-masker i ändarna.
// overflow: visible krävs — SVG klipper annars bort rundade cap-ändar.

function BrushStrokes() {
  // Tre diagonala drag, lätt förskjutna mot varandra
  const s1 = "M -30 480 C 60 380 160 260 260 160 C 330 95  390 55  490 10";
  const s2 = "M  20 520 C 110 415 200 295 295 200 C 360 138 415 100 510 58";
  const s3 = "M -60 440 C  30 345 130 235 225 145 C 295  82 360  42 460  0";

  return (
    <svg
      className="absolute pointer-events-none hidden lg:block"
      style={{ right: -40, top: -20, width: 540, height: 560, zIndex: 0, overflow: "visible" }}
      viewBox="0 0 540 560"
      fill="none"
      aria-hidden
    >
      <defs>
        {/* Gemensam linjär mask som tonar bort i båda ändarna */}
        <linearGradient id="brushFade" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="white" stopOpacity="0" />
          <stop offset="15%"  stopColor="white" stopOpacity="1" />
          <stop offset="85%"  stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="bm1" maskUnits="userSpaceOnUse" x="-100" y="-100" width="740" height="760">
          <rect x="-100" y="-100" width="740" height="760" fill="url(#brushFade)" />
        </mask>

        {/* Mjuk oskärpa för ett mer målat utseende */}
        <filter id="soft">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="softer">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      {/* Bakre, bred skugga — ger djup */}
      <path d={s2} stroke="#93C5FD" strokeWidth="90"  strokeLinecap="round" opacity="0.18" mask="url(#bm1)" filter="url(#softer)" />

      {/* Mellanskikt — huvuddraget */}
      <path d={s1} stroke="#3B82F6" strokeWidth="56"  strokeLinecap="round" opacity="0.22" mask="url(#bm1)" filter="url(#soft)" />

      {/* Övre tunt drag — ger "borste"-känsla */}
      <path d={s3} stroke="#2563EB" strokeWidth="22"  strokeLinecap="round" opacity="0.30" mask="url(#bm1)" />

      {/* Ljus högdager längs kanten av huvuddraget */}
      <path d={s1} stroke="#BFDBFE" strokeWidth="8"   strokeLinecap="round" opacity="0.50" mask="url(#bm1)" />
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
