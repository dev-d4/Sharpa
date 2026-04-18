"use client";

import Hero from "@/components/ui/hero";
import HowItWorks from "@/components/ui/HowItWorks";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen">
      <Hero />
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 space-y-20 sm:space-y-32 py-10 sm:py-16">

        <HowItWorks />


      </div>
    </div>
  );
}
