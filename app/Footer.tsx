"use client";

import Link from "next/link";
import Image from "next/image";
import NavAuth from "./NavAuth";

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-24">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-1">
            <Image src="/logo.svg" alt="Fondanalys" width={24} height={24} />
            <span className="text-sm font-semibold text-slate-700">Fondanalys</span>
          </div>
          <nav className="flex items-center gap-6 text-xs text-slate-400">
            <Link href="/analyze" className="hover:text-slate-600 transition-colors">Analysera</Link>
            <Link href="/risk-profile" className="hover:text-slate-600 transition-colors">Riskprofil</Link>
            <NavAuth variant="footer" />
          </nav>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Fondanalys tillhandahåller inte finansiell rådgivning. All information är endast i informationssyfte och ska inte ses som råd om köp eller försäljning av finansiella instrument.
        </p>
        <p className="text-xs text-slate-300">© 2026 Fondanalys</p>
      </div>
    </footer>
  );
}
