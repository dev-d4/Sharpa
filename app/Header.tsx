"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

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

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1">
          <Image src="/logo.svg" alt="Fondanalys" width={48} height={48} />
          <span className="font-bold text-slate-900">Fondanalys</span>
        </Link>

        <nav className="flex items-center gap-4 sm:gap-6">
          <Link href="/risk-profile" className={navClass("/risk-profile")}>Riskprofil</Link>
          <Link href="/analyze" className={navClass("/analyze")}>Analysera</Link>
          {user && <Link href="/portfolios" className={navClass("/portfolios")}>Portföljer</Link>}
          {user ? (
            <Link href="/account" className={navClass("/account")}>Mitt konto</Link>
          ) : (
            <Link
              href="/login"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-sm shadow-blue-200"
            >
              Logga in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
