import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Integritetspolicy | Sharpa",
  description: "Hur Sharpa hanterar dina personuppgifter.",
};

export default function IntegritetspolicyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Integritetspolicy</h1>
      <p className="text-sm text-slate-400 mb-10">Senast uppdaterad: juli 2026</p>

      <div className="prose prose-slate max-w-none space-y-8 text-slate-700 text-sm leading-relaxed">

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">1. Personuppgiftsansvarig</h2>
          <p>
            Sharpa är personuppgiftsansvarig för behandlingen av dina personuppgifter.
            Har du frågor om hur vi hanterar dina uppgifter är du välkommen att kontakta oss på
            {" "}<a href="mailto:sharpakontakt@gmail.com" className="text-blue-600 hover:underline">sharpakontakt@gmail.com</a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">2. Vilka uppgifter samlar vi in?</h2>
          <p>Vi samlar in och behandlar följande uppgifter:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>E-postadress</strong> — när du skapar ett konto eller loggar in via magisk länk.</li>
            <li><strong>Autentiseringsuppgifter via Google</strong> — om du väljer att logga in med Google.</li>
            <li><strong>Portföljdata</strong> — fondnamn, vikter och analys som du sparar i tjänsten.</li>
            <li><strong>Tekniska uppgifter</strong> — sessionskakor som krävs för inloggning.</li>
            <li>
              <strong>Anonymiserad besöksstatistik</strong> — exempelvis sidvisningar, hänvisande
              webbplats, ungefärlig plats, enhet och webbläsare via Vercel Web Analytics.
            </li>
          </ul>
          <p>
            Vissa inställningar (t.ex. val av depåplattform och ditt cookieval) sparas endast lokalt
            i din webbläsare och skickas inte till oss.
          </p>
          <p>
            Vi samlar <strong>inte</strong> in känsliga personuppgifter, inga annonskakor och vi
            delar inte dina uppgifter med tredje part för marknadsföring.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">3. Varför behandlar vi dina uppgifter?</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Tillhandahålla tjänsten</strong> — för att du ska kunna logga in och spara portföljer.</li>
            <li><strong>Autentisering</strong> — sessionskakor krävs tekniskt för att hålla dig inloggad.</li>
            <li><strong>Förbättra webbplatsen</strong> — anonymiserad och sammanställd besöksstatistik hjälper oss förstå hur tjänsten används.</li>
          </ul>
          <p>Rättslig grund: <em>berättigat intresse</em> och <em>fullgörande av avtal</em> (tjänstens tillhandahållande).</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">4. Underbiträden och tredjeparter</h2>
          <p>Vi använder följande underbiträden för att driva tjänsten:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase</strong> (Supabase Inc.) — databas och autentisering. Data lagras inom EU/EES.</li>
            <li><strong>Vercel</strong> (Vercel Inc.) — webbhosting, serverless-funktioner och anonymiserad webbanalys.</li>
            <li><strong>Google OAuth</strong> — om du väljer att logga in med Google.</li>
          </ul>
          <p>Alla underbiträden behandlar uppgifter enligt våra instruktioner och GDPR.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">5. Cookies</h2>
          <p>
            Vi använder enbart sessionskakor som är nödvändiga för att autentisering ska fungera.
            Vercel Web Analytics använder inga cookies. Vi använder inga spårnings- eller
            annonskakor. Du kan läsa mer i vår{" "}
            <Link href="/kakpolicy" className="text-blue-600 hover:underline">kakpolicy</Link>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">6. Lagringstid</h2>
          <p>
            Vi lagrar dina uppgifter så länge ditt konto är aktivt. Om du raderar ditt konto
            raderas alla dina uppgifter (portföljer, e-postadress) inom 30 dagar.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">7. Dina rättigheter (GDPR)</h2>
          <p>Du har rätt att:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Begära tillgång</strong> till de uppgifter vi har om dig.</li>
            <li><strong>Begära rättelse</strong> av felaktiga uppgifter.</li>
            <li><strong>Begära radering</strong> — du kan radera ditt konto direkt i kontoinställningarna.</li>
            <li><strong>Invända mot behandling</strong> baserad på berättigat intresse.</li>
            <li><strong>Lämna in klagomål</strong> till Integritetsskyddsmyndigheten (IMY), imy.se.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">8. Kontakt</h2>
          <p>
            Har du frågor om din integritet eller vill utöva dina rättigheter, hör av dig via
            e-post till <a href="mailto:sharpakontakt@gmail.com" className="text-blue-600 hover:underline">sharpakontakt@gmail.com</a>.
          </p>
        </section>

      </div>

      <div className="mt-10 pt-6 border-t border-slate-200 flex gap-4 text-xs text-slate-400">
        <Link href="/villkor" className="hover:text-slate-600 transition-colors">Användarvillkor</Link>
        <Link href="/kakpolicy" className="hover:text-slate-600 transition-colors">Kakpolicy</Link>
        <Link href="/" className="hover:text-slate-600 transition-colors">← Tillbaka till startsidan</Link>
      </div>
    </div>
  );
}
