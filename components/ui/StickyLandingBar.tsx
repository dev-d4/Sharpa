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
      className={`hidden sm:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-4 bg-slate-900/95 backdrop-blur-sm text-white px-5 py-3 rounded-2xl shadow-2xl shadow-slate-900/30">
        <p className="text-sm font-medium text-slate-300">Bygg din fondportfölj — gratis</p>
        <Link
          href="/bygg-portfolj"
          className="bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors whitespace-nowrap"
        >
          Kom igång →
        </Link>
      </div>
    </div>
  );
}
