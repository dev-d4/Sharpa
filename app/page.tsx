import Hero from "@/components/ui/hero";
import HowItWorks from "@/components/ui/HowItWorks";
import ProfessionalSection from "./ProfessionalSection";

export default function LandingPage() {
  return (
    <>
      <div className="relative">
        <div className="bg-canvas">
          <Hero />
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <HowItWorks />
          </div>
        </div>

        <ProfessionalSection />
      </div>
    </>
  );
}
