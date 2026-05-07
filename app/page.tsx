import Link from "next/link";
import Hero from "@/components/ui/hero";
import HowItWorks from "@/components/ui/HowItWorks";
import StickyLandingBar from "@/components/ui/StickyLandingBar";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen">
      <Hero />
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-0 pb-10 sm:pb-16">
        <HowItWorks />
      </div>

      {/* B2B teaser — synlig för rådgivare som scrollar, osynlig för konsumenter */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <Link
          href="/integration"
          className="group flex items-center justify-between gap-6 bg-slate-900 hover:bg-slate-800 rounded-2xl px-6 sm:px-8 py-5 transition-colors"
        >
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
              För rådgivningsföretag
            </p>
            <p className="text-sm sm:text-base font-semibold text-white leading-snug">
              Integrera portföljanalysen direkt i er rådgivningsplattform
            </p>
          </div>
          <svg
            className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      <StickyLandingBar />
    </div>
  );
}
