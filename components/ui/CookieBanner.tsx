"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "fondanalys_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6 pointer-events-none">
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 pointer-events-auto">
        <p className="text-sm text-slate-600 flex-1 leading-relaxed">
          Vi använder nödvändiga cookies för autentisering. Inga spårningskakor.{" "}
          <Link href="/kakpolicy" className="text-blue-600 hover:underline">
            Läs mer
          </Link>
          .
        </p>
        <button
          onClick={accept}
          className="shrink-0 bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors"
        >
          Förstått
        </button>
      </div>
    </div>
  );
}
