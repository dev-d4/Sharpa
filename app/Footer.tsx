"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import NavAuth from "./NavAuth";
import { createClient } from "@/lib/supabase-browser";

export default function Footer() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session?.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-1">
            <Image src="/logo.svg" alt="Fondanalys" width={24} height={24} />
            <span className="text-sm font-semibold text-slate-700">Fondanalys</span>
          </div>
          <nav className="flex items-center flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
            <Link href="/risk-profile" className="hover:text-slate-600 transition-colors">Riskprofil</Link>
            <Link href="/analyze" className="hover:text-slate-600 transition-colors">Analysera</Link>
            {loggedIn && <Link href="/portfolios" className="hover:text-slate-600 transition-colors">Portföljer</Link>}
            <Link href="/hur-det-fungerar" className="hover:text-slate-600 transition-colors">Hur det fungerar</Link>
            <NavAuth variant="footer" />
          </nav>
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
