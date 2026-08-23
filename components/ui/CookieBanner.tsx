"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMobileBottomOverlay } from "@/lib/mobile-bottom-overlay";
import { useLanguage } from "@/lib/i18n";

const STORAGE_KEY = "fondanalys_cookie_consent";

export default function CookieBanner() {
  const { isEnglish } = useLanguage();
  const [visible, setVisible] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useMobileBottomOverlay(visible, bannerRef, "cookie-banner");

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      queueMicrotask(() => setVisible(true));
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div ref={bannerRef} className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6 pointer-events-none">
      <div className="pointer-events-auto mx-auto flex max-w-2xl flex-col gap-3 rounded-md border border-line bg-white p-4 shadow-[0_8px_28px_rgba(20,20,30,.12)] sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <p className="flex-1 text-sm leading-relaxed text-ink-2">
          {isEnglish ? "We use essential cookies for authentication. No tracking cookies." : "Vi använder nödvändiga cookies för autentisering. Inga spårningskakor."}{" "}
          <Link href="/kakpolicy" className="text-accent underline decoration-line-strong underline-offset-2 transition-colors duration-150 hover:decoration-accent">
            {isEnglish ? "Read more" : "Läs mer"}
          </Link>
          .
        </p>
        <button
          onClick={accept}
          className="h-11 shrink-0 rounded-xs bg-accent px-5 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
        >
          {isEnglish ? "Got it" : "Förstått"}
        </button>
      </div>
    </div>
  );
}
