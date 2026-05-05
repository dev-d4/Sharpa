import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="flex items-center gap-1">
          <Image src="/logo.svg" alt="Fondanalys" width={24} height={24} />
          <span className="text-sm font-semibold text-slate-700">Fondanalys</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Fondanalys tillhandahåller inte finansiell rådgivning. All information är endast i informationssyfte och ska inte ses som råd om köp eller försäljning av finansiella instrument.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-xs text-slate-300">© 2026 Fondanalys</p>
          <Link href="/integritetspolicy" className="text-xs text-slate-300 hover:text-slate-500 transition-colors">Integritetspolicy</Link>
          <Link href="/villkor" className="text-xs text-slate-300 hover:text-slate-500 transition-colors">Användarvillkor</Link>
          <Link href="/kakpolicy" className="text-xs text-slate-300 hover:text-slate-500 transition-colors">Kakpolicy</Link>
        </div>
      </div>
    </footer>
  );
}
