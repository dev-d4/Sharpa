"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { RISK_LABELS, type RiskLevel } from "@/lib/risk";
import type { User } from "@supabase/supabase-js";
import DonutChart from "@/components/ui/DonutChart";
import { CHART_PALETTE } from "@/lib/chart-palette";

// ── Types ────────────────────────────────────────────────────────────────────

type Platform   = "avanza" | "nordnet" | "both";
type Horizon    = "short" | "medium" | "long" | "verylong";
type Reaction   = "sell" | "wait" | "buy";
type Management = "passive" | "mixed" | "active";
type Step       = "platform" | "horizon" | "reaction" | "q3" | "q4" | "selections" | "management" | "results";

export type SelectionId =
  | "global" | "sweden" | "usa" | "europe" | "nordic" | "emerging" | "asia"
  | "japan" | "china" | "india" | "latam"
  | "tech" | "health" | "real-estate" | "energy" | "finance" | "consumer" | "industry"
  | "growth" | "value" | "smallcap"
  | "bond-sek" | "bond-global" | "bond-highyield";

type Answers = {
  platform:      Platform    | null;
  horizon:       Horizon     | null;
  reaction:      Reaction    | null;
  q3:            number      | null;   // 1–5: Hur viktig är investeringen?
  q4:            number      | null;   // 1–5: Vad är viktigast?
  selections:    SelectionId[] | null;
  priorities:    Record<string, number> | null;
  management:    Management  | null;
  equityOverride: number | null;
};

type CandidateFund = {
  isin:         string;
  name:         string;
  category:     string;
  ongoing_cost: number | null;
  sharpe_3yr:   number | null;
};

type PortfolioFund = {
  isin:         string;
  name:         string;
  weight:       number;
  category:     string;
  rationale:    string;
  ongoing_cost: number | null;
  sharpe_3yr:   number | null;
  candidates:   CandidateFund[];
};

type FundExplanation = {
  name:          string;
  weight:        number;
  rationale:     string;
  sharpe:        number | null;
  cost:          number | null;
  poolSize:      number;
  avgPoolSharpe: number | null;
  avgPoolCost:   number | null;
};

type BuildResult = {
  portfolio:         PortfolioFund[];
  riskScore:         number;
  riskLabel:         string;
  equityPct:         number;
  summary:           string;
  reasoning:         string[];
  droppedSelections: string[];
  fundExplanations:  FundExplanation[];
};

// ── Option data ───────────────────────────────────────────────────────────────

const STEPS: Step[] = ["horizon", "reaction", "q3", "q4", "selections", "management", "platform"];

const PLATFORM_OPTIONS: { value: Platform; label: string; desc: string }[] = [
  { value: "avanza",  label: "Avanza",  desc: "Jag handlar fonder via Avanza" },
  { value: "nordnet", label: "Nordnet", desc: "Jag handlar fonder via Nordnet" },
  { value: "both",    label: "Övrigt", desc: "Jag använder flera plattformar" },
];

const Q3_OPTIONS: { value: number; label: string; desc: string }[] = [
  { value: 1, label: "Kan inte förlora något",  desc: "Det är kritiskt att skydda allt kapital" },
  { value: 2, label: "Kan förlora lite",          desc: "En liten förlust är acceptabel" },
  { value: 3, label: "Accepterar viss förlust",  desc: "Jag tål tillfälliga nedgångar" },
  { value: 4, label: "Accepterar stor förlust",  desc: "Jag tål stora svängningar för bättre avkastning" },
  { value: 5, label: "Spelar ingen roll",         desc: "Jag fokuserar helt på långsiktig avkastning" },
];

const Q4_OPTIONS: { value: number; label: string; desc: string }[] = [
  { value: 1, label: "Minimera risk",           desc: "Trygghet är viktigast, avkastning är sekundär" },
  { value: 2, label: "Låg risk",                desc: "Föredrar stabilitet med viss tillväxtpotential" },
  { value: 3, label: "Balans risk/avkastning",  desc: "Jag vill ha balans mellan trygghet och tillväxt" },
  { value: 4, label: "Hög avkastning",          desc: "Avkastning prioriteras, jag accepterar mer risk" },
  { value: 5, label: "Maximera avkastning",     desc: "Jag tar maximal risk för maximal avkastning" },
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
  { value: "growth",        label: "Tillväxtaktier",    desc: "Bolag med hög förväntad vinsttillväxt",        group: "Stil" },
  { value: "value",         label: "Värdeaktier",       desc: "Undervärderade bolag med stabila kassaflöden", group: "Stil" },
  { value: "smallcap",      label: "Småbolag",          desc: "Mindre bolag med högre tillväxtpotential",     group: "Stil" },
  // Bonds
  { value: "bond-sek",      label: "Svenska räntor",    desc: "SEK-obligationer — lägst valutarisk",          group: "Räntor" },
  { value: "bond-global",   label: "Globala räntor",    desc: "Euro- och globala obligationer",               group: "Räntor" },
  { value: "bond-highyield",label: "High yield",         desc: "Högrisk-obligationer med högre avkastning",   group: "Räntor" },
];

const MANAGEMENT_OPTIONS: { value: Management; label: string; desc: string }[] = [
  { value: "passive", label: "Indexfonder",          desc: "Lägst avgift, följer marknaden passivt" },
  { value: "mixed",   label: "Blandat",              desc: "Mix av passiva indexfonder och aktiva fonder" },
  { value: "active",  label: "Aktivt förvaltade",   desc: "Förvaltaren väljer aktivt vilka aktier som köps" },
];


