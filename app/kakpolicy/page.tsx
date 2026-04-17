import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kakpolicy | Fondanalys",
  description: "Information om hur Fondanalys använder cookies.",
};

export default function KakpolicyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Kakpolicy</h1>
      <p className="text-sm text-slate-400 mb-10">Senast uppdaterad: april 2026</p>

      <div className="space-y-8 text-slate-700 text-sm leading-relaxed">

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Vad är cookies?</h2>
          <p>
            Cookies (kakor) är små textfiler som lagras i din webbläsare när du besöker en webbplats.
            De används bland annat för att hålla dig inloggad mellan sidbesök.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Vilka cookies använder vi?</h2>
          <p>
            Fondanalys använder <strong>enbart nödvändiga cookies</strong>. Vi använder inga
            spårningskakor, annonskakor eller analyskakor från tredje part.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div>
              <p className="font-semibold text-slate-800">Sessionskakor (Supabase Auth)</p>
              <p className="text-slate-500 mt-0.5">
                Sätts av vår autentiseringsleverantör Supabase för att hålla dig inloggad.
                Raderas när du loggar ut eller när sessionen löper ut.
                Kan inte stängas av utan att inloggning slutar fungera.
              </p>
            </div>
          </div>
          <p>
            Vi använder inga cookies från Google Analytics, Facebook Pixel eller liknande
            spårningsverktyg.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Hantera cookies</h2>
          <p>
            Du kan blockera eller radera cookies i din webbläsares inställningar. Observera att
            om du blockerar nödvändiga sessionskakor kan du inte logga in på Fondanalys.
          </p>
          <p>
            Instruktioner för de vanligaste webbläsarna:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Chrome: Inställningar → Sekretess och säkerhet → Cookies</li>
            <li>Safari: Inställningar → Integritet → Hantera webbplatsdata</li>
            <li>Firefox: Inställningar → Integritet och säkerhet → Cookies</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Samtycke</h2>
          <p>
            Eftersom vi enbart använder tekniskt nödvändiga cookies krävs inget aktivt samtycke
            enligt GDPR och lagen om elektronisk kommunikation (LEK). Vi informerar ändå om detta
            i vår cookie-banner första gången du besöker sidan.
          </p>
        </section>

      </div>

      <div className="mt-10 pt-6 border-t border-slate-200 flex gap-4 text-xs text-slate-400">
        <Link href="/integritetspolicy" className="hover:text-slate-600 transition-colors">Integritetspolicy</Link>
        <Link href="/villkor" className="hover:text-slate-600 transition-colors">Användarvillkor</Link>
        <Link href="/" className="hover:text-slate-600 transition-colors">← Tillbaka till startsidan</Link>
      </div>
    </div>
  );
}
