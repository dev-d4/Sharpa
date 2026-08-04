import Hero from "@/components/ui/hero";
import HowItWorks from "@/components/ui/HowItWorks";
import { buttonClass } from "@/components/ui/button";

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

        {/* För företag */}
        <section className="border-t border-line bg-[#EEF0F2]">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8">
              <div className="max-w-[680px]">
                <p className="label-meta mb-2">För företag och rådgivare</p>
                <h2 className="font-display text-[22px] leading-tight text-ink sm:text-[26px]">
                  Sharpa för professionell rådgivning
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-2 sm:text-[15px]">
                  Jämför fonder och portföljer och skapa transparenta underlag för kundmötet.
                </p>
              </div>
              <a
                href="mailto:sharpakontakt@gmail.com?subject=Professionella%20verktyg%20%E2%80%94%20intresseanm%C3%A4lan"
                className={buttonClass("secondary", "w-fit")}
              >
                Kontakta oss
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