const STEP_META: Record<Step, { title: string; subtitle: string }> = {
  platform:   { title: "Sista steget — var handlar du fonder?",             subtitle: "Vi anpassar fondvalen till tillgängliga fonder på din plattform" },
  horizon:    { title: "Hur länge planerar du att spara?",                   subtitle: "Längre horisont ger utrymme för mer risk" },
  reaction:   { title: "Portföljen faller 20% — vad gör du?",               subtitle: "Din faktiska reaktion avslöjar din verkliga risktolerans" },
  q3:         { title: "Hur viktig är den här investeringen för dig?",       subtitle: "Tänk på konsekvenserna om du förlorar en stor del av kapitalet" },
  q4:         { title: "Vad är viktigast för dig?",                          subtitle: "Välj det alternativ som bäst speglar din inställning till risk och avkastning" },
  selections: { title: "Vad vill du investera i?",                          subtitle: "Välj marknader, branscher och stilar — justera sedan viktningen längst ner" },
  management: { title: "Aktiv eller passiv förvaltning?",                   subtitle: "Indexfonder har generellt lägre avgifter och slår ofta aktiva fonder" },
  results:    { title: "Din föreslagna portfölj",                           subtitle: "" },
};

const EMPTY: Answers = { platform: null, horizon: null, reaction: null, q3: null, q4: null, selections: null, priorities: null, management: null, equityOverride: null };

// ── Auto-suggestion ───────────────────────────────────────────────────────────

function computeRiskScoreClient(a: Answers): number {
  const q1Map: Record<string, number> = { short: 2, medium: 3, long: 4, verylong: 5 };
  const q2Map: Record<string, number> = { sell: 1, wait: 3, buy: 5 };
  const v1 = (a.horizon  && q1Map[a.horizon])  ? q1Map[a.horizon]  : 3;
  const v2 = (a.reaction && q2Map[a.reaction]) ? q2Map[a.reaction] : 3;
  const v3 = a.q3 ?? 3;
  const v4 = a.q4 ?? 3;
  return Math.max(1, Math.min(5, Math.round((v1 + v2 + v3 + v4) / 4)));
}

const AUTO_EXPLANATION: Record<number, string> = {
  1: "Din försiktiga profil ger tyngd mot räntor med en liten kärna av globala aktier för viss tillväxtpotential.",
  2: "Din defensiva profil ger en övervikt mot räntor kombinerat med globala och svenska aktier som kärna.",
  3: "Balanserad portfölj med lika delar aktier och räntor — global aktieexponering som kärna, svenska aktier för hemmamarknad och räntedel som buffert.",
  4: "Din tillväxtprofil ger en aktiestark portfölj med global spridning, USA och Sverige som tyngdpunkt samt tillväxtmarknader för extra potential.",
  5: "Offensiv portfölj helst i aktier — bred global och amerikansk exponering med teknik och tillväxtmarknader för maximal tillväxtpotential.",
};

const AUTO_SELECTIONS: Record<number, { sels: SelectionId[]; prios: Record<string, number> }> = {
  1: { sels: ["bond-sek", "bond-global", "global"],
       prios: { "bond-sek": 1, "bond-global": 1, global: 2 } },
  2: { sels: ["global", "bond-sek", "bond-global", "sweden"],
       prios: { global: 1, "bond-sek": 1, "bond-global": 2, sweden: 2 } },
  3: { sels: ["global", "sweden", "europe", "bond-sek"],
       prios: { global: 1, sweden: 2, europe: 2, "bond-sek": 2 } },
  4: { sels: ["global", "usa", "sweden", "europe", "emerging"],
       prios: { global: 1, usa: 1, sweden: 2, europe: 2, emerging: 3 } },
  5: { sels: ["global", "usa", "sweden", "tech", "emerging", "europe"],
       prios: { global: 1, usa: 1, sweden: 2, tech: 2, emerging: 2, europe: 3 } },
};

