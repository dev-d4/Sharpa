import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sidan hittades inte | Fondanalys",
};

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-slate-200 select-none">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Sidan hittades inte</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-xs">
        Sidan du letar efter finns inte eller har flyttats.
      </p>
      <Link
        href="/"
        className="mt-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md shadow-blue-200 text-sm"
      >
        Tillbaka till startsidan
      </Link>
    </div>
  );
}
