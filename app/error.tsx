"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-slate-200 select-none">500</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Något gick fel</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-xs">
        Ett oväntat fel uppstod. Försök igen eller gå tillbaka till startsidan.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md shadow-blue-200 text-sm"
        >
          Försök igen
        </button>
        <Link
          href="/"
          className="border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-6 py-3 rounded-xl transition-all text-sm"
        >
          Startsidan
        </Link>
      </div>
    </div>
  );
}