const RATIONALE_SHORT: Record<string, string> = {
  "Global aktieexponering":                    "Global",
  "Exponering mot svenska marknaden":           "Sverige",
  "Exponering mot den amerikanska marknaden":   "USA",
  "Europeisk aktieexponering":                  "Europa",
  "Nordisk aktieexponering":                    "Norden",
  "Exponering mot tillväxtmarknader":           "Tillväxt",
  "Asiatisk aktieexponering":                   "Asien",
  "Japansk aktieexponering":                    "Japan",
  "Kinesisk aktieexponering":                   "Kina",
  "Indisk aktieexponering":                     "Indien",
  "Latinamerikansk aktieexponering":            "Latinamerika",
  "Teknik- och IT-sektor":                      "Teknik",
  "Hälsovård och läkemedel":                    "Hälsovård",
  "Fastighetssektor":                           "Fastigheter",
  "Energi och råvaror":                         "Energi",
  "Finans- och banksektorn":                    "Finans",
  "Konsumentvaror och detaljhandel":            "Konsument",
  "Industri och tillverkning":                  "Industri",
  "Tillväxtbolag":                              "Tillväxt",
  "Värdeaktier":                                "Värde",
  "Småbolag":                                   "Småbolag",
  "Svenska räntor":                             "Sv. räntor",
  "Globala räntor":                             "Gl. räntor",
  "High yield-räntor":                          "High yield",
  "Stabiliserar portföljen":                    "Räntor",
  "Lägre risk och volatilitet":                 "Räntor",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function OptionCard({ label, desc, onClick }: {
  label: string; desc: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-4 rounded-[10px] border text-left transition-colors border-line bg-white hover:border-accent"
    >
      <p className="text-[15px] font-semibold text-slate-800">{label}</p>
      <p className="text-sm text-slate-400 mt-0.5">{desc}</p>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BuilderClient() {
  const router = useRouter();

  const [step, setStep]             = useState<Step>("horizon");
  const [answers, setAnswers]       = useState<Answers>(EMPTY);
  const [pending, setPending]       = useState<SelectionId[]>([]);
  const [priorities, setPriorities] = useState<Record<string, number>>({});
  const [result, setResult]         = useState<BuildResult | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [direction, setDirection]   = useState(1);
  const [localEquity, setLocalEquity] = useState<number>(60);
  const [slotIndices, setSlotIndices]         = useState<number[]>([]);
  const [expandedFunds, setExpandedFunds]     = useState<Set<number>>(new Set());
  const [showAdvanced, setShowAdvanced]       = useState(false);
  const [autoExplanation, setAutoExplanation] = useState<string | null>(null);
  const [showManualSelections, setShowManualSelections] = useState(false);
  const [user, setUser]             = useState<User | null>(null);
  const [prefilled, setPrefilled]   = useState<Set<keyof Answers>>(new Set());
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [savingName, setSavingName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [authModal, setAuthModal]   = useState(false);
  const [authEmail, setAuthEmail]   = useState("");
  const [authSent, setAuthSent]     = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]   = useState<string | null>(null);

  useEffect(() => {
    const Q1_TO_HORIZON: Record<number, Horizon> = { 1: "short", 2: "short", 3: "medium", 4: "long", 5: "verylong" };
    const Q2_TO_REACTION: Record<number, Reaction> = { 1: "sell", 2: "sell", 3: "wait", 4: "buy", 5: "buy" };

    // Restore quiz state saved before login redirect — apply immediately for instant UI
    let savedAnswers: Answers | null = null;
    let savedRiskScore: number | null = null;
    try {
      const saved = sessionStorage.getItem("fondanalys_builder_quiz");
      if (saved) {
        sessionStorage.removeItem("fondanalys_builder_quiz");
        const { answers: a, result: r, priorities: p, localEquity: le } = JSON.parse(saved);
        if (a) { setAnswers(a); savedAnswers = a; }
        if (p) setPriorities(p);
        if (a?.selections) setPending(a.selections);
        if (r) {
          setResult(r);
          setLocalEquity(le ?? r.equityPct);
          setStep("results");
          setShowSaveForm(true);
          savedRiskScore = r.riskScore ?? null;
        }
      }
    } catch { /* ignore */ }

    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        try {
          const res = await fetch("/api/risk-profile");
          if (res.ok) {
            const profile = await res.json();
            // Only prefill from risk profile if no saved quiz state
            if (!savedAnswers && profile?.q1 && profile?.q2) {
              const horizon  = Q1_TO_HORIZON[profile.q1];
              const reaction = Q2_TO_REACTION[profile.q2];
              const q3 = profile.q3 ?? null;
              const q4 = profile.q4 ?? null;
              if (horizon && reaction) {
                setAnswers((prev) => ({ ...prev, horizon, reaction, q3, q4 }));
                const prefilledKeys: (keyof Answers)[] = ["horizon", "reaction"];
                if (q3) prefilledKeys.push("q3");
                if (q4) prefilledKeys.push("q4");
                setPrefilled(new Set(prefilledKeys));
              }
            }
            // If the saved result used a different risk score than what we'd now compute,
            // regenerate so the portfolio reflects the current formula output.
            if (savedAnswers && savedRiskScore !== null) {
              const recomputedScore = computeRiskScoreClient(savedAnswers);
              if (recomputedScore !== savedRiskScore) submit(savedAnswers, true);
            }
          }
        } catch { /* ignore */ }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") {
        setStep("platform");
        setAnswers(EMPTY);
        setPending([]);
        setPriorities({});
        setResult(null);
        setError(null);
        setShowSaveForm(false);
        setSavingName("");
        setSaveStatus("idle");
      }
    });

    const handlePageShow = (e: PageTransitionEvent) => { if (e.persisted) resetQuiz(); };
    window.addEventListener("pageshow", handlePageShow);

    const handlePopState = () => {
      if (window.location.pathname === "/bygg-portfolj") resetQuiz();
    };
    window.addEventListener("popstate", handlePopState);

    // Next.js App Router caches components in memory between navigations — popstate and
    // pageshow don't fire for client-side Link navigation. Patch pushState to detect
    // when the user navigates back to this page so we can reset stale quiz state.
    const prevPath = { current: window.location.pathname };
    const origPush = history.pushState.bind(history);
    history.pushState = function(...args: Parameters<typeof history.pushState>) {
      origPush(...args);
      const newPath = window.location.pathname;
      if (newPath === "/bygg-portfolj" && prevPath.current !== "/bygg-portfolj") {
        resetQuiz();
      }
      prevPath.current = newPath;
    };

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
      history.pushState = origPush;
    };
  }, []);

  function openAuthModal() {
    try { sessionStorage.setItem("fondanalys_builder_quiz", JSON.stringify({ answers, result, priorities, localEquity })); } catch { /* ignore */ }
    setAuthModal(true);
  }

  async function handleAuthGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent("/bygg-portfolj")}`,
        queryParams: { prompt: "select_account" },
      },
    });
  }

  async function handleAuthMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent("/bygg-portfolj")}` },
    });
    if (error) setAuthError(error.message);
    else setAuthSent(true);
    setAuthLoading(false);
  }

  // Auto-apply selections when entering that step (if not already set)
  useEffect(() => {
    if (step === "selections" && pending.length === 0) {
      const score = computeRiskScoreClient(answers);
      const { sels, prios } = AUTO_SELECTIONS[score];
      setPending(sels);
      setPriorities(prios);
      setAutoExplanation(AUTO_EXPLANATION[score]);
      setShowManualSelections(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const stepIdx    = STEPS.indexOf(step);
  const totalSteps = STEPS.length;
  const isResults  = step === "results";

  // Single-select steps advance immediately on click
  function pick<K extends keyof Omit<Answers, "selections" | "priorities" | "equityOverride">>(field: K, value: Answers[K]) {
    const next = { ...answers, [field]: value };
    setAnswers(next);
    setDirection(1);
    if (field === "platform") {
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

  async function submit(next: Answers, loggedIn?: boolean) {
    setStep("results");
    setLoading(true);
    setShowSaveForm(false);
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
      setSlotIndices(data.portfolio.map(() => 0));
      setShowSaveForm(loggedIn ?? user !== null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setDirection(-1);
    if (isResults) { setStep("platform"); return; }
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

  function activePortfolio() {
    if (!result) return [];
    return result.portfolio.map((slot, si) => {
      const c = slot.candidates?.[slotIndices[si] ?? 0] ?? slot;
      return { ...slot, isin: c.isin, name: c.name };
    });
  }

  async function handleSave() {
    if (!savingName.trim() || !result || !answers.platform) return;
    setSaveStatus("saving");
    try {
      const custodian = answers.platform === "avanza" ? "avanza" : answers.platform === "nordnet" ? "nordnet" : "övrigt";
      const active    = activePortfolio();
      const holdings  = active.map((f) => ({ isin: f.isin, name: f.name, weight: f.weight }));
      const validEntries = active.map((f) => ({ isin: f.isin, weight: f.weight }));
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

  function resetQuiz() {
    setStep("horizon");
    setAnswers(EMPTY);
    setPending([]);
    setPriorities({});
    setResult(null);
    setError(null);
    setDirection(1);
    setLocalEquity(60);
    setSlotIndices([]);
    setExpandedFunds(new Set());
    setShowAdvanced(false);
    setAutoExplanation(null);
    setShowManualSelections(false);
    setShowSaveForm(false);
    setSavingName("");
    setSaveStatus("idle");
  }

  function sendToAnalyze() {
    if (!result) return;
    const entries = activePortfolio().map((f) => ({
      isin:   f.isin,
      name:   f.name,
      weight: String(f.weight),
      amount: "",
    }));
    const custodian = answers.platform === "avanza" ? "avanza" : answers.platform === "nordnet" ? "nordnet" : "övrigt";
    try { sessionStorage.setItem("fondanalys_builder", JSON.stringify({ custodian, entries })); } catch { /* ignore */ }
    resetQuiz();
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

  // Live preview panel data
  const previewRiskScore = computeRiskScoreClient(answers);
  const previewEquity = previewRiskScore === 1 ? 20 : previewRiskScore === 2 ? 35 : previewRiskScore === 3 ? 55 : previewRiskScore === 4 ? 75 : 100;
  const showPreview = !isResults && stepIdx >= 1;

  return (
    <div className={`${isResults ? "max-w-4xl" : step === "selections" ? "max-w-3xl" : showPreview ? "max-w-3xl" : "max-w-lg"} mx-auto px-4 py-10 sm:py-16 transition-all duration-200`}>

      {/* Page header */}
      <div className="text-center mb-8">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900">Bygg din portfölj</h1>
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
              className="h-full bg-accent rounded-full"
              animate={{ width: `${((stepIdx + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Layout: quiz card + live preview panel */}
      <div className={showPreview ? "lg:grid lg:grid-cols-[1fr_210px] lg:gap-5 lg:items-start" : ""}>
      <div>

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
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
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
                      className="w-full px-4 py-3.5 rounded-[10px] border text-left transition-colors border-accent bg-info"
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
                      className="w-full px-4 py-3.5 rounded-[10px] border text-left transition-colors border-accent bg-info"
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

            {/* Q3 — how important is the investment */}
            {step === "q3" && (
              <>
                {prefilled.has("q3") && answers.q3 !== null && (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-1">
                    <p className="text-xs text-blue-700 font-medium">Förifylld från din riskprofil</p>
                    <button
                      type="button"
                      onClick={() => pick("q3", answers.q3!)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Bekräfta →
                    </button>
                  </div>
                )}
                {Q3_OPTIONS.map((o) => {
                  const isPreSelected = prefilled.has("q3") && answers.q3 === o.value;
                  return isPreSelected ? (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => pick("q3", o.value)}
                      className="w-full px-4 py-3.5 rounded-[10px] border text-left transition-colors border-accent bg-info"
                    >
                      <p className="text-sm font-semibold text-blue-700">{o.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{o.desc}</p>
                    </button>
                  ) : (
                    <OptionCard key={o.value} label={o.label} desc={o.desc} onClick={() => pick("q3", o.value)} />
                  );
                })}
              </>
            )}

            {/* Q4 — risk vs return priority */}
            {step === "q4" && (
              <>
                {prefilled.has("q4") && answers.q4 !== null && (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-1">
                    <p className="text-xs text-blue-700 font-medium">Förifylld från din riskprofil</p>
                    <button
                      type="button"
                      onClick={() => pick("q4", answers.q4!)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Bekräfta →
                    </button>
                  </div>
                )}
                {Q4_OPTIONS.map((o) => {
                  const isPreSelected = prefilled.has("q4") && answers.q4 === o.value;
                  return isPreSelected ? (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => pick("q4", o.value)}
                      className="w-full px-4 py-3.5 rounded-[10px] border text-left transition-colors border-accent bg-info"
                    >
                      <p className="text-sm font-semibold text-blue-700">{o.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{o.desc}</p>
                    </button>
                  ) : (
                    <OptionCard key={o.value} label={o.label} desc={o.desc} onClick={() => pick("q4", o.value)} />
                  );
                })}
              </>
            )}

            {/* Selections — auto-suggested by default */}
            {step === "selections" && (
              <>
                {/* Auto-suggestion explanation */}
                {autoExplanation && !showManualSelections && (
                  <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-1">
                    <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <p className="text-xs text-blue-700 leading-relaxed">{autoExplanation}</p>
                  </div>
                )}

                {/* Auto-selected chips — shown when not in manual mode */}
                {!showManualSelections && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Föreslagna kategorier</p>
                    <div className="flex flex-wrap gap-2">
                      {pending.map((id) => {
                        const opt = SELECTION_OPTIONS.find((o) => o.value === id)!;
                        const prio = priorities[id] ?? 2;
                        return (
                          <div key={id} className="flex items-center gap-1.5 bg-info border border-info-line rounded-lg pl-3 pr-2 py-1.5">
                            <span className="text-xs font-semibold text-blue-700">{opt.label}</span>
                            <span className="text-[10px] text-blue-400">· {TIER_LABELS[prio]}</span>
                            <button type="button" onClick={() => toggleSelection(id)} className="w-4 h-4 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-500 flex items-center justify-center transition-colors shrink-0">
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowManualSelections(true)}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2 pt-1"
                    >
                      Anpassa manuellt
                    </button>
                  </div>
                )}

                {/* Manual mode */}
                {showManualSelections && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowManualSelections(false)}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors mb-1"
                    >
                      ← Tillbaka till föreslagen mix
                    </button>

                    <div className="flex flex-col sm:grid sm:grid-cols-2 sm:gap-4 sm:items-start gap-0">
                      <div className="space-y-3">
                        {Object.entries(selectionGroups).map(([group, opts]) => {
                          const isAdvanced = group !== "Marknader";
                          if (isAdvanced && !showAdvanced) return null;
                          return (
                            <div key={group} className="space-y-1.5">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group}</p>
                              {opts.map((o) => {
                                const selected = pending.includes(o.value);
                                return (
                                  <button
                                    key={o.value}
                                    type="button"
                                    onClick={() => toggleSelection(o.value)}
                                    className={`w-full px-4 py-3 rounded-[10px] border text-left transition-colors ${
                                      selected
                                        ? "border-accent bg-info"
                                        : "border-line bg-white hover:border-accent"
                                    }`}
                                  >
                                    <p className={`text-sm font-semibold leading-snug ${selected ? "text-blue-700" : "text-slate-800"}`}>{o.label}</p>
                                    <p className="text-xs text-slate-400 mt-0.5 leading-tight">{o.desc}</p>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setShowAdvanced((v) => !v)}
                          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 border border-dashed border-slate-200 rounded-xl py-3 transition-colors"
                        >
                          <svg className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                          {showAdvanced ? "Dölj avancerade val" : "Branscher, stil & räntor"}
                        </button>
                      </div>

                      {pending.length > 0 && (
                        <div className="sm:sticky sm:top-4 space-y-2 mt-4 sm:mt-0 border-t border-slate-100 pt-4 sm:border-0 sm:pt-0">
                          <div className="mb-2">
                            <p className="text-sm font-semibold text-slate-800">Vikta dina val</p>
                            <p className="text-xs text-slate-400 mt-0.5">Hög prioritet får störst andel</p>
                          </div>
                          {pending.map((id) => {
                            const opt  = SELECTION_OPTIONS.find((o) => o.value === id)!;
                            const prio = priorities[id] ?? 2;
                            return (
                              <div key={id} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                <p className="text-xs font-semibold text-slate-700 truncate mb-1.5">{opt.label}</p>
                                {pending.length > 1 ? (
                                  <div className="flex items-center gap-1.5">
                                    <button type="button" onClick={() => adjustPriority(id, 1)} disabled={prio >= 3} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-500 text-xs font-bold disabled:opacity-25 flex items-center justify-center hover:border-slate-300 transition-colors">−</button>
                                    <span className="text-xs font-semibold text-slate-600 flex-1 text-center">{TIER_LABELS[prio]}</span>
                                    <button type="button" onClick={() => adjustPriority(id, -1)} disabled={prio <= 1} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-500 text-xs font-bold disabled:opacity-25 flex items-center justify-center hover:border-slate-300 transition-colors">+</button>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400">Enda valet — full vikt</p>
                                )}
                              </div>
                            );
                          })}
                          <button type="button" onClick={() => { setPending([]); setPriorities({}); }} className="text-xs text-slate-400 hover:text-slate-600 transition-colors py-1">Rensa alla</button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Continue button */}
                <div className="hidden sm:flex pt-3 items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">{pending.length > 0 ? `${pending.length} kategorier` : "Inga valda"}</span>
                  <button
                    type="button"
                    onClick={confirmSelections}
                    disabled={pending.length === 0}
                    className="bg-accent hover:bg-accent-hover active:bg-accent-press disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-[10px] transition-colors text-sm"
                  >
                    Fortsätt →
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
                    <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
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

                    {/* ── Fondlista & slider — alltid synliga ── */}
                    <div className="space-y-3">

                      {result.droppedSelections?.length > 0 && (
                        <div className="bg-warn-soft border border-amber-200 rounded-xl px-4 py-3 space-y-1">
                          <p className="text-xs font-semibold text-amber-800">Vissa kategorier togs bort</p>
                          {result.droppedSelections.map((msg, i) => (
                            <p key={i} className="text-xs text-amber-700">{msg}</p>
                          ))}
                        </div>
                      )}

                      {/* Fund cards */}
                      <div className="space-y-2">
                        {result.portfolio.map((slot, si) => {
                          const idx       = slotIndices[si] ?? 0;
                          const candidate = slot.candidates?.[idx] ?? slot;
                          const canBack   = idx > 0;
                          const canNext   = idx < (slot.candidates?.length ?? 1) - 1;
                          return (
                            <div key={si} className="border border-slate-100 rounded-xl px-4 py-3 bg-slate-50">
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0">
                                  <span className="text-sm font-bold text-accent">{slot.weight}%</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate">{candidate.name}</p>
                                  <p className="text-xs text-slate-400">{slot.rationale}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button type="button" onClick={() => setSlotIndices((prev) => { const n=[...prev]; n[si]=idx-1; return n; })} disabled={!canBack} className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-400 flex items-center justify-center disabled:opacity-20 hover:border-slate-300 hover:text-slate-600 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                                  </button>
                                  <span className="text-[10px] text-slate-300 w-6 text-center">{idx+1}/{slot.candidates?.length ?? 1}</span>
                                  <button type="button" onClick={() => setSlotIndices((prev) => { const n=[...prev]; n[si]=idx+1; return n; })} disabled={!canNext} className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-400 flex items-center justify-center disabled:opacity-20 hover:border-slate-300 hover:text-slate-600 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Slider */}
                      <div className="border border-slate-100 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Justera fördelning</p>
                          {localEquity !== result.equityPct && (
                            <button onClick={() => submit({ ...answers, equityOverride: localEquity })} className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                              Generera om →
                            </button>
                          )}
                        </div>
                        <input type="range" min={0} max={100} step={10} value={localEquity} onChange={(e) => setLocalEquity(Number(e.target.value))} className="w-full accent-accent" />
                        {localEquity !== result.equityPct ? (
                          <p className="text-xs text-blue-600 text-center font-medium">{localEquity}% aktier / {100 - localEquity}% räntor — klicka "Generera om" för att uppdatera</p>
                        ) : (
                          <p className="text-xs text-slate-400 text-center">Nuvarande: {result.equityPct}% aktier / {100 - result.equityPct}% räntor</p>
                        )}
                      </div>

                      {/* Restart buttons */}
                      <div className="flex items-center justify-between pt-1">
                        <button onClick={restart} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                          <RotateCcw className="w-3 h-3" />
                          Börja om
                        </button>
                        <button onClick={resetQuiz} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                          Börja om med nya svar
                        </button>
                      </div>
                    </div>

                    {/* ── Låst sektion: analys + spara (förhandsvisning bakom frost i utloggat läge) ── */}
                    {!user ? (
                      <div className="relative">
                        <div aria-hidden className="pointer-events-none select-none border border-slate-100 rounded-xl overflow-hidden">
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Portföljanalys</p>
                          </div>
                          <div className="px-4 py-3.5 space-y-2">
                            <p className="text-xs leading-relaxed text-slate-600">Din portfölj har en god riskspridning mellan regioner och tillgångsslag.</p>
                            <p className="text-xs leading-relaxed text-slate-600">Den genomsnittliga avgiften ligger under snittet för jämförbara portföljer.</p>
                            <p className="text-xs leading-relaxed text-slate-600">Räntedelen dämpar svängningar och passar den valda risknivån.</p>
                            <p className="text-xs leading-relaxed text-slate-600">Fonderna är topprankade i sina kategorier utifrån Sharpe-kvot och avgift.</p>
                            <p className="text-xs leading-relaxed text-slate-600">Spara portföljen för att följa utvecklingen över tid.</p>
                          </div>
                        </div>

                        <div className="absolute inset-0 rounded-xl backdrop-blur-[8px] bg-white/50" />
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6 space-y-3">
                          <p className="text-base font-semibold text-ink leading-snug max-w-md">Logga in för att se portföljanalysen och spara din portfölj</p>
                          <p className="text-xs text-ink-3">Gratis · Klart på under en minut</p>
                          <button
                            onClick={openAuthModal}
                            className="inline-flex items-center justify-center bg-accent hover:bg-accent-hover active:bg-accent-press text-white text-sm font-semibold px-7 py-2.5 rounded-[10px] transition-colors"
                          >
                            Logga in
                          </button>
                        </div>
                      </div>
                    ) : (
                        <div className="lg:grid lg:grid-cols-5 lg:gap-8 space-y-4 lg:space-y-0">

                          {((result.reasoning?.length > 0) || (result.fundExplanations?.length > 0)) && (
                            <div className="lg:col-span-3 space-y-2">

                              {result.reasoning?.length > 0 && (
                                <div className="border border-slate-100 rounded-xl overflow-hidden">
                                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Portföljanalys</p>
                                  </div>
                                  <div className="px-4 py-3 space-y-2">
                                    {result.reasoning.map((line, i) => (
                                      line.startsWith("⚠") ? (
                                        <p key={i} className="text-xs leading-relaxed text-amber-700 bg-warn-soft rounded-lg px-3 py-2">{line}</p>
                                      ) : (
                                        <p key={i} className="text-xs leading-relaxed text-slate-600">{line}</p>
                                      )
                                    ))}
                                  </div>
                                </div>
                              )}

                              {result.fundExplanations?.length > 0 && (
                                <div className="border border-slate-100 rounded-xl overflow-hidden">
                                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Varför valdes varje fond?</p>
                                  </div>
                                  <div className="divide-y divide-slate-100">
                                    {result.fundExplanations.map((f, i) => {
                                      const open = expandedFunds.has(i);
                                      const poolStr = f.poolSize > 1 ? ` av ${f.poolSize} fonder` : "";
                                      const sharpeAboveAvg    = f.sharpe != null && f.avgPoolSharpe != null && f.sharpe > f.avgPoolSharpe * 1.25;
                                      const sharpeSlightlyAbove = f.sharpe != null && f.avgPoolSharpe != null && f.sharpe > f.avgPoolSharpe;
                                      const costBelowAvg      = f.cost   != null && f.avgPoolCost   != null && f.cost   < f.avgPoolCost   * 0.75;
                                      const costSlightlyBelow = f.cost   != null && f.avgPoolCost   != null && f.cost   < f.avgPoolCost;
                                      const explanation = (() => {
                                        if (sharpeAboveAvg && costBelowAvg) {
                                          return `Bäst kombination av avkastning och avgift${poolStr} — Sharpe ${f.sharpe!.toFixed(2)} vs snitt ${f.avgPoolSharpe!.toFixed(2)} · avgift ${f.cost!.toFixed(2)}% vs snitt ${f.avgPoolCost!.toFixed(2)}%`;
                                        }
                                        if (sharpeAboveAvg) {
                                          const costNote = f.cost != null ? ` · avgift ${f.cost.toFixed(2)}%/år` : "";
                                          return `Starkast riskjusterad avkastning${poolStr} — Sharpe ${f.sharpe!.toFixed(2)} vs snitt ${f.avgPoolSharpe!.toFixed(2)}${costNote}`;
                                        }
                                        if (costBelowAvg) {
                                          const sharpeNote = f.sharpe != null ? ` · Sharpe ${f.sharpe.toFixed(2)}` : "";
                                          return `Lägst avgift${poolStr} — ${f.cost!.toFixed(2)}% vs snitt ${f.avgPoolCost!.toFixed(2)}%${sharpeNote}`;
                                        }
                                        if (sharpeSlightlyAbove) {
                                          const costNote = f.cost != null ? ` · avgift ${f.cost.toFixed(2)}%/år` : "";
                                          return `God riskjusterad avkastning${poolStr} — Sharpe ${f.sharpe!.toFixed(2)} vs snitt ${f.avgPoolSharpe!.toFixed(2)}${costNote}`;
                                        }
                                        if (costSlightlyBelow) {
                                          const sharpeNote = f.sharpe != null ? ` · Sharpe ${f.sharpe.toFixed(2)}` : "";
                                          return `Lägre avgift än snittet${poolStr} — ${f.cost!.toFixed(2)}% vs ${f.avgPoolCost!.toFixed(2)}%${sharpeNote}`;
                                        }
                                        if (f.sharpe != null && f.cost != null) return `Sharpe ${f.sharpe.toFixed(2)} · avgift ${f.cost.toFixed(2)}%/år`;
                                        if (f.sharpe != null) return `Sharpe ${f.sharpe.toFixed(2)}`;
                                        if (f.cost   != null) return `Avgift ${f.cost.toFixed(2)}%/år`;
                                        return "Rankad i sin kategori";
                                      })();
                                      return (
                                        <div key={i}>
                                          <button type="button" onClick={() => setExpandedFunds((prev) => { const n = new Set(prev); open ? n.delete(i) : n.add(i); return n; })} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className="text-xs font-semibold text-accent shrink-0">{f.weight}%</span>
                                              <span className="text-xs font-semibold text-slate-800 truncate">{f.name}</span>
                                            </div>
                                            <svg className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                                          </button>
                                          {open && (
                                            <div className="px-4 pb-3 space-y-1">
                                              <p className="text-xs text-slate-500">Kategori: <span className="font-medium text-slate-700">{f.rationale}</span></p>
                                              <p className="text-xs text-slate-400 leading-relaxed">{explanation}</p>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className={((result.reasoning?.length > 0) || (result.fundExplanations?.length > 0)) ? "lg:col-span-2" : "lg:col-span-5"}>
                            <div className="lg:sticky lg:top-20 space-y-3">

                              {/* Summary card */}
                              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm bg-info text-accent border border-info-line px-3 py-1 rounded-lg font-semibold">{result.riskLabel}</span>
                                </div>
                                <DonutChart
                                  palette={CHART_PALETTE}
                                  slices={result.portfolio.map((slot) => ({
                                    label: RATIONALE_SHORT[slot.rationale] ?? slot.rationale.split(" ")[0],
                                    weight: slot.weight,
                                  }))}
                                  centerLabel={`${result.equityPct}%`}
                                  centerSub="Aktier"
                                  size={120}
                                  thickness={18}
                                  horizontal
                                />
                                <p className="text-[10px] text-slate-400 leading-snug">* Fördelning baseras på fondkategori, inte underliggande innehav.</p>
                                {result.summary && (
                                  <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                                    {result.summary}
                                  </p>
                                )}
                              </div>

                              {/* Save — primary CTA */}
                              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                                {saveStatus === "saved" ? (
                                  <p className="text-sm text-green-700 font-semibold text-center py-1">Portföljen sparad ✓</p>
                                ) : !user ? (
                                  <>
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">Spara din portfölj</p>
                                      <p className="text-xs text-slate-400 mt-0.5">Logga in för att komma åt den när som helst.</p>
                                    </div>
                                    <button
                                      onClick={openAuthModal}
                                      className="w-full bg-accent hover:bg-accent-hover active:bg-accent-press text-white text-sm font-semibold py-3.5 rounded-[10px] transition-colors"
                                    >
                                      Logga in för att spara
                                    </button>
                                  </>
                                ) : !showSaveForm ? (
                                  <>
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">Spara din portfölj</p>
                                      <p className="text-xs text-slate-400 mt-0.5">Kom åt den när som helst från Mina portföljer.</p>
                                    </div>
                                    <button onClick={() => setShowSaveForm(true)} className="w-full bg-accent hover:bg-accent-hover active:bg-accent-press text-white text-sm font-semibold py-3.5 rounded-[10px] transition-colors">
                                      Spara portfölj
                                    </button>
                                  </>
                                ) : (
                                  <div className="space-y-2">
                                    <input autoFocus type="text" placeholder="t.ex. ISK, Pension, Barnspar…" value={savingName} onChange={(e) => setSavingName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSave()} className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    <div className="flex gap-2">
                                      <button onClick={handleSave} disabled={!savingName.trim() || saveStatus === "saving"} className="flex-1 bg-accent hover:bg-accent-hover active:bg-accent-press disabled:opacity-40 text-white text-sm font-semibold py-3 rounded-[10px] transition-colors">
                                        {saveStatus === "saving" ? "Sparar…" : "Spara"}
                                      </button>
                                      <button onClick={() => { setShowSaveForm(false); setSavingName(""); setSaveStatus("idle"); }} className="text-sm text-slate-400 hover:text-slate-600 px-3 transition-colors">
                                        Avbryt
                                      </button>
                                    </div>
                                    {saveStatus === "error" && <p className="text-xs text-red-500">Kunde inte spara. Försök igen.</p>}
                                  </div>
                                )}
                              </div>

                              {/* Analyze — secondary */}
                              <button onClick={sendToAnalyze} className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl py-3 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all">
                                Se nyckeltal — analysera portföljen
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>

                              <p className="text-[10px] text-slate-400 leading-relaxed">
                                Förslaget är automatiskt genererat utifrån historiska nyckeltal och utgör inte
                                finansiell rådgivning. Historisk avkastning är ingen garanti för framtida resultat.
                              </p>
                            </div>
                          </div>

                        </div>
                    )}

                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Back button */}
      {step !== "horizon" && (
        <button onClick={goBack} className="mt-4 text-xs text-slate-400 hover:text-slate-600 transition-colors">
          ← Tillbaka
        </button>
      )}

      </div>{/* end quiz col */}

      {/* Live preview panel — only on desktop, from step 2 onward */}
      {showPreview && (
        <div className="hidden lg:block sticky top-20 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Din profil hittills</p>

            {/* Risk score bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Risknivå</span>
                <span className="text-xs font-semibold text-slate-700">{RISK_LABELS[previewRiskScore as RiskLevel]}</span>
              </div>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= previewRiskScore ? "bg-blue-500" : "bg-slate-100"}`} />
                ))}
              </div>
            </div>

            {/* Equity / bond split */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Aktier</span>
                <span className="font-semibold text-slate-700">{previewEquity}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${previewEquity}%` }} />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Räntor</span>
                <span className="font-semibold text-slate-700">{100 - previewEquity}%</span>
              </div>
            </div>

            {/* Selected categories */}
            {pending.length > 0 && (
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kategorier</p>
                <div className="flex flex-wrap gap-1.5">
                  {pending.map(id => {
                    const opt = SELECTION_OPTIONS.find(o => o.value === id);
                    return opt ? (
                      <span key={id} className="text-[10px] font-medium bg-info text-accent border border-info-line px-2 py-0.5 rounded-md">{opt.label}</span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Answers summary */}
            <div className="border-t border-slate-100 pt-3 space-y-1">
              {answers.horizon && (
                <p className="text-[10px] text-slate-400 leading-snug">
                  <span className="font-semibold text-slate-500">Horisont:</span>{" "}
                  {HORIZON_OPTIONS.find(o => o.value === answers.horizon)?.label}
                </p>
              )}
              {answers.q3 !== null && (
                <p className="text-[10px] text-slate-400 leading-snug">
                  <span className="font-semibold text-slate-500">Investeringsvikt:</span>{" "}
                  {Q3_OPTIONS.find(o => o.value === answers.q3)?.label}
                </p>
              )}
              {answers.q4 !== null && (
                <p className="text-[10px] text-slate-400 leading-snug">
                  <span className="font-semibold text-slate-500">Prioritet:</span>{" "}
                  {Q4_OPTIONS.find(o => o.value === answers.q4)?.label}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      </div>{/* end grid wrapper */}

      {/* ── Inline auth modal ─────────────────────────────────────────────────── */}
      {authModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setAuthModal(false); setAuthSent(false); setAuthEmail(""); setAuthError(null); } }}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="text-center space-y-1">
              <p className="font-semibold text-slate-900 text-base">Logga in eller skapa konto</p>
              <p className="text-xs text-slate-400">Inget konto? Vi skapar ett åt dig automatiskt.</p>
            </div>

            {authSent ? (
              <div className="text-center py-4 space-y-2">
                <svg className="w-8 h-8 mx-auto text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                <p className="font-semibold text-slate-900">Kolla din e-post</p>
                <p className="text-sm text-slate-500">Vi har skickat en inloggningslänk till <span className="font-medium text-slate-700">{authEmail}</span>.</p>
              </div>
            ) : (
              <>
                <button
                  onClick={handleAuthGoogle}
                  className="w-full flex items-center justify-center gap-3 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
                  </svg>
                  Fortsätt med Google
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400">eller</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <form onSubmit={handleAuthMagicLink} className="space-y-3">
                  <input
                    type="email"
                    required
                    placeholder="din@email.se"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {authError && <p className="text-xs text-red-600">{authError}</p>}
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-accent hover:bg-accent-hover active:bg-accent-press disabled:bg-blue-300 text-white font-semibold rounded-[10px] py-2.5 text-sm transition-colors"
                  >
                    {authLoading ? "Skickar…" : "Skicka inloggningslänk"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sticky bottom CTA för selections-steget på mobil */}
      {step === "selections" && (
        <div
          className="sm:hidden fixed left-0 right-0 px-4 pb-3 pt-2 bg-white/95 backdrop-blur-sm border-t border-slate-100 z-40"
          style={{ bottom: "calc(52px + max(8px, env(safe-area-inset-bottom, 0px)))" }}
        >
          <button
            type="button"
            onClick={confirmSelections}
            disabled={pending.length === 0}
            className="w-full bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-4 rounded-xl text-sm transition-colors"
          >
            {pending.length === 0 ? "Välj minst ett alternativ" : `Fortsätt — ${pending.length} valda`}
          </button>
        </div>
      )}
    </div>
  );
}
