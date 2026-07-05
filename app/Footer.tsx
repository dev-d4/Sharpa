import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="flex items-center gap-1">
          <Image src="/logo.svg" alt="Sharpa" width={24} height={24} />
          <span className="font-heading text-sm font-extrabold text-slate-700">Sharpa</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Sharpa är ett automatiserat analysverktyg som tillhandahåller allmän information — inte finansiell rådgivning.
          Vi står inte under Finansinspektionens tillsyn och har inget tillstånd att bedriva investeringsrådgivning eller
          annan tillståndspliktig finansiell verksamhet. Historisk avkastning är ingen garanti för framtida resultat;
          fondandelar kan både öka och minska i värde och det är inte säkert att du får tillbaka det investerade kapitalet.
          Beslut som fattas utifrån informationen på denna webbplats sker på egen risk.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-xs text-ink-4">© 2026 Sharpa</p>
          <Link href="/integritetspolicy" className="text-xs text-ink-4 hover:text-ink-2 transition-colors">Integritetspolicy</Link>
          <Link href="/villkor" className="text-xs text-ink-4 hover:text-ink-2 transition-colors">Användarvillkor</Link>
          <Link href="/kakpolicy" className="text-xs text-ink-4 hover:text-ink-2 transition-colors">Kakpolicy</Link>
          <Link href="/faq" className="text-xs text-ink-4 hover:text-ink-2 transition-colors">FAQ</Link>
        </div>
      </div>
    </footer>
  );
}
