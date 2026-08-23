"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/lib/i18n";

export default function Footer() {
  const { isEnglish } = useLanguage();
  return (
    <footer className="mt-12 border-t border-line bg-white sm:mt-16">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Sharpa" width={20} height={20} />
          <span className="text-sm font-semibold text-ink">Sharpa</span>
        </div>
        <p className="max-w-[720px] text-xs leading-relaxed text-ink-2">
          {isEnglish ? "Sharpa is an automated analysis tool that provides general information — not financial advice. We are not supervised by the Swedish Financial Supervisory Authority and are not authorised to provide investment advice or conduct any other regulated financial activity. Past performance is no guarantee of future results; fund units may rise or fall in value, and you may not recover the capital invested. Any decisions based on information on this website are made at your own risk." : <>Sharpa är ett automatiserat analysverktyg som tillhandahåller allmän information — inte finansiell rådgivning.
          Vi står inte under Finansinspektionens tillsyn och har inget tillstånd att bedriva investeringsrådgivning eller
          annan tillståndspliktig finansiell verksamhet. Historisk avkastning är ingen garanti för framtida resultat;
          fondandelar kan både öka och minska i värde och det är inte säkert att du får tillbaka det investerade kapitalet.
          Beslut som fattas utifrån informationen på denna webbplats sker på egen risk.</>}
        </p>
        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-4">
          <p className="text-xs text-ink-3">© 2026 Sharpa</p>
          <Link href="/integritetspolicy" className="text-xs text-ink-3 transition-colors hover:text-ink">{isEnglish ? "Privacy policy" : "Integritetspolicy"}</Link>
          <Link href="/villkor" className="text-xs text-ink-3 transition-colors hover:text-ink">{isEnglish ? "Terms of use" : "Användarvillkor"}</Link>
          <Link href="/kakpolicy" className="text-xs text-ink-3 transition-colors hover:text-ink">{isEnglish ? "Cookie policy" : "Kakpolicy"}</Link>
          <Link href="/faq" className="text-xs text-ink-3 transition-colors hover:text-ink">FAQ</Link>
        </div>
      </div>
    </footer>
  );
}
