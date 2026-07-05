"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "Är detta finansiell rådgivning?",
    a: "Nej. Sharpa är ett automatiserat analysverktyg som sammanställer historiska nyckeltal och jämför fonder utifrån generella kriterier. Vi står inte under Finansinspektionens tillsyn och har inget tillstånd att bedriva investeringsrådgivning. Analyserna tar inte hänsyn till din personliga situation och utgör inte rekommendationer — alla investeringsbeslut fattar du själv och på egen risk. Rådgör med en auktoriserad finansiell rådgivare innan du fattar investeringsbeslut.",
  },
  {
    q: "Är Sharpa gratis?",
    a: "Ja, helt gratis. Ingen avgift, inget kreditkort och inga provisioner från fondbolag.",
  },
  {
    q: "Hur skapas analyserna och bytesförslagen?",
    a: "Automatiskt. Varje fond jämförs med andra fonder i samma kategori utifrån riskjusterad avkastning (Sharpe-kvot), historisk avkastning och avgift. En fond lyfts fram som alternativ när den har bättre nyckeltal än din nuvarande fond i samma kategori.",
  },
  {
    q: "Hur aktuell är fonddatan?",
    a: "Fonddata hämtas från externa datakällor och uppdateras regelbundet, men inte i realtid. Kontrollera alltid aktuella uppgifter hos fondbolaget eller din depåplattform innan du fattar beslut.",
  },
  {
    q: "Behöver jag ett konto?",
    a: "Nej. Du kan analysera och bygga portföljer utan konto. Ett konto behövs bara om du vill spara dina portföljer och din riskprofil.",
  },
  {
    q: "Vilka uppgifter sparar ni om mig?",
    a: "Om du skapar ett konto sparar vi din e-postadress samt de portföljer och den riskprofil du väljer att spara. Du kan när som helst radera ditt konto och all data under Mitt konto. Läs mer i vår integritetspolicy.",
  },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left group"
      >
        <span className="text-sm sm:text-base font-medium text-slate-800 group-hover:text-slate-900 transition-colors">
          {q}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="pb-5 pr-8">
          <p className="text-sm text-slate-500 leading-[1.75]">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14 sm:py-20">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-accent uppercase tracking-[0.08em] mb-3">
            Vanliga frågor
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-ink leading-[1.1] mb-4">
            FAQ
          </h1>
          <p className="text-base text-ink-2 leading-[1.7] max-w-xl">
            Svar på de vanligaste frågorna om vad Sharpa är — och inte är.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-line px-6" style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04)" }}>
          {FAQS.map(item => (
            <AccordionItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>

      </div>
    </div>
  );
}
