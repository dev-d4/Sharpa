"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

// ── Visual mockup cards ─────────────────────────────────────────────────────

function PortfolioCard() {
  return (
    <div className="w-72 bg-white rounded-2xl border border-slate-200 shadow-md p-5 space-y-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Din portfölj</p>
      {[
        { name: "Avanza Global", weight: "50%" },
        { name: "Länsf. Sverige", weight: "30%" },
        { name: "SPP Tillväxtmarknad", weight: "20%" },
      ].map((f) => (
        <div key={f.name} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
          <span className="text-sm font-medium text-slate-700">{f.name}</span>
          <span className="text-sm text-slate-400 font-medium">{f.weight}</span>
        </div>
      ))}
      <div className="pt-2 grid grid-cols-3 gap-2">
        {[
          { label: "Avgift/år", value: "0.08%", color: "text-green-600" },
          { label: "Avk. 3 år", value: "+41%", color: "text-blue-600" },
          { label: "Sharpe", value: "1.32", color: "text-slate-700" },
        ].map((m) => (
          <div key={m.label} className="text-center bg-slate-50 rounded-xl py-2">
            <p className="text-[10px] text-slate-400">{m.label}</p>
            <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskCard() {
  const levels = ["Försiktig", "Defensiv", "Balanserad", "Tillväxt", "Offensiv"];
  const active = 3; // Tillväxt
  return (
    <div className="w-72 bg-white rounded-2xl border border-slate-200 shadow-md p-5 space-y-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Din riskprofil</p>
      <div className="flex gap-1.5">
        {levels.map((label, i) => (
          <div
            key={i}
            className={`flex-1 rounded-lg py-2 flex items-center justify-center transition-colors ${
              i === active
                ? "bg-blue-500 text-white"
                : i < active
                ? "bg-blue-100 text-blue-400"
                : "bg-slate-100 text-slate-300"
            }`}
          >
            <span className="text-[8px] font-bold text-center leading-tight px-0.5">{label}</span>
          </div>
        ))}
      </div>
      <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex gap-2 items-start">
        <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-xs font-semibold text-green-700">Tillväxt · ~80% aktier</p>
          <p className="text-xs text-green-600 mt-0.5">Din portfölj matchar din profil</p>
        </div>
      </div>
    </div>
  );
}

function SwapCard() {
  return (
    <div className="w-72 bg-white rounded-2xl border border-slate-200 shadow-md p-5 space-y-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bytesförslag</p>
      <div className="flex items-center gap-3">
        <div className="flex-1 text-left">
          <p className="text-[10px] text-slate-400 mb-0.5">Byt från</p>
          <p className="text-xs font-semibold text-slate-800 leading-tight">Nordea Globalfond</p>
          <p className="text-base font-bold text-red-500 mt-1">1.40% / år</p>
        </div>
        <svg className="w-5 h-5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <div className="flex-1 text-right">
          <p className="text-[10px] text-green-600 mb-0.5">Byt till</p>
          <p className="text-xs font-semibold text-slate-800 leading-tight">Avanza Global</p>
          <p className="text-base font-bold text-green-600 mt-1">0.05% / år</p>
        </div>
      </div>
      <div className="pt-3 border-t border-slate-100 text-center">
        <p className="text-[10px] text-slate-400">Avgiftsbesparing per år</p>
        <p className="text-lg font-bold text-blue-600">−1.35 procentenheter</p>
      </div>
    </div>
  );
}

function BuilderCard() {
  const questions = [
    { q: "Vilken plattform?", a: "Avanza" },
    { q: "Sparmål?", a: "Pension" },
    { q: "Horisont?", a: "Mer än 15 år" },
  ];
  const funds = [
    { name: "Avanza Global", weight: "50%" },
    { name: "Länsf. Sverige", weight: "30%" },
    { name: "SPP Tillväxtmarknad", weight: "20%" },
  ];
  return (
    <div className="w-72 bg-white rounded-2xl border border-slate-200 shadow-md p-5 space-y-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bygg din portfölj</p>
      <div className="space-y-2">
        {questions.map((item) => (
          <div key={item.q} className="flex justify-between items-center text-xs">
            <span className="text-slate-400">{item.q}</span>
            <span className="font-semibold text-slate-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">{item.a}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 pt-3 space-y-1.5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Föreslagen portfölj</p>
        {funds.map((f) => (
          <div key={f.name} className="flex justify-between items-center">
            <span className="text-xs font-medium text-slate-700">{f.name}</span>
            <span className="text-xs font-bold text-indigo-600">{f.weight}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Steps data ──────────────────────────────────────────────────────────────

const steps = [
  {
    step: "01",
    title: "Bygg din portfölj på 2 minuter",
    description:
      "Svara på 6 korta frågor om dina mål och risktolerans — vi sätter ihop en komplett fondportfölj anpassad just för dig.",
    visual: <BuilderCard />,
  },
  {
    step: "02",
    title: "Analysera din befintliga portfölj",
    description:
      "Har du redan fonder? Lägg in dem och se direkt hur portföljen presterar — avgifter, avkastning och risk.",
    visual: <PortfolioCard />,
  },
  {
    step: "03",
    title: "Få personliga fondbytesförslag",
    description:
      "Få konkreta förslag på vilka fonder du kan byta ut — och se vad det innebär för din portfölj.",
    visual: <SwapCard />,
  },
  {
    step: "04",
    title: "Ta fram din riskprofil",
    description:
      "Svara på några frågor och se om din portfölj faktiskt matchar din risknivå.",
    visual: <RiskCard />,
  },
];

// ── Per-step section ────────────────────────────────────────────────────────

function StepSection({
  s,
  index,
}: {
  s: (typeof steps)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center start"],
  });

  const reversed = index % 2 === 1;

  const opacity  = useTransform(scrollYProgress, [0, 0.6], [0, 1]);
  const xVisual  = useTransform(scrollYProgress, [0, 0.55], [reversed ? -80 : 80, 0]);

  return (
    <div
      ref={ref}
      className={`py-28 flex items-center justify-center gap-16 lg:gap-28 px-8 ${
        reversed ? "flex-row-reverse" : ""
      }`}
    >
      {/* Text — fades in only, no slide */}
      <motion.div className="max-w-sm w-full" style={{ opacity }}>
        <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
          {s.step}
        </span>
        <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-2 leading-tight">
          {s.title}
        </h3>
        <p className="text-slate-500 mt-4 leading-relaxed text-base sm:text-lg">
          {s.description}
        </p>
      </motion.div>

      {/* Visual — slides in harder from the outer edge */}
      <motion.div style={{ opacity, x: xVisual }}>
        {s.visual}
      </motion.div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────

export default function HowItWorks() {
  return (
    <section>
      {/* Header */}
      <motion.div
        className="text-center mb-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 leading-tight">
          Steg för steg
        </h2>
        <p className="text-slate-400 mt-3 text-sm sm:text-base">
          Smarta fondval börjar här
        </p>
      </motion.div>

      {/* Desktop: full-height scroll-reveal steps */}
      <div className="hidden sm:block">
        {steps.map((s, i) => (
          <StepSection key={i} s={s} index={i} />
        ))}
      </div>

      {/* Mobile: simple stacked cards */}
      <div className="sm:hidden space-y-4 mt-10">
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
          >
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">{s.step}</span>
            <p className="font-bold text-slate-900">{s.title}</p>
            <p className="text-sm text-slate-500 leading-relaxed">{s.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
