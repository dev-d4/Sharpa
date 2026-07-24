"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import { MOBILE_BOTTOM_OVERLAY_EVENT } from "@/lib/mobile-bottom-overlay";

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
        className="w-8 h-8 rounded-full bg-info text-accent font-bold text-sm flex items-center justify-center hover:bg-info-line transition-colors"
        aria-label="Kontomeny"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-line py-1 z-50 overflow-hidden" style={{ boxShadow: "0 8px 24px rgba(16,24,40,.08)" }}>
          <div className="px-4 py-2.5 border-b border-line-soft">
            <p className="text-xs text-ink-4 truncate">{user.email}</p>
          </div>
          <Link href="/portfolios" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-ink-2 hover:bg-section transition-colors">
            Mina portföljer
          </Link>
          <Link href="/account" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-ink-2 hover:bg-section transition-colors">
            Mitt konto
          </Link>
          <div className="border-t border-line-soft mt-1">
            <button onClick={signOut} className="block w-full text-left px-4 py-2.5 text-sm text-neg hover:bg-neg-soft transition-colors">
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
  const [mobileBottomOffset, setMobileBottomOffset] = useState(0);
  const [cookieBannerVisible, setCookieBannerVisible] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const shouldResumeTool = pathname === "/analyze" || pathname === "/bygg-portfolj";
  const loginHref = pathname && pathname !== "/" && pathname !== "/login"
    ? `/login?next=${encodeURIComponent(pathname)}${shouldResumeTool ? "&skip_onboarding=1" : ""}`
    : "/login";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const overlays = new Map<string, number>();

    function handleBottomOverlay(e: Event) {
      const detail = (e as CustomEvent<{ id?: string; height?: number }>).detail;
      if (!detail?.id) return;
      const height = Math.max(0, detail.height ?? 0);
      if (height > 0) overlays.set(detail.id, height);
      else overlays.delete(detail.id);
      if (detail.id.startsWith("cookie-banner-")) {
        setCookieBannerVisible(height > 0);
      }
      setMobileBottomOffset(Math.max(0, ...overlays.values()));
    }

    window.addEventListener(MOBILE_BOTTOM_OVERLAY_EVENT, handleBottomOverlay);
    return () => window.removeEventListener(MOBILE_BOTTOM_OVERLAY_EVENT, handleBottomOverlay);
  }, []);

  function navClass(href: string) {
    const active = pathname === href || pathname.startsWith(href + "/");
    return `text-[15px] font-semibold transition-colors ${active ? "text-accent" : "text-ink-2 hover:text-ink"}`;
  }

  function isActivePath(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  function mobileActionClass(href: string) {
    const active = isActivePath(href);
    return `mobile-glass-button relative flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 text-xs font-semibold transition-colors duration-200 ${
      active ? "text-accent" : "text-ink-2 hover:text-ink"
    }`;
  }

  function mobileAriaCurrent(href: string) {
    return isActivePath(href) ? "page" : undefined;
  }

  function notifyBeforeLogin() {
    window.dispatchEvent(new Event("fondanalys:before-login"));
  }

  function handleLoginClick(e: ReactMouseEvent<HTMLAnchorElement>) {
    notifyBeforeLogin();
    if (!pathname || pathname === "/" || pathname === "/login") return;
    e.preventDefault();
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const next = encodeURIComponent(currentPath);
    router.push(`/login?next=${next}${shouldResumeTool ? "&skip_onboarding=1" : ""}`);
  }

  return (
    <>
      <header className="bg-white/90 backdrop-blur-sm border-b border-line/70 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-[72px] flex items-center justify-between sm:grid sm:grid-cols-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo.svg" alt="Sharpa" width={28} height={28} className="sm:h-9 sm:w-9" />
            <span className="font-heading text-base font-extrabold tracking-tight text-ink sm:text-lg">
              Sharpa
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center justify-center gap-8">
            <Link href="/analyze" className={navClass("/analyze")}>Analysera mina fonder</Link>
            <Link href="/bygg-portfolj" className={navClass("/bygg-portfolj")}>Bygg ny portfölj</Link>
          </nav>

          {/* Desktop right actions */}
          <div className="hidden sm:flex items-center justify-end gap-3">
            {user !== undefined && (
              user ? (
                <AvatarDropdown user={user} />
              ) : (
                <Link
                  href={loginHref}
                  onClick={handleLoginClick}
                  className="bg-info hover:bg-blue-100 text-accent text-sm font-semibold px-4 py-2 rounded-[10px] transition-colors"
                >
                  Logga in
                </Link>
              )
            )}
          </div>

          {/* Mobile: avatar or login */}
          <div className="sm:hidden">
            {user !== undefined && (
              user ? (
                <AvatarDropdown user={user} />
              ) : (
                <Link href={loginHref} onClick={handleLoginClick} className="text-sm font-semibold text-ink-2">
                  Logga in
                </Link>
              )
            )}
          </div>
        </div>
      </header>

      {/* Mobile quick actions */}
      <motion.nav
        layoutRoot
        aria-label="Snabbnavigering"
        animate={{
          bottom: cookieBannerVisible ? 0 : mobileBottomOffset,
          opacity: cookieBannerVisible ? 0 : 1,
          y: cookieBannerVisible ? 12 : 0,
        }}
        transition={{ type: "spring", stiffness: 360, damping: 34 }}
        className="sm:hidden fixed inset-x-0 z-[60] flex justify-center px-3 pb-safe pointer-events-none"
      >
        <div className={`mobile-liquid-glass flex w-full max-w-xs items-center gap-1 rounded-[16px] p-1 ${cookieBannerVisible ? "pointer-events-none" : "pointer-events-auto"}`}>
          <Link href="/analyze" aria-current={mobileAriaCurrent("/analyze")} className={mobileActionClass("/analyze")}>
            {isActivePath("/analyze") && (
              <motion.span
                layoutId="mobileNavGlass"
                className="mobile-glass-pill"
                transition={{ type: "spring", bounce: 0.3, duration: 0.77 }}
              />
            )}
            <Search className="relative z-[1] h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            <span className="relative z-[1]">Analysera</span>
          </Link>
          <Link href="/bygg-portfolj" aria-current={mobileAriaCurrent("/bygg-portfolj")} className={mobileActionClass("/bygg-portfolj")}>
            {isActivePath("/bygg-portfolj") && (
              <motion.span
                layoutId="mobileNavGlass"
                className="mobile-glass-pill"
                transition={{ type: "spring", bounce: 0.3, duration: 0.7 }}
              />
            )}
            <Plus className="relative z-[1] h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            <span className="relative z-[1]">Ny portfölj</span>
          </Link>
        </div>
      </motion.nav>
    </>
  );
}
