"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

// ── Visual mockup cards ─────────────────────────────────────────────────────

function PortfolioCard() {
  return (
    <div className="w-72 bg-white rounded-2xl border border-slate-200 shadow-md p-5 space-y-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Din portfölj</p>
      {[
        { name: "Avanza Global", weight: 50, color: "bg-blue-500" },
        { name: "Länsf. Sverige", weight: 30, color: "bg-indigo-400" },
        { name: "SPP Tillväxtmarknad", weight: 20, color: "bg-violet-400" },
      ].map((f) => (
        <div key={f.name} className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-600">
            <span className="font-medium">{f.name}</span>
            <span className="text-slate-400">{f.weight}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${f.color} rounded-full`} style={{ width: `${f.weight}%` }} />
          </div>
        </div>
      ))}
      <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
        {[
          { label: "Avgift/år", value: "0.08%", color: "text-green-600" },
          { label: "Avk. 3 år", value: "+41%", color: "text-blue-600" },
          { label: "Sharpe", value: "1.32", color: "text-slate-700" },
        ].map((m) => (
          <div key={m.label} className="text-center">
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

function AiCard() {
  return (
    <div className="w-72 bg-white rounded-2xl border border-slate-200 shadow-md p-5 space-y-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI-matchning</p>
      <div className="flex gap-2 flex-wrap">
        {["Global", "Låg avgift", "Tillväxt"].map((tag) => (
          <span key={tag} className="text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2.5 py-1">
            {tag}
          </span>
        ))}
      </div>
      <div className="space-y-2 pt-1">
        {[
          { name: "Avanza Global", fee: "0.05%", match: "98%" },
          { name: "SPP Aktiefond Global", fee: "0.00%", match: "95%" },
          { name: "Länsf. Global Indexnära", fee: "0.22%", match: "91%" },
        ].map((f, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-blue-600">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{f.name}</p>
              <p className="text-[10px] text-slate-400">{f.fee}/år</p>
            </div>
            <span className="text-[10px] font-bold text-green-600">{f.match}</span>
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
    title: "Analysera din portfölj",
    description:
      "Lägg in dina fonder och se direkt hur din portfölj presterar — utan att skapa konto.",
    visual: <PortfolioCard />,
  },
  {
    step: "02",
    title: "Ta fram din riskprofil",
    description:
      "Svara på några frågor och se om din portfölj faktiskt matchar din risknivå.",
    visual: <RiskCard />,
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
    title: "Hitta fonder med AI",
    description:
      "Beskriv vad du letar efter — AI:n hittar fonder som passar dig.",
    visual: <AiCard />,
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
        <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2">
          Hur det fungerar
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Från portfölj till bättre beslut
        </h2>
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
