import Hero from "@/components/ui/hero";
import HowItWorks from "@/components/ui/HowItWorks";
import StickyLandingBar from "@/components/ui/StickyLandingBar";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen">
      <Hero />
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <HowItWorks />
      </div>
      <StickyLandingBar />
    </div>
  );
}
