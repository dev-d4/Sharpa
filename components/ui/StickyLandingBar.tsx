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
      <div className="flex items-center gap-4 bg-white border border-line px-5 py-3 rounded-md" style={{ boxShadow: "0 8px 28px rgba(20,20,30,.12)" }}>
        <p className="text-sm text-ink-2">Bygg din fondportfölj — gratis</p>
        <Link
          href="/bygg-portfolj"
          className="whitespace-nowrap rounded-xs bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover active:bg-accent-press"
        >
          Kom igång
        </Link>
      </div>
    </div>
  );
}
