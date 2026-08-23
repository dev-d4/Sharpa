"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import { clearResume, prepareLoginResume } from "@/lib/resume-session";
import { useLanguage } from "@/lib/i18n";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

type AvatarDropdownProps = {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuId: string;
};

function AvatarDropdown({ user, open, onOpenChange, menuId }: AvatarDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { isEnglish } = useLanguage();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    }
    function closeOnEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onOpenChange]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearResume();
    onOpenChange(false);
    router.push("/");
  }

  const initials = user.email?.charAt(0).toUpperCase() ?? "?";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-line-strong bg-white text-sm font-medium text-ink transition-colors hover:bg-section"
        aria-label={isEnglish ? "Account menu" : "Kontomeny"}
        aria-expanded={open}
        aria-controls={menuId}
      >
        {initials}
      </button>
      {open && (
        <div id={menuId} className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-md border border-line bg-white py-1 shadow-[0_8px_28px_rgba(20,20,30,.12)]">
          <div className="border-b border-line-soft px-4 py-2.5">
            <p className="truncate text-xs text-ink-4">{user.email}</p>
          </div>
          <Link href="/portfolios" onClick={() => onOpenChange(false)} className="block px-4 py-2.5 text-sm text-ink-2 transition-colors hover:bg-section">
            {isEnglish ? "My portfolios" : "Mina portföljer"}
          </Link>
          <Link href="/account" onClick={() => onOpenChange(false)} className="block px-4 py-2.5 text-sm text-ink-2 transition-colors hover:bg-section">
            {isEnglish ? "My account" : "Mitt konto"}
          </Link>
          <div className="mt-1 border-t border-line-soft">
            <button onClick={signOut} className="block w-full px-4 py-2.5 text-left text-sm text-neg transition-colors hover:bg-neg-soft">
              {isEnglish ? "Log out" : "Logga ut"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { isEnglish } = useLanguage();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAvatarOpen, setMobileAvatarOpen] = useState(false);
  const [desktopAvatarOpen, setDesktopAvatarOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
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
    function closeOnOutsideClick(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    function closeOnEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileMenuOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function navClass(href: string) {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return `text-sm transition-colors duration-150 ${active ? "font-medium text-accent" : "text-ink-2 hover:text-ink"}`;
  }

  function handleLoginClick(e: ReactMouseEvent<HTMLAnchorElement>) {
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    prepareLoginResume(currentPath);
    if (!pathname || pathname === "/" || pathname === "/login") return;
    e.preventDefault();
    const next = encodeURIComponent(currentPath);
    router.push(`/login?next=${next}${shouldResumeTool ? "&skip_onboarding=1" : ""}`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white">
      <div ref={mobileMenuRef} className="relative">
        <div className="mx-auto flex h-[56px] max-w-6xl items-center justify-between px-4 sm:grid sm:h-[66px] sm:grid-cols-3 sm:px-6">
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex shrink-0 items-center gap-2.5">
            <Image src="/logo.svg" alt="Sharpa" width={24} height={24} />
            <span className="text-[15px] font-semibold tracking-tight text-ink sm:text-base">Sharpa</span>
          </Link>

          <nav aria-label={isEnglish ? "Main navigation" : "Huvudnavigering"} className="hidden items-center justify-center gap-7 sm:flex">
            <Link href="/analyze" className={navClass("/analyze")}>{isEnglish ? "Analyse my funds" : "Analysera mina fonder"}</Link>
            <Link href="/bygg-portfolj" className={navClass("/bygg-portfolj")}>{isEnglish ? "Create a sample portfolio" : "Skapa portföljexempel"}</Link>
          </nav>

          <div className="hidden items-center justify-end gap-4 sm:flex">
            {user !== undefined && (
              user ? (
                <AvatarDropdown
                  user={user}
                  open={desktopAvatarOpen}
                  onOpenChange={setDesktopAvatarOpen}
                  menuId="desktop-account-menu"
                />
              ) : (
                <Link
                  href={loginHref}
                  onClick={handleLoginClick}
                  className="text-sm text-accent transition-colors duration-150 hover:text-accent-hover"
                >
                  {isEnglish ? "Log in" : "Logga in"}
                </Link>
              )
            )}
            {/* Språkväljaren sitter sist — längst ut i headerns högra hörn. */}
            <LanguageSwitcher />
          </div>

          <div className="flex items-center gap-3 sm:hidden">
            {user !== undefined && (
              user ? (
                <AvatarDropdown
                  user={user}
                  open={mobileAvatarOpen}
                  onOpenChange={(open) => {
                    setMobileAvatarOpen(open);
                    if (open) setMobileMenuOpen(false);
                  }}
                  menuId="mobile-account-menu"
                />
              ) : (
                <Link href={loginHref} onClick={handleLoginClick} className="text-[13px] text-accent">
                  {isEnglish ? "Log in" : "Logga in"}
                </Link>
              )
            )}
            <button
              type="button"
              onClick={() => {
                setMobileAvatarOpen(false);
                setMobileMenuOpen((open) => !open);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xs border border-line-strong bg-white text-ink transition-colors hover:bg-section"
              aria-label={mobileMenuOpen ? (isEnglish ? "Close menu" : "Stäng meny") : (isEnglish ? "Open menu" : "Öppna meny")}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
            </button>
            <LanguageSwitcher />
          </div>
        </div>

        <nav
          id="mobile-navigation"
          aria-label={isEnglish ? "Mobile navigation" : "Mobilnavigering"}
          className={`absolute right-4 top-[calc(100%+8px)] w-[min(18rem,calc(100vw-2rem))] rounded-md border border-line bg-white px-4 py-1.5 shadow-[0_8px_28px_rgba(20,20,30,.12)] sm:hidden ${
            mobileMenuOpen ? "block" : "hidden"
          }`}
        >
          <div>
            <Link href="/analyze" onClick={() => setMobileMenuOpen(false)} className="block border-b border-line py-3.5 text-sm text-ink">
              {isEnglish ? "Analyse my funds" : "Analysera mina fonder"}
            </Link>
            <Link href="/bygg-portfolj" onClick={() => setMobileMenuOpen(false)} className="block py-3.5 text-sm text-ink">
              {isEnglish ? "Create a sample portfolio" : "Skapa portföljexempel"}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
