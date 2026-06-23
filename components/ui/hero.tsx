import Link from "next/link";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import DonutChart from "@/components/ui/DonutChart";

const getAnalyzedPortfolioCount = unstable_cache(
  async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return 0;
    const supabase = createClient(url, key);
    const { count } = await supabase
      .from("portfolios")
      .select("*", { count: "exact", head: true });
    return count ?? 0;
  },
  ["platform-portfolio-count"],
  { revalidate: 3600 }
);

function formatPortfolioCount(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 100) * 100}+`;
  if (n >= 100) return `${Math.floor(n / 10) * 10}+`;
  if (n >= 10) return `${Math.floor(n / 5) * 5}+`;
  return String(n);
}

// ── Before/After swap card ─────────────────────────────────────────────────────

const SWAP_EXAMPLES = [
  {
    from: { name: "SEB Sverige Index", cost: "0,40%" },
    to:   { name: "Avanza Zero",       cost: "0,00%" },
    save: "0,40% / år",
  },
  {
    from: { name: "Swedbank Robur Global", cost: "1,50%" },
    to:   { name: "SPP Aktiefond Global",  cost: "0,20%" },
    save: "1,30% / år",
  },
];

const PORTFOLIO_SLICES = [
  { label: "Global",  weight: 55 },
  { label: "Sverige", weight: 45 },
];

function BeforeAfterCard() {
  return (
    <div
      className="relative bg-white/[0.32] backdrop-blur-md border border-white/60 p-6 w-full max-w-md"
      style={{
        borderRadius: 24,
        zIndex: 1,
        boxShadow:
          "0 24px 60px rgba(0,0,0,0.10), 0 8px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.5)",
      }}
    >
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4">
        Exempel på byten vi hittar
      </p>

      <div className="flex gap-4 items-center">
        {/* Swap list — vänster */}
        <div className="flex-1 min-w-0 space-y-3">
          {SWAP_EXAMPLES.map((ex, i) => (
            <div key={i} className="bg-white rounded-xl px-4 py-3 space-y-2.5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500 truncate">{ex.from.name}</p>
                <span className="text-xs font-semibold text-red-500 shrink-0">{ex.from.cost}</span>
              </div>
              <div className="flex items-center justify-center my-1">
                <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-800 truncate">{ex.to.name}</p>
                <span className="text-xs font-semibold text-green-600 shrink-0">{ex.to.cost}</span>
              </div>
              <div className="flex justify-end">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                  Sparar {ex.save}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Donut — höger, centrerad */}
        <div className="shrink-0 flex flex-col items-center gap-1.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Fördelning</p>
          <DonutChart
            slices={PORTFOLIO_SLICES}
            size={96}
            thickness={14}
            showLegend
            disableHover
          />
        </div>
      </div>

      <p className="text-[10px] text-slate-300 mt-4 text-center tracking-wide">
        Exempelbyten · dina fonder analyseras individuellt
      </p>
    </div>
  );
}

// ── Brush strokes ─────────────────────────────────────────────────────────────
// feTurbulence + feDisplacementMap ger oregelbundna "målade" kanter.
// overflow: visible krävs — SVG klipper annars bort cap-ändarna.

function BrushStrokes() {
  const s1 = "M -20 360 C  80 275 185 185 285 110 C 358  55 415  20 510  0";
  const s2 = "M  35 400 C 130 315 230 225 328 155 C 398  98 452  65 544 42";
  const s3 = "M -65 318 C  35 234 138 148 238  78 C 310  22 368  -8 462 -28";
  const s4 = "M  80 432 C 172 348 268 262 362 194 C 430 140 482 110 572 88";

  return (
    <svg
      className="absolute pointer-events-none hidden lg:block"
      style={{ right: -50, top: -30, width: 580, height: 490, zIndex: 0, overflow: "visible" }}
      viewBox="0 0 580 490"
      fill="none"
      aria-hidden
    >
      <defs>
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

      <g mask="url(#bm)">
        <path d={s2} stroke="#BFDBFE" strokeWidth="110" strokeLinecap="round" opacity="0.22" filter="url(#b-glow)" />
        <path d={s1} stroke="#93C5FD" strokeWidth="62"  strokeLinecap="round" opacity="0.26" filter="url(#b-medium)" />
        <path d={s4} stroke="#A5B4FC" strokeWidth="44"  strokeLinecap="round" opacity="0.20" filter="url(#b-rough)"  />
        <path d={s3} stroke="#60A5FA" strokeWidth="24"  strokeLinecap="round" opacity="0.28" filter="url(#b-rough)"  />
        <path d={s1} stroke="#EFF6FF" strokeWidth="7"   strokeLinecap="round" opacity="0.70" filter="url(#b-soft)"   />
      </g>
    </svg>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────────────

export default async function Hero() {
  const rawCount = await getAnalyzedPortfolioCount();
  const portfolioCount = formatPortfolioCount(rawCount);

  return (
    <section className="relative w-full px-4 sm:px-6 pt-12 pb-16 sm:pt-24 sm:pb-28 lg:pt-24 lg:pb-32">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">

          {/* ── Content column ─────────────────────────────────────────────────
              Mobil: centrerat.  Desktop (lg): vänsterjusterat.
          ──────────────────────────────────────────────────────────────────── */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left w-full gap-8 lg:gap-10">

            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 border border-slate-200 bg-white px-4 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              Oberoende · Ingen provision · Inga dolda kostnader
            </div>

            {/* Headline */}
            <div className="space-y-7">
              <h1
                className="text-[42px] sm:text-[54px] lg:text-[64px] leading-[1.05] tracking-[-0.02em] text-slate-900"
                style={{ fontFamily: "var(--font-dm-serif), Georgia, serif" }}
              >
                Betalar du<br />
                <span className="hero-accent">för mycket</span>{" "}
                för dina fonder?
              </h1>
              <p className="text-base sm:text-lg text-slate-500 leading-loose max-w-[430px] mx-auto lg:mx-0">
                Lägg in dina fonder och se på 2 minuter vad de kostar dig — och vilka byten som sänker avgiften. Gratis och oberoende.
              </p>
            </div>

            {/* Mobil: before/after-kort + knappar */}
            <div className="lg:hidden flex flex-col items-center gap-6 w-full mt-6">

              {/* Exempelkort mobil */}
              <div
                className="w-full max-w-sm bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4"
                style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(255,255,255,0.6)" }}
              >
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Exempel på byten vi hittar</p>
                {SWAP_EXAMPLES.slice(0, 2).map((ex, i) => (
                  <div key={i} className="py-3 border-b border-slate-50 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500 truncate min-w-0">{ex.from.name}</p>
                      <span className="text-[10px] font-semibold text-red-500 shrink-0">{ex.from.cost}</span>
                    </div>
                    <div className="flex items-center justify-center my-2">
                      <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800 truncate min-w-0">{ex.to.name}</p>
                      <span className="text-[10px] font-semibold text-green-600 shrink-0">{ex.to.cost}</span>
                    </div>
                    <div className="flex justify-end mt-1.5">
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                        Sparar {ex.save}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Knappar mobil */}
              <div className="flex flex-col gap-3 w-full max-w-sm">
                <Link
                  href="/bygg-portfolj"
                  className="inline-flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-3.5 rounded-xl text-sm transition-all duration-200 shadow-md shadow-blue-500/25 active:scale-[0.98]"
                >
                  Äger du inga fonder? Bygg en portfölj
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link
                  href="/analyze"
                  className="inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-3.5 rounded-xl text-sm transition-all duration-200 shadow-md shadow-slate-900/20 active:scale-[0.98]"
                >
                  Analysera mina fonder
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>

            </div>

            {/* Desktop: CTA-knappar */}
            <div className="hidden lg:flex flex-col gap-3 items-start">
              <Link
                href="/bygg-portfolj"
                className="inline-flex items-center justify-center gap-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-4 rounded-2xl text-sm transition-all duration-200 shadow-lg shadow-blue-500/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/30 active:translate-y-0"
              >
                Äger du inga fonder? Bygg en portfölj
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="/analyze"
                className="inline-flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-8 py-4 rounded-2xl text-sm transition-all duration-200 shadow-lg shadow-slate-900/20 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/25 active:translate-y-0"
              >
                Analysera mina fonder — det är gratis
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>

            {/* Social proof — portföljer med fondbytesförslag */}
            {rawCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Redan{" "}
                  <span className="font-semibold text-slate-700">{portfolioCount}</span>{" "}
                  portföljer har fått förbättrade fondbytesförslag
                </span>
              </div>
            )}

            {/* Trust stats */}
            <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
              <div>
                <p className="text-[14px] sm:text-[17px] font-bold text-slate-900 leading-tight">1 500+</p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">fonder</p>
              </div>
              <div className="w-px h-6 sm:h-9 bg-slate-200" />
              <div>
                <p className="text-[14px] sm:text-[17px] font-bold text-slate-900 leading-tight">Gratis</p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">ingen provision</p>
              </div>
              <div className="w-px h-6 sm:h-9 bg-slate-200" />
              <div>
                <p className="text-[14px] sm:text-[17px] font-bold text-slate-900 leading-tight">&lt; 2 min</p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">att komma igång</p>
              </div>
            </div>
          </div>

          {/* ── Right column — dolt på mobil, synligt på desktop ───────────────
              'relative' gör denna kolumn till containing block för BrushStrokes.
          ──────────────────────────────────────────────────────────────────── */}
          <div className="hidden lg:relative lg:flex lg:justify-end">
            <BrushStrokes />
            <BeforeAfterCard />
          </div>

        </div>
      </div>
    </section>
  );
}
