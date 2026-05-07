"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const SECTIONS = [
  {
    heading: "Om analysen",
    items: [
      {
        q: "Vad är en portföljanalys?",
        a: "En portföljanalys är en genomgång av dina fondinvesteringar där vi beräknar nyckeltal som genomsnittlig avgift, historisk avkastning och riskjusterad avkastning. Syftet är att ge dig en tydlig bild av hur din portfölj presterar och om det finns möjligheter att förbättra den.",
      },
      {
        q: "Hur aktuella är fonddata?",
        a: "Fonddata hämtas löpande från Avanza och Nordnet. Nyckeltal som avkastning och avgifter uppdateras regelbundet och speglar i normalfallet data från de senaste veckorna. Exakt tidsstämpel visas inte, men data är aldrig äldre än 30 dagar.",
      },
      {
        q: "Vilka plattformar stöds?",
        a: "Analysen fungerar för fonder hos Avanza, Nordnet samt en öppen sökning som täcker båda plattformarna. Valet av plattform påverkar vilka fonder som ingår i jämförelseunderlaget vid bytesförslag.",
      },
    ],
  },
  {
    heading: "Nyckeltal förklarade",
    items: [
      {
        q: "Vad är snittavgiften?",
        a: "Snittavgiften (TKA/TER) är den totala årliga kostnaden för en fond uttryckt i procent av kapitalet. I portföljanalysen viktas varje fonds avgift efter dess andel av portföljen, vilket ger en rättvisande bild av vad du faktiskt betalar per år.",
      },
      {
        q: "Vad är Sharpe-kvoten?",
        a: "Sharpe-kvoten mäter hur mycket avkastning du får per enhet risk. En högre Sharpe-kvot innebär att fonden levererat bättre riskjusterad avkastning. En kvot över 1 anses generellt god. Kvoten beräknas på 3 års data och viktas efter din portföljfördelning.",
      },
      {
        q: "Vad är skillnaden mellan avkastning 1 år och 3 år?",
        a: "Avkastning 1 år visar hur portföljen presterat de senaste 12 månaderna — känslig för kortsiktiga marknadsrörelser. Avkastning 3 år är annualiserad, det vill säga omräknad till ett genomsnittligt årstal över tre år, vilket ger en jämnare och mer representativ bild av portföljens historiska trend.",
      },
      {
        q: "Vad är koncentrationsrisk?",
        a: "Koncentrationsrisk uppstår när en för stor del av portföljen är exponerad mot samma typ av fond eller marknad. Om exempelvis 60% av portföljens fonder alla tillhör kategorin 'global storbolag' är risken att de rör sig i samma riktning vid en nedgång, vilket minskar diversifieringens skyddseffekt.",
      },
      {
        q: "Vad är skillnaden mellan aktiv och passiv förvaltning?",
        a: "En aktivt förvaltad fond har en förvaltare som väljer vilka värdepapper att investera i, med målet att slå ett jämförelseindex. Det leder ofta till högre avgifter. En passiv fond (indexfond) följer automatiskt ett marknadsindex och har vanligtvis betydligt lägre avgifter. Forskning visar att majoriteten av aktiva fonder inte slår sitt index efter avgifter på lång sikt.",
      },
    ],
  },
  {
    heading: "Bytesförslag och optimering",
    items: [
      {
        q: "Hur fungerar optimeringsförslagen?",
        a: "Systemet jämför varje fond i din portfölj med andra fonder i exakt samma kategori och med liknande geografisk inriktning. En fond föreslås som byte om den har ett bättre samlat betyg baserat på riskjusterad avkastning (Sharpe), historisk avkastning och avgift. Vi föreslår aldrig byte till en fond av en annan typ eller med annan marknadsinriktning.",
      },
      {
        q: "Vad betyder 'bäst i sin kategori'?",
        a: "Om din fond redan har den bästa kombinationen av nyckeltal bland alla jämförbara fonder på plattformen, klassas den som 'bäst i sin kategori'. Det innebär att systemet inte hittar ett bättre alternativ och att fonden är ett välgrundat val.",
      },
      {
        q: "Vad betyder 'konsolidera'?",
        a: "Om en fond i din portfölj är sämre än en annan fond du redan äger i samma kategori, föreslår systemet att du säljer den sämre och ökar din position i den bättre — istället för att byta till en helt ny fond. Det förenklar portföljen och minskar antalet innehav.",
      },
    ],
  },
  {
    heading: "Avgiftsräknaren och tidssimulator",
    items: [
      {
        q: "Hur beräknas avgiftsräknaren?",
        a: "Avgiftsräknaren multiplicerar ditt portföljvärde med portföljens viktade snittavgift för att visa vad du betalar i kronor per år. Förväntad avkastning beräknas på samma sätt med 3-årsavkastningen som bas. Observera att fondavkastning redan är redovisad netto efter avgifter, varför avgiften visas separat som ett transparensverktyg.",
      },
      {
        q: "Hur pålitlig är tidssimulatorn?",
        a: "Tidssimulatorn använder portföljens historiska 3-årsavkastning och projicerar den framåt med ränta-på-ränta-effekt. Det är ett pedagogiskt verktyg för att illustrera sammansatt avkastning — inte en prognos. Historisk avkastning är ingen garanti för framtida resultat, och verklig avkastning kan avvika väsentligt.",
      },
    ],
  },
  {
    heading: "Fondguide och scenarioanalys",
    items: [
      {
        q: "Vad är Fondguiden?",
        a: "Fondguiden är ett jämförelseverktyg där du kan ställa upp valfria fonder sida vid sida och se deras nyckeltal i en tydlig tabell. Den bästa och sämsta fonden i varje kolumn markeras automatiskt, vilket gör det enkelt att identifiera styrkor och svagheter.",
      },
      {
        q: "Vad är scenarioanalysen?",
        a: "Scenarioanalysen låter dig experimentera med portföljens sammansättning. Du kan ändra vikter, lägga till eller ta bort fonder och sedan köra en ny fullständig analys. Resultatet jämförs mot den ursprungliga portföljens nyckeltal i en tabell med tydliga skillnader.",
      },
    ],
  },
  {
    heading: "Dela och exportera",
    items: [
      {
        q: "Hur delar jag rapporten med en kund?",
        a: "Klicka på 'Dela länk' i rapporthuvudet. Länken som kopieras innehåller parametern kund=1, vilket innebär att mottagaren ser en förenklad, skrivskyddad version av rapporten utan interaktiva verktyg som Fondguiden och Scenarioanalysen.",
      },
      {
        q: "Hur laddar jag ner rapporten som PDF?",
        a: "Klicka på 'PDF'-knappen i rapporthuvudet. En ny flik öppnas med en utskriftsoptimerad version av rapporten. Klicka på 'Ladda ner / Skriv ut' i den fliken, välj 'Spara som PDF' i utskriftsdialogens destinationsmeny. Det ger ett dokument med korrekt sidbrytning och typografi.",
      },
      {
        q: "Sparas rapporten automatiskt?",
        a: "Nej — rapporten är avsiktligt efemär. Den genereras i realtid från URL-parametrarna och sparas inte på servern. Det innebär inga GDPR-bekymmer kring kunddata, men det betyder också att du behöver generera en ny länk om portföljinnehållet förändras.",
      },
    ],
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
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">

        {/* Header */}
        <div className="mb-14">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Vanliga frågor
          </p>
          <h1
            className="text-4xl sm:text-5xl text-slate-900 leading-[1.1] mb-4"
            style={{ fontFamily: "var(--font-dm-serif)" }}
          >
            FAQ
          </h1>
          <p className="text-base text-slate-500 leading-relaxed max-w-xl">
            Svar på de vanligaste frågorna om portföljanalysen, nyckeltalen och hur verktyget fungerar.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {SECTIONS.map(section => (
            <div key={section.heading}>
              <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 pb-3 border-b border-slate-100">
                {section.heading}
              </h2>
              <div>
                {section.items.map(item => (
                  <AccordionItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-16 pt-8 border-t border-slate-100">
          <p className="text-xs text-slate-400 leading-relaxed">
            Hittar du inte svaret på din fråga? Kontakta oss så hjälper vi dig.
          </p>
        </div>
      </div>
    </div>
  );
}
