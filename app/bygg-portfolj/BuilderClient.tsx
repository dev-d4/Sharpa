"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

// ── Types ────────────────────────────────────────────────────────────────────

type Platform   = "avanza" | "nordnet" | "both";
type Goal       = "pension" | "wealth" | "specific" | "preserve";
type Horizon    = "short" | "medium" | "long" | "verylong";
type Reaction   = "sell" | "wait" | "buy";
type Management = "passive" | "mixed" | "active";
type Step       = "platform" | "goal" | "horizon" | "reaction" | "selections" | "management" | "results";

export type SelectionId =
  | "global" | "sweden" | "usa" | "europe" | "nordic" | "emerging" | "asia"
  | "japan" | "china" | "india" | "latam"
  | "tech" | "health" | "real-estate" | "energy" | "finance" | "consumer" | "industry"
  | "growth" | "value" | "smallcap";

type Answers = {
  platform:      Platform    | null;
  goal:          Goal        | null;
  horizon:       Horizon     | null;
  reaction:      Reaction    | null;
  selections:    SelectionId[] | null;
  priorities:    Record<string, number> | null;
  management:    Management  | null;
  equityOverride: number | null;
};

type PortfolioFund = {
  isin:         string;
  name:         string;
  weight:       number;
  category:     string;
  rationale:    string;
  ongoing_cost: number | null;
  sharpe_3yr:   number | null;
};

type BuildResult = {
  portfolio: PortfolioFund[];
  riskScore: number;
  riskLabel: string;
  equityPct: number;
  summary:   string;
  reasoning: string[];
};

// ── Option data ───────────────────────────────────────────────────────────────

const STEPS: Step[] = ["platform", "goal", "horizon", "reaction", "selections", "management"];

const PLATFORM_OPTIONS: { value: Platform; label: string; desc: string }[] = [
  { value: "avanza",  label: "Avanza",  desc: "Jag handlar fonder via Avanza" },
  { value: "nordnet", label: "Nordnet", desc: "Jag handlar fonder via Nordnet" },
  { value: "both",    label: "Övrigt", desc: "Jag använder flera plattformar" },
];

const GOAL_OPTIONS: { value: Goal; label: string; desc: string }[] = [
  { value: "pension",  label: "Pension och långsiktigt sparande", desc: "Sparar för pensionen eller på mycket lång sikt" },
  { value: "wealth",   label: "Bygga förmögenhet",               desc: "Vill växa kapitalet utan ett specifikt slutmål" },
  { value: "specific", label: "Specifikt mål",                   desc: "Bostad, bil, studier eller liknande" },
  { value: "preserve", label: "Bevara kapital",                  desc: "Viktigast är att inte förlora pengar" },
];

const HORIZON_OPTIONS: { value: Horizon; label: string; desc: string }[] = [
  { value: "short",    label: "Under 3 år",   desc: "Kort sikt — kapitalet kan behövas snart" },
  { value: "medium",   label: "3–7 år",       desc: "Mellanlång sikt" },
  { value: "long",     label: "7–15 år",      desc: "Lång sikt — kapitalet är bundet länge" },
  { value: "verylong", label: "Mer än 15 år", desc: "Mycket lång sikt, t.ex. pension" },
];

const REACTION_OPTIONS: { value: Reaction; label: string; desc: string }[] = [
  { value: "sell", label: "Jag säljer",    desc: "Jag oroas och vill inte riskera mer förlust" },
  { value: "wait", label: "Jag avvaktar",  desc: "Jag stannar kvar men oroar mig" },
  { value: "buy",  label: "Jag köper mer", desc: "Bra köpläge — jag ökar hellre när det faller" },
];

