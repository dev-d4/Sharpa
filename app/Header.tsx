"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  function navClass(href: string) {
    const active = pathname === href || pathname.startsWith(href + "/");
    return `text-sm font-medium transition-colors ${active ? "text-slate-900" : "text-slate-400 hover:text-slate-700"}`;
  }

  function mobileNavClass(href: string) {
    const active = pathname === href || pathname.startsWith(href + "/");
    return `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
      active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
    }`;
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5" onClick={() => setMobileOpen(false)}>
          <Image src="/logo.svg" alt="Fondanalys" width={40} height={40} className="sm:w-12 sm:h-12" />
          <span className="font-bold text-slate-900">Fondanalys</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-4 sm:gap-6">
          <Link href="/analyze" className={navClass("/analyze")}>Analysera</Link>
          {user && <Link href="/portfolios" className={navClass("/portfolios")}>Portföljer</Link>}
          {user ? (
            <>
              <Link href="/risk-profile" className={navClass("/risk-profile")}>Riskprofil</Link>
              <Link href="/account" className={navClass("/account")}>Mitt konto</Link>
            </>
          ) : (
            <>
              <Link href="/risk-profile" className={navClass("/risk-profile")}>Riskprofil</Link>
              <Link
                href="/login"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-sm shadow-blue-200"
              >
                Logga in
              </Link>
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Stäng meny" : "Öppna meny"}
        >
          {mobileOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden bg-white border-t border-slate-100 px-4 py-3 space-y-1">
          <Link href="/analyze" className={mobileNavClass("/analyze")} onClick={() => setMobileOpen(false)}>
            Analysera
          </Link>
          {user && (
            <Link href="/portfolios" className={mobileNavClass("/portfolios")} onClick={() => setMobileOpen(false)}>
              Portföljer
            </Link>
          )}
          <Link href="/risk-profile" className={mobileNavClass("/risk-profile")} onClick={() => setMobileOpen(false)}>
            Riskprofil
          </Link>
          {user ? (
            <Link href="/account" className={mobileNavClass("/account")} onClick={() => setMobileOpen(false)}>
              Mitt konto
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white mt-2 justify-center transition-colors hover:bg-blue-700"
              onClick={() => setMobileOpen(false)}
            >
              Logga in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
