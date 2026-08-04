import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Användarvillkor | Sharpa",
  description: "Användarvillkor för Sharpa.",
};

export default function VillkorPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Användarvillkor</h1>
      <p className="text-sm text-slate-400 mb-10">Senast uppdaterad: augusti 2026</p>

      <div className="space-y-8 text-slate-700 text-sm leading-relaxed">

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">1. Om tjänsten</h2>
          <p>
            Sharpa är en webbtjänst som hjälper privatpersoner att sammanställa nyckeltal om
            fonder och fondportföljer samt jämföra fonder mot varandra utifrån historiska data.
            Tjänsten är kostnadsfri att använda och riktar sig till privatpersoner i Sverige.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">2. Inte finansiell rådgivning — inget tillstånd</h2>
          <p>
            <strong>Sharpa tillhandahåller inte finansiell rådgivning.</strong> Sharpa står
            inte under Finansinspektionens tillsyn och har inget tillstånd att bedriva
            investeringsrådgivning, värdepappersrörelse, försäkringsdistribution eller annan
            tillståndspliktig finansiell verksamhet.
          </p>
          <p>
            Alla analyser, betyg och fondjämförelser i tjänsten genereras <strong>automatiskt</strong> utifrån
            historiska nyckeltal och generella, förutbestämda kriterier. De tar inte hänsyn till din
            ekonomiska situation, dina kunskaper, din erfarenhet eller dina mål, och utgör därför
            inte personliga rekommendationer. Ingenting i tjänsten ska tolkas som råd om köp,
            försäljning eller innehav av finansiella instrument.
          </p>
          <p>
            Historisk avkastning är ingen garanti för framtida avkastning. Fondandelar kan både öka
            och minska i värde och det är inte säkert att du får tillbaka det investerade kapitalet.
            Alla investeringsbeslut fattar du själv och på egen risk. Rådgör med en auktoriserad
            finansiell rådgivare innan du fattar investeringsbeslut.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">3. Konto och tillgång</h2>
          <p>
            För att spara portföljer behöver du skapa ett konto. Du ansvarar för att
            hålla din inloggningsinformation säker och för all aktivitet som sker från ditt konto.
          </p>
          <p>
            Vi förbehåller oss rätten att stänga konton som missbrukar tjänsten, t.ex. genom automatiserade
            anrop, spridning av felaktig information eller brott mot dessa villkor.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">4. Portföljbevakning och utskick</h2>
          <p>
            Sparar du en portfölj räknar vi dagligen om dess betyg mot uppdaterad fonddata och
            sparar resultatet som historik. Har du aktivt valt att få notiser mejlar vi dig när
            betyget försämras tydligt. Utskicken beskriver vad som förändrats i datan — de
            innehåller inga uppmaningar att köpa, sälja eller byta fonder och utgör inte
            rådgivning. Du kan när som helst stänga av dem under Mitt konto eller via länken i
            varje meddelande.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">5. Datakällor och noggrannhet</h2>
          <p>
            Fonddata hämtas från Avanzas och Nordnets publika fondlistor och uppdateras
            regelbundet, men inte i realtid. Vi kan inte garantera att uppgifterna alltid är
            fullständiga, korrekta eller aktuella. Kontrollera alltid uppgifter om en fond
            (avgift, avkastning, risk) och läs fondens faktablad (KID) hos fondbolaget eller din
            depåplattform innan du fattar beslut.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">6. Immateriella rättigheter</h2>
          <p>
            Allt innehåll, design och kod på Sharpa tillhör Sharpa. Du får inte kopiera,
            distribuera eller skapa härledda verk utan skriftligt tillstånd.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">7. Ansvarsbegränsning</h2>
          <p>
            Tjänsten tillhandahålls &ldquo;i befintligt skick&rdquo;. Beslut som fattas helt eller
            delvis utifrån information från tjänsten fattas på egen risk, och Sharpa ansvarar inte
            för ekonomiska förluster som uppstår till följd av sådana beslut.
          </p>
          <p>
            Begränsningen gäller inte skada som Sharpa orsakat genom uppsåt eller grov vårdslöshet,
            och inskränker inte de rättigheter du har som konsument enligt tvingande lag.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">8. Ändringar</h2>
          <p>
            Vi kan uppdatera dessa villkor när som helst. Fortsatt användning efter att ändringar
            trätt i kraft innebär att du accepterar de nya villkoren.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">9. Tillämplig lag</h2>
          <p>
            Dessa villkor regleras av svensk lag. Tvister ska i första hand lösas i samförstånd,
            och i andra hand av allmän domstol i Sverige.
          </p>
        </section>

      </div>

      <div className="mt-10 pt-6 border-t border-slate-200 flex gap-4 text-xs text-slate-400">
        <Link href="/integritetspolicy" className="hover:text-slate-600 transition-colors">Integritetspolicy</Link>
        <Link href="/kakpolicy" className="hover:text-slate-600 transition-colors">Kakpolicy</Link>
        <Link href="/" className="hover:text-slate-600 transition-colors">Tillbaka till startsidan</Link>
      </div>
    </div>
  );
}
