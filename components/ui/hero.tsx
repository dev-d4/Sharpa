"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center px-6 py-24">
      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl space-y-6">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-4 py-1.5 rounded-full"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Baserat på data från Avanza &amp; Nordnet
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold leading-tight tracking-tight text-slate-900"
        >
          Optimera din{" "}
          <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-indigo-400 bg-clip-text text-transparent">
            fondportfölj
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-slate-500 leading-relaxed max-w-md mx-auto"
        >
          Analysera dina fonder kostnadsfritt. Få nyckeltal om avgifter, avkastning och risk — och personliga fondbytesförslag.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="flex items-center justify-center gap-4 flex-wrap"
        >
          <Link
            href="/analyze"
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-200 text-sm"
          >
            Analysera din portfölj →
          </Link>
          <span className="text-sm text-slate-400">Gratis · Ingen registrering krävs</span>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex items-center justify-center gap-4 sm:gap-8 pt-4"
        >
          {[
            { value: "3 000+", label: "Fonder analyserade" },
            { value: "Gratis", label: "Alltid kostnadsfritt" },
            { value: "< 1 min", label: "Tid för analys" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-lg font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
