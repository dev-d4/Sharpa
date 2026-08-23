"use client";

import { buttonClass } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

export default function ProfessionalSection() {
  const { isEnglish } = useLanguage();
  return (
    <section className="border-t border-line bg-[#EEF0F2]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8">
          <div className="max-w-[680px]">
            <p className="label-meta mb-2">{isEnglish ? "For businesses and advisers" : "För företag och rådgivare"}</p>
            <h2 className="font-display text-[22px] leading-tight text-ink sm:text-[26px]">
              {isEnglish ? "Sharpa for professional advice" : "Sharpa för professionell rådgivning"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2 sm:text-[15px]">
              {isEnglish ? "Compare funds and portfolios and create transparent material for client meetings." : "Jämför fonder och portföljer och skapa transparenta underlag för kundmötet."}
            </p>
          </div>
          <a href={`mailto:sharpakontakt@gmail.com?subject=${encodeURIComponent(isEnglish ? "Professional tools — enquiry" : "Professionella verktyg — intresseanmälan")}`} className={buttonClass("secondary", "w-fit")}>
            {isEnglish ? "Contact us" : "Kontakta oss"}
          </a>
        </div>
      </div>
    </section>
  );
}
