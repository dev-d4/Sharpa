import { AccordionItem } from "@/components/ui/Accordion";

export const metadata = {
  title: "FAQ",
  description: "Svar på de vanligaste frågorna om vad Sharpa är — och inte är.",
};

const FAQS = [
  {
    q: "Är detta finansiell rådgivning?",
    a: "Nej. Sharpa är ett automatiserat analysverktyg som sammanställer historiska nyckeltal och jämför fonder utifrån generella kriterier. Vi står inte under Finansinspektionens tillsyn och har inget tillstånd att bedriva investeringsrådgivning. Analyser och portföljexempel utgör inte personliga rekommendationer — alla investeringsbeslut fattar du själv och på egen risk. Rådgör med en auktoriserad finansiell rådgivare innan du fattar investeringsbeslut.",
  },
  {
    q: "Är Sharpa gratis?",
    a: "Ja, helt gratis. Ingen avgift, inget kreditkort och inga provisioner från fondbolag.",
  },
  {
    q: "Hur skapas analyserna och bytesförslagen?",
    a: "Automatiskt. Varje fond jämförs med andra fonder i samma kategori utifrån riskjusterad avkastning (Sharpe-kvot), historisk avkastning och avgift. En fond visas som jämförbart alternativ när den har starkare nyckeltal än den analyserade fonden i samma kategori.",
  },
  {
    q: "Vad innebär portföljbevakningen?",
    a: "Alla dina sparade portföljer granskas när fondinformationen har uppdaterats, normalt en gång i veckan. Väljer du att slå på e-post får du ett samlat förändringsmejl om minst en portfölj har sjunkit 0,5 poäng eller mer. Om ingen når gränsen får du i stället ett kort kontrollbesked med aktuellt betyg för de granskade portföljerna. Mejlen innehåller inga uppmaningar att köpa, sälja eller byta. Bevakningsmejl är avstängda tills du aktivt slår på dem och kan stängas av när som helst under Mitt konto.",
  },
  {
    q: "Hur aktuell är fonddatan?",
    a: "Fonddata hämtas från externa datakällor och uppdateras regelbundet, men inte i realtid. Kontrollera alltid aktuella uppgifter hos fondbolaget eller din depåplattform innan du fattar beslut.",
  },
  {
    q: "Behöver jag ett konto?",
    a: "Nej. Du kan analysera och bygga portföljer utan konto. Ett konto behövs bara om du vill spara dina portföljer.",
  },
  {
    q: "Vilka uppgifter sparar ni om mig?",
    a: "Om du skapar ett konto sparar vi din e-postadress samt de portföljer du väljer att spara. Du kan när som helst radera ditt konto och all data under Mitt konto. Läs mer i vår integritetspolicy.",
  },
];

/**
 * Redaktionellt upplägg: ingen kortyta. Kicker, serifrubrik och ingress i en
 * läskolumn, därefter frågorna som hårlinjeavdelade rader direkt på papperet.
 */
export default function FAQPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[760px] px-4 py-16 sm:px-6 sm:py-24">
        <p className="label-meta mb-4">Vanliga frågor</p>
        <h1 className="font-display text-[38px] leading-[1.05] text-ink sm:text-[48px]">FAQ</h1>
        <p className="mt-4 text-base leading-[1.7] text-ink-2">
          Svar på de vanligaste frågorna om vad Sharpa är — och inte är.
        </p>

        <div className="mt-10 border-t border-ink">
          {FAQS.map((item) => (
            <AccordionItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </div>
  );
}
