"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

function AvatarDropdown({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
  }

  const initials = user.email?.charAt(0).toUpperCase() ?? "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm flex items-center justify-center hover:bg-blue-200 transition-colors"
        aria-label="Kontomeny"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
          <Link href="/portfolios" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            Mina portföljer
          </Link>
          <Link href="/risk-profile" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            Riskprofil
          </Link>
          <Link href="/account" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            Mitt konto
          </Link>
          <div className="border-t border-slate-100 mt-1">
            <button onClick={signOut} className="block w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
              Logga ut
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
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
    return `text-sm font-semibold transition-colors ${active ? "text-slate-900" : "text-slate-600 hover:text-slate-900"}`;
  }

  function bottomTabClass(href: string, exact = false) {
    const active = exact ? pathname === href : (pathname === href || (href !== "/" && pathname.startsWith(href)));
    return `flex flex-col items-center gap-0.5 py-2 px-2 flex-1 transition-colors min-w-0 ${
      active ? "text-blue-600" : "text-slate-400"
    }`;
  }

  return (
    <>
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200/70 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between sm:grid sm:grid-cols-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo.svg" alt="Fondanalys" width={28} height={28} className="sm:w-8 sm:h-8" />
            <span className="text-base font-bold tracking-tight text-slate-900">
              Fond<span className="text-blue-500">analys</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center justify-center gap-6">
            <Link href="/analyze" className={navClass("/analyze")}>Analysera</Link>
            <Link href="/bygg-portfolj" className={navClass("/bygg-portfolj")}>Bygg portfölj</Link>
          </nav>

          {/* Desktop right actions */}
          <div className="hidden sm:flex items-center justify-end gap-3">
            {user !== undefined && (
              user ? (
                <AvatarDropdown user={user} />
              ) : (
                <>
                  <Link
                    href="/login"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    Logga in eller skapa konto
                  </Link>
                </>
              )
            )}
          </div>

          {/* Mobile: avatar or login */}
          <div className="sm:hidden">
            {user !== undefined && (
              user ? (
                <AvatarDropdown user={user} />
              ) : (
                <Link href="/login" className="text-sm font-semibold text-slate-600">
                  Logga in
                </Link>
              )
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-t border-slate-200/70 flex pb-safe">
        <Link href="/" className={bottomTabClass("/", true)}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span className="text-[11px] font-semibold">Hem</span>
        </Link>
        <Link href="/analyze" className={bottomTabClass("/analyze")}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <span className="text-[11px] font-semibold">Analysera</span>
        </Link>
        <Link href="/bygg-portfolj" className={bottomTabClass("/bygg-portfolj")}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[11px] font-semibold">Bygg</span>
        </Link>
        {user && (
          <Link href="/portfolios" className={bottomTabClass("/portfolios")}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
            </svg>
            <span className="text-[11px] font-semibold">Portföljer</span>
          </Link>
        )}
        <Link href={user ? "/account" : "/login"} className={bottomTabClass(user ? "/account" : "/login")}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <span className="text-[11px] font-semibold">{user ? "Konto" : "Logga in"}</span>
        </Link>
      </nav>
    </>
  );
}
