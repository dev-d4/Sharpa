"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function StickyLandingBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 480);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div
      className={`hidden sm:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-4 bg-white border border-line px-5 py-3 rounded-xl" style={{ boxShadow: "0 8px 24px rgba(16,24,40,.08)" }}>
        <p className="text-sm font-medium text-ink-2">Bygg din fondportfölj — gratis</p>
        <Link
          href="/bygg-portfolj"
          className="bg-accent hover:bg-accent-hover active:bg-accent-press text-white text-sm font-semibold px-4 py-1.5 rounded-[10px] transition-colors whitespace-nowrap"
        >
          Kom igång →
        </Link>
      </div>
    </div>
  );
}