const SELECTION_OPTIONS: { value: SelectionId; label: string; desc: string; group: string }[] = [
  // Geographic markets
  { value: "global",       label: "Global",            desc: "Bred exponering mot hela världsmarknaden",   group: "Marknader" },
  { value: "sweden",       label: "Sverige",           desc: "Svenska börsen",                              group: "Marknader" },
  { value: "usa",          label: "USA",               desc: "Den amerikanska aktiemarknaden",              group: "Marknader" },
  { value: "europe",       label: "Europa",            desc: "Europeiska börser",                           group: "Marknader" },
  { value: "nordic",       label: "Norden",            desc: "Sverige, Norge, Danmark och Finland",         group: "Marknader" },
  { value: "emerging",     label: "Tillväxtmarknader", desc: "Snabbväxande ekonomier globalt",              group: "Marknader" },
  { value: "asia",         label: "Asien",             desc: "Bred asiatisk exponering",                    group: "Marknader" },
  { value: "japan",        label: "Japan",             desc: "Japanska aktiemarknaden",                     group: "Marknader" },
  { value: "china",        label: "Kina",              desc: "Kinesiska aktier och Hongkong",               group: "Marknader" },
  { value: "india",        label: "Indien",            desc: "En av världens snabbast växande ekonomier",   group: "Marknader" },
  { value: "latam",        label: "Latinamerika",      desc: "Brasilien, Mexico och övriga Latinamerika",   group: "Marknader" },
  // Sectors
  { value: "tech",         label: "Teknik",            desc: "IT, mjukvara, hårdvara och halvledare",      group: "Branscher" },
  { value: "health",       label: "Hälsovård",         desc: "Läkemedel, biotech och medicinteknik",       group: "Branscher" },
  { value: "real-estate",  label: "Fastigheter",       desc: "Fastighetsbolag och REIT",                   group: "Branscher" },
  { value: "energy",       label: "Energi",            desc: "Olja, gas och förnybar energi",              group: "Branscher" },
  { value: "finance",      label: "Finans",            desc: "Banker, försäkring och fintech",             group: "Branscher" },
  { value: "consumer",     label: "Konsumentvaror",    desc: "Detaljhandel och konsumtionsvaror",          group: "Branscher" },
  { value: "industry",     label: "Industri",          desc: "Tillverkningsindustri och infrastruktur",    group: "Branscher" },
  // Style
  { value: "growth",       label: "Tillväxtaktier",    desc: "Bolag med hög förväntad vinsttillväxt",      group: "Stil" },
  { value: "value",        label: "Värdeaktier",       desc: "Undervärderade bolag med stabila kassaflöden", group: "Stil" },
  { value: "smallcap",     label: "Småbolag",          desc: "Mindre bolag med högre tillväxtpotential",   group: "Stil" },
];

const MANAGEMENT_OPTIONS: { value: Management; label: string; desc: string }[] = [
  { value: "passive", label: "Indexfonder",          desc: "Lägst avgift, följer marknaden passivt" },
  { value: "mixed",   label: "Blandat",              desc: "Mix av passiva indexfonder och aktiva fonder" },
  { value: "active",  label: "Aktivt förvaltade",   desc: "Förvaltaren väljer aktivt vilka aktier som köps" },
];

const STEP_META: Record<Step, { title: string; subtitle: string }> = {
  platform:   { title: "Vilken plattform använder du?",                    subtitle: "Vi anpassar fondvalen till tillgängliga fonder" },
  goal:       { title: "Vad är ditt sparmål?",                             subtitle: "Målet påverkar hur vi balanserar risk och avkastning" },
  horizon:    { title: "Hur länge planerar du att spara?",                  subtitle: "Längre horisont ger utrymme för mer risk" },
  reaction:   { title: "Portföljen faller 20% — vad gör du?",              subtitle: "Din faktiska reaktion avslöjar din verkliga risktolerans" },
  selections: { title: "Vad vill du investera i?",                         subtitle: "Välj marknader, branscher och stilar — justera sedan viktningen längst ner" },
  management: { title: "Aktiv eller passiv förvaltning?",                  subtitle: "Indexfonder har generellt lägre avgifter och slår ofta aktiva fonder" },
  results:    { title: "Din föreslagna portfölj",                          subtitle: "" },
};

const EMPTY: Answers = { platform: null, goal: null, horizon: null, reaction: null, selections: null, priorities: null, management: null, equityOverride: null };

// ── Sub-components ────────────────────────────────────────────────────────────

function OptionCard({ label, desc, onClick }: {
  label: string; desc: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-3.5 rounded-xl border-2 text-left transition-all border-slate-100 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50"
    >
      <p className="text-sm font-semibold text-slate-800 hover:text-blue-700">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BuilderClient() {
  const router = useRouter();

  const [step, setStep]             = useState<Step>("platform");
  const [answers, setAnswers]       = useState<Answers>(EMPTY);
  const [pending, setPending]       = useState<SelectionId[]>([]);
  const [priorities, setPriorities] = useState<Record<string, number>>({});
  const [result, setResult]         = useState<BuildResult | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [direction, setDirection]   = useState(1);
  const [localEquity, setLocalEquity] = useState<number>(60);
  const [user, setUser]             = useState<User | null>(null);
  const [prefilled, setPrefilled]   = useState<Set<keyof Answers>>(new Set());
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [savingName, setSavingName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    const Q1_TO_HORIZON: Record<number, Horizon> = { 1: "short", 2: "short", 3: "medium", 4: "long", 5: "verylong" };
    const Q2_TO_REACTION: Record<number, Reaction> = { 1: "sell", 2: "sell", 3: "wait", 4: "buy", 5: "buy" };

    createClient().auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        try {
          const res = await fetch("/api/risk-profile");
          if (res.ok) {
            const profile = await res.json();
            if (profile?.q1 && profile?.q2) {
              const horizon  = Q1_TO_HORIZON[profile.q1];
              const reaction = Q2_TO_REACTION[profile.q2];
              if (horizon && reaction) {
                setAnswers((prev) => ({ ...prev, horizon, reaction }));
                setPrefilled(new Set(["horizon", "reaction"]));
              }
            }
          }
        } catch { /* ignore */ }
      }
    });

    // Restore quiz state saved before login redirect
    try {
      const saved = sessionStorage.getItem("fondanalys_builder_quiz");
      if (saved) {
        sessionStorage.removeItem("fondanalys_builder_quiz");
        const { answers: a, result: r, priorities: p, localEquity: le } = JSON.parse(saved);
        if (a) setAnswers(a);
        if (p) setPriorities(p);
        if (a?.selections) setPending(a.selections);
        if (r) { setResult(r); setLocalEquity(le ?? r.equityPct); setStep("results"); setShowSaveForm(true); }
      }
    } catch { /* ignore */ }
  }, []);

  const stepIdx    = STEPS.indexOf(step);
  const totalSteps = STEPS.length;
  const isResults  = step === "results";

  // Single-select steps advance immediately on click
  function pick<K extends keyof Omit<Answers, "selections" | "priorities" | "equityOverride">>(field: K, value: Answers[K]) {
    const next = { ...answers, [field]: value };
    setAnswers(next);
    setDirection(1);
    if (field === "management") {
      submit(next);
    } else {
      setStep(STEPS[STEPS.indexOf(step) + 1]);
    }
  }

  const TIER_LABELS: Record<number, string> = { 1: "Hög", 2: "Medel", 3: "Lägre" };

  function toggleSelection(id: SelectionId) {
    if (pending.includes(id)) {
      setPending((prev) => prev.filter((x) => x !== id));
      setPriorities((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } else {
      setPending((prev) => [...prev, id]);
      setPriorities((prev) => ({ ...prev, [id]: 2 }));
    }
  }

  function adjustPriority(id: SelectionId, delta: number) {
    const maxTier = Math.min(3, pending.length);
    setPriorities((prev) => ({
      ...prev,
      [id]: Math.max(1, Math.min(maxTier, (prev[id] ?? 1) + delta)),
    }));
  }

  // Confirm multi-select and advance
  function confirmSelections() {
    if (!pending.length) return;
    const next = { ...answers, selections: pending, priorities };
    setAnswers(next);
    setDirection(1);
    setStep("management");
  }

  async function submit(next: Answers) {
    setStep("results");
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/build-portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Okänt fel");
      setResult(data);
      setLocalEquity(data.equityPct);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setDirection(-1);
    if (isResults) { setStep("management"); return; }
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  function restart() {
    setDirection(-1);
    setStep("platform");
    setAnswers(EMPTY);
    setPending([]);
    setPriorities({});
    setResult(null);
    setError(null);
  }

  async function handleSave() {
    if (!savingName.trim() || !result || !answers.platform) return;
    setSaveStatus("saving");
    try {
      const custodian = answers.platform === "avanza" ? "avanza" : answers.platform === "nordnet" ? "nordnet" : "övrigt";
      const holdings  = result.portfolio.map((f) => ({ isin: f.isin, name: f.name, weight: f.weight }));
      const validEntries = result.portfolio.map((f) => ({ isin: f.isin, weight: f.weight }));
      const analysisRes  = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custodian, entries: validEntries }),
      });
      const analysis = await analysisRes.json();
      const saveRes  = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: savingName.trim(), custodian, holdings, analysis }),
      });
      if (!saveRes.ok) throw new Error();
      setSaveStatus("saved");
      setShowSaveForm(false);
      setSavingName("");
    } catch {
      setSaveStatus("error");
    }
  }

  function sendToAnalyze() {
    if (!result) return;
    const entries = result.portfolio.map((f) => ({
      isin:   f.isin,
      name:   f.name,
      weight: String(f.weight),
      amount: "",
    }));
    const custodian = answers.platform === "avanza" ? "avanza" : answers.platform === "nordnet" ? "nordnet" : "övrigt";
    try { sessionStorage.setItem("fondanalys_builder", JSON.stringify({ custodian, entries })); } catch { /* ignore */ }
    router.push("/analyze");
  }

  const variants = {
    enter:  (d: number) => ({ x: d * 40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d * -40, opacity: 0 }),
  };

  const meta = STEP_META[step];

  // Group selection options by group label
  const selectionGroups = SELECTION_OPTIONS.reduce<Record<string, typeof SELECTION_OPTIONS>>((acc, o) => {
    if (!acc[o.group]) acc[o.group] = [];
    acc[o.group].push(o);
    return acc;
  }, {});

  return (
    <div className={`${step === "selections" ? "max-w-2xl" : "max-w-lg"} mx-auto px-4 py-10 sm:py-16 transition-all duration-200`}>

      {/* Page header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Bygg din portfölj</h1>
        <p className="text-slate-500 mt-2 text-sm">
          Svara på {totalSteps} frågor — vi föreslår en komplett portfölj
        </p>
      </div>

      {/* Progress bar */}
      {!isResults && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Fråga {stepIdx + 1} av {totalSteps}</span>
            <span>{Math.round(((stepIdx + 1) / totalSteps) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
              animate={{ width: `${((stepIdx + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Step card */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          {!isResults && (
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <p className="text-base font-bold text-slate-900">{meta.title}</p>
              {meta.subtitle && <p className="text-xs text-slate-400 mt-0.5">{meta.subtitle}</p>}
            </div>
          )}

          <div className="p-5 space-y-2">

            {/* Platform */}
            {step === "platform" && PLATFORM_OPTIONS.map((o) => (
              <OptionCard key={o.value} label={o.label} desc={o.desc} onClick={() => pick("platform", o.value)} />
            ))}

            {/* Goal */}
            {step === "goal" && GOAL_OPTIONS.map((o) => (
              <OptionCard key={o.value} label={o.label} desc={o.desc} onClick={() => pick("goal", o.value)} />
            ))}

            {/* Horizon */}
            {step === "horizon" && (
              <>
                {prefilled.has("horizon") && answers.horizon && (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-1">
                    <p className="text-xs text-blue-700 font-medium">Förifylld från din riskprofil</p>
                    <button
                      type="button"
                      onClick={() => pick("horizon", answers.horizon!)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Bekräfta →
                    </button>
                  </div>
                )}
                {HORIZON_OPTIONS.map((o) => {
                  const isPreSelected = prefilled.has("horizon") && answers.horizon === o.value;
                  return isPreSelected ? (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => pick("horizon", o.value)}
                      className="w-full px-4 py-3.5 rounded-xl border-2 text-left transition-all border-blue-500 bg-blue-50"
                    >
                      <p className="text-sm font-semibold text-blue-700">{o.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{o.desc}</p>
                    </button>
                  ) : (
                    <OptionCard key={o.value} label={o.label} desc={o.desc} onClick={() => pick("horizon", o.value)} />
                  );
                })}
              </>
            )}

            {/* Reaction */}
            {step === "reaction" && (
              <>
                {prefilled.has("reaction") && answers.reaction && (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-1">
                    <p className="text-xs text-blue-700 font-medium">Förifylld från din riskprofil</p>
                    <button
                      type="button"
                      onClick={() => pick("reaction", answers.reaction!)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Bekräfta →
                    </button>
                  </div>
                )}
                {REACTION_OPTIONS.map((o) => {
                  const isPreSelected = prefilled.has("reaction") && answers.reaction === o.value;
                  return isPreSelected ? (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => pick("reaction", o.value)}
                      className="w-full px-4 py-3.5 rounded-xl border-2 text-left transition-all border-blue-500 bg-blue-50"
                    >
                      <p className="text-sm font-semibold text-blue-700">{o.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{o.desc}</p>
                    </button>
                  ) : (
                    <OptionCard key={o.value} label={o.label} desc={o.desc} onClick={() => pick("reaction", o.value)} />
                  );
                })}
              </>
            )}

            {/* Selections — two-column layout */}
            {step === "selections" && (
              <>
                <div className="grid grid-cols-2 gap-4 items-start">

                  {/* Left: option groups */}
                  <div className="space-y-3">
                    {Object.entries(selectionGroups).map(([group, opts]) => (
                      <div key={group} className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group}</p>
                        {opts.map((o) => {
                          const selected = pending.includes(o.value);
                          return (
                            <button
                              key={o.value}
                              type="button"
                              onClick={() => toggleSelection(o.value)}
                              className={`w-full px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                                selected
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-slate-100 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50"
                              }`}
                            >
                              <p className={`text-xs font-semibold leading-snug ${selected ? "text-blue-700" : "text-slate-800"}`}>{o.label}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{o.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Right: priority panel — stays at top */}
                  <div className="sticky top-4 space-y-2">
                    <div className="mb-2">
                      <p className="text-sm font-semibold text-slate-800">Vikta dina val</p>
                      <p className="text-xs text-slate-400 mt-0.5">Hög prioritet får störst andel</p>
                    </div>

                    {pending.length === 0 ? (
                      <div className="flex items-center justify-center h-24 rounded-xl border-2 border-dashed border-slate-100">
                        <p className="text-xs text-slate-300">Välj alternativ till vänster</p>
                      </div>
                    ) : (
                      pending.map((id) => {
                        const opt  = SELECTION_OPTIONS.find((o) => o.value === id)!;
                        const prio = priorities[id] ?? 2;
                        return (
                          <div key={id} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <p className="text-xs font-semibold text-slate-700 truncate mb-1.5">{opt.label}</p>
                            {pending.length > 1 ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => adjustPriority(id, 1)}
                                  disabled={prio >= 3}
                                  className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-500 text-xs font-bold disabled:opacity-25 flex items-center justify-center hover:border-slate-300 transition-colors"
                                >−</button>
                                <span className="text-[10px] font-semibold text-slate-600 flex-1 text-center">
                                  {TIER_LABELS[prio]}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => adjustPriority(id, -1)}
                                  disabled={prio <= 1}
                                  className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-500 text-xs font-bold disabled:opacity-25 flex items-center justify-center hover:border-slate-300 transition-colors"
                                >+</button>
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400">Enda valet — full vikt</p>
                            )}
                          </div>
                        );
                      })
                    )}

                    {pending.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { setPending([]); setPriorities({}); }}
                        className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        Rensa alla
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">{pending.length > 0 ? `${pending.length} valda` : "Inga valda"}</span>
                  <button
                    type="button"
                    onClick={confirmSelections}
                    disabled={pending.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
                  >
                    Fortsätt {pending.length > 0 && `(${pending.length})`}
                  </button>
                </div>
              </>
            )}

            {/* Management */}
            {step === "management" && MANAGEMENT_OPTIONS.map((o) => (
              <OptionCard key={o.value} label={o.label} desc={o.desc} onClick={() => pick("management", o.value)} />
            ))}

            {/* Results */}
            {isResults && (
              <>
                {loading && (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">Bygger din portfölj…</p>
                  </div>
                )}

                {error && (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-sm text-red-600">{error}</p>
                    <button onClick={() => submit(answers)} className="text-xs text-blue-600 underline">
                      Försök igen
                    </button>
                  </div>
                )}

                {!loading && !error && result && (
                  <div className="space-y-4">
                    <div className="px-1">
                      <p className="text-base font-bold text-slate-900">{meta.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-semibold">
                          {result.riskLabel}
                        </span>
                        <span className="text-xs text-slate-400">{result.equityPct}% aktier</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {result.portfolio.map((f) => (
                        <div key={f.isin} className="flex items-center gap-3 border border-slate-100 rounded-xl px-4 py-3 bg-slate-50">
                          <div className="w-11 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-indigo-600">{f.weight}%</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{f.name}</p>
                            <p className="text-xs text-slate-400">{f.rationale}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Equity/bond split adjuster */}
                    <div className="border border-slate-100 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Justera fördelning</p>
                        {localEquity !== result.equityPct && (
                          <button
                            onClick={() => submit({ ...answers, equityOverride: localEquity })}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            Generera om →
                          </button>
                        )}
                      </div>

                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={10}
                        value={localEquity}
                        onChange={(e) => setLocalEquity(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />

                      {localEquity !== result.equityPct ? (
                        <p className="text-xs text-blue-600 text-center font-medium">
                          {localEquity}% aktier / {100 - localEquity}% räntor — klicka "Generera om" för att uppdatera
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 text-center">
                          Nuvarande fördelning: {result.equityPct}% aktier / {100 - result.equityPct}% räntor
                        </p>
                      )}
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <p className="text-sm text-blue-800 leading-relaxed">{result.summary}</p>
                    </div>

                    {result.reasoning?.length > 0 && (
                      <div className="border border-slate-100 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Så här tänkte vi</p>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {result.reasoning.map((line, i) => (
                            <p key={i} className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{line}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Analyze CTA */}
                    <button
                      onClick={sendToAnalyze}
                      className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl py-2.5 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all"
                    >
                      Vill du se nyckeltalen? Analysera portföljen
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Save section */}
                    <div className="border border-slate-100 rounded-xl p-4 space-y-3">
                      {saveStatus === "saved" ? (
                        <p className="text-sm text-green-700 font-medium text-center">Portföljen sparad ✓</p>
                      ) : !user ? (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Spara portföljen?</p>
                            <p className="text-xs text-slate-400 mt-0.5">Logga in för att komma åt den när som helst.</p>
                          </div>
                          <button
                            onClick={() => {
                              try {
                                sessionStorage.setItem("fondanalys_builder_quiz", JSON.stringify({ answers, result, priorities, localEquity }));
                              } catch { /* ignore */ }
                              router.push("/login?next=/bygg-portfolj");
                            }}
                            className="shrink-0 bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                          >
                            Logga in
                          </button>
                        </div>
                      ) : !showSaveForm ? (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Spara portföljen?</p>
                            <p className="text-xs text-slate-400 mt-0.5">Kom åt den när som helst från Mitt konto.</p>
                          </div>
                          <button
                            onClick={() => setShowSaveForm(true)}
                            className="shrink-0 bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                          >
                            Spara
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            autoFocus
                            type="text"
                            placeholder="t.ex. ISK, Pension, Barnspar…"
                            value={savingName}
                            onChange={(e) => setSavingName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSave()}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSave}
                              disabled={!savingName.trim() || saveStatus === "saving"}
                              className="bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                            >
                              {saveStatus === "saving" ? "Sparar…" : "Spara"}
                            </button>
                            <button
                              onClick={() => { setShowSaveForm(false); setSavingName(""); setSaveStatus("idle"); }}
                              className="text-sm text-slate-400 hover:text-slate-600 px-3 py-2 transition-colors"
                            >
                              Avbryt
                            </button>
                            {saveStatus === "error" && (
                              <p className="text-xs text-red-500 self-center">Kunde inte spara</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={restart}
                      className="w-full flex items-center justify-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 py-1 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Börja om
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Back button */}
      {step !== "platform" && (
        <button onClick={goBack} className="mt-4 text-xs text-slate-400 hover:text-slate-600 transition-colors">
          ← Tillbaka
        </button>
      )}
    </div>
  );
}
