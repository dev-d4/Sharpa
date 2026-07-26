"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { RISK_LABELS, RISK_EQUITY, RISK_EQUITY_PCT, type RiskLevel } from "@/lib/risk";
import type { User } from "@supabase/supabase-js";
import DonutChart from "@/components/ui/DonutChart";
import DataFreshness from "@/components/ui/DataFreshness";
import { CHART_PALETTE } from "@/lib/chart-palette";
import { useMobileBottomOverlay } from "@/lib/mobile-bottom-overlay";
import { BEFORE_LOGIN_EVENT, prepareLoginResume, saveResume, takeResumeData } from "@/lib/resume-session";

// ── Types ────────────────────────────────────────────────────────────────────

type Platform   = "avanza" | "nordnet" | "both";
type Horizon    = "short" | "medium" | "long" | "verylong";
type Reaction   = "sell" | "wait" | "buy";
type Management = "passive" | "mixed" | "active";
type Step       = "platform" | "risk" | "horizon" | "reaction" | "q3" | "q4" | "selections" | "management" | "results";

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
  riskDirect:    number      | null;   // 1–5: direkt vald risknivå (SIMPLE_RISK_FLOW)
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
  return_1yr:   number | null;
  return_3yr:   number | null;
};

type PortfolioFund = {
  isin:         string;
  name:         string;
  weight:       number;
  category:     string;
  rationale:    string;
  ongoing_cost: number | null;
  sharpe_3yr:   number | null;
  return_1yr:   number | null;
  return_3yr:   number | null;
  candidates:   CandidateFund[];
  poolSize:      number;
  avgPoolSharpe: number | null;
  avgPoolCost:   number | null;
  avgPoolReturn1yr: number | null;
  avgPoolReturn3yr: number | null;
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

type ExistingPortfolio = {
  id: string;
  name: string;
};

// ── Option data ───────────────────────────────────────────────────────────────

// Slå om till true för enkel-fråge-varianten (en ren risk-preferensfråga i stället
// för fyra profileringsfrågor). false = det ursprungliga fyra-frågeflödet.
const SIMPLE_RISK_FLOW = true;

const STEPS: Step[] = SIMPLE_RISK_FLOW
  ? ["risk", "selections", "management", "platform"]
  : ["horizon", "reaction", "q3", "q4", "selections", "management", "platform"];

const RISK_OPTIONS: { value: number; label: string; desc: string }[] = [
  { value: 1, label: RISK_LABELS[1], desc: `${RISK_EQUITY[1]} · minst svängningar` },
  { value: 2, label: RISK_LABELS[2], desc: RISK_EQUITY[2] },
  { value: 3, label: RISK_LABELS[3], desc: `${RISK_EQUITY[3]} · jämn mix aktier/räntor` },
  { value: 4, label: RISK_LABELS[4], desc: RISK_EQUITY[4] },
  { value: 5, label: RISK_LABELS[5], desc: `${RISK_EQUITY[5]} · störst svängningar` },
];

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
  { value: "short",    label: "Under 3 år",   desc: "Kort sikt" },
  { value: "medium",   label: "3–7 år",       desc: "Mellanlång sikt" },
  { value: "long",     label: "7–15 år",      desc: "Lång sikt" },
  { value: "verylong", label: "Mer än 15 år", desc: "Mycket lång sikt" },
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
  reaction:   { title: "Portföljen faller 20% — vad skulle du välja?",       subtitle: "Ditt svar hjälper oss välja aktieandel i exemplet" },
  q3:         { title: "Hur mycket svängningar vill du utgå från?",           subtitle: "Välj den nivå av kursrörelser exemplet ska bygga på" },
  q4:         { title: "Vad är viktigast för dig?",                          subtitle: "Välj det alternativ som bäst speglar din inställning till risk och avkastning" },
  selections: { title: "Vad vill du investera i?",                          subtitle: "Vi har valt kategorier som passar din risknivå. Behåll förslaget eller välj egna kategorier." },
  management: { title: "Aktiv eller passiv förvaltning?",                   subtitle: "Indexfonder har generellt lägre avgifter och slår ofta aktiva fonder" },
  risk:       { title: "Vilken risknivå vill du se ett exempel för?",        subtitle: "Högre risk = större andel aktier och större svängningar" },
  results:    { title: "Ditt illustrativa portföljexempel",                  subtitle: "" },
};

const EMPTY: Answers = { platform: null, horizon: null, reaction: null, q3: null, q4: null, riskDirect: null, selections: null, priorities: null, management: null, equityOverride: null };

// ── Auto-suggestion ───────────────────────────────────────────────────────────

function scoreFromFourQuestions(a: Answers): number {
  const q1Map: Record<string, number> = { short: 2, medium: 3, long: 4, verylong: 5 };
  const q2Map: Record<string, number> = { sell: 1, wait: 3, buy: 5 };
  const v1 = (a.horizon  && q1Map[a.horizon])  ? q1Map[a.horizon]  : 3;
  const v2 = (a.reaction && q2Map[a.reaction]) ? q2Map[a.reaction] : 3;
  const v3 = a.q3 ?? 3;
  const v4 = a.q4 ?? 3;
  return Math.max(1, Math.min(5, Math.round((v1 + v2 + v3 + v4) / 4)));
}

function computeRiskScoreClient(a: Answers): number {
  // Simple flow: the single risk answer decides. Fall back to the four-question
  // score when riskDirect is unset (e.g. a logged-in user prefilled from a saved
  // risk profile) so the auto-selection still lands on the right level.
  if (SIMPLE_RISK_FLOW && a.riskDirect != null) {
    return Math.max(1, Math.min(5, a.riskDirect));
  }
  return scoreFromFourQuestions(a);
}

const AUTO_EXPLANATION: Record<number, string> = {
  1: "Din försiktiga profil ger tyngd mot räntor med en liten kärna av globala aktier för viss tillväxtpotential.",
  2: "Din defensiva profil ger en övervikt mot räntor kombinerat med globala och svenska aktier som kärna.",
  3: "Balanserad portfölj med 60% aktier och 40% räntor — global aktieexponering som kärna, svenska aktier för hemmamarknad och räntedel som buffert.",
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

function OptionCard({ label, desc, onClick, selected }: {
  label: string; desc: string; onClick: () => void; selected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[10px] border px-3.5 py-3 text-left transition-colors sm:px-4 sm:py-4 ${
        selected ? "border-accent bg-info" : "border-line bg-white hover:border-accent"
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <p className="text-[13px] font-semibold leading-snug text-slate-800 sm:text-[15px]">{label}</p>
          <p className="mt-0.5 text-xs leading-snug text-slate-500 sm:mt-1 sm:text-sm">{desc}</p>
        </span>
        {selected && <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} aria-hidden="true" />}
      </span>
    </button>
  );
}

/** Allt som behövs för att sätta tillbaka bygget precis där användaren lämnade det. */
type BuilderSnapshot = {
  step: Step;
  answers: Answers;
  pending: SelectionId[];
  priorities: Record<string, number>;
  result: BuildResult | null;
  localEquity: number;
  slotIndices: number[];
  showAdvanced: boolean;
  autoExplanation: string | null;
  showManualSelections: boolean;
};

// ── Main component ────────────────────────────────────────────────────────────

export default function BuilderClient() {
  const router = useRouter();

  const [step, setStep]             = useState<Step>(STEPS[0]);
  const [answers, setAnswers]       = useState<Answers>(EMPTY);
  const [pending, setPending]       = useState<SelectionId[]>([]);
  const [priorities, setPriorities] = useState<Record<string, number>>({});
  const [result, setResult]         = useState<BuildResult | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [direction, setDirection]   = useState(1);
  const [localEquity, setLocalEquity] = useState<number>(60);
  const [slotIndices, setSlotIndices]         = useState<number[]>([]);
  const [showAdvanced, setShowAdvanced]       = useState(false);
  const [autoExplanation, setAutoExplanation] = useState<string | null>(null);
  const [showManualSelections, setShowManualSelections] = useState(false);
  const [user, setUser]             = useState<User | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [savingName, setSavingName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [duplicatePortfolio, setDuplicatePortfolio] = useState<ExistingPortfolio | null>(null);
  const [authModal, setAuthModal]   = useState(false);
  const [authEmail, setAuthEmail]   = useState("");
  const [authSent, setAuthSent]     = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]   = useState<string | null>(null);
  const saveNameRef = useRef<HTMLInputElement>(null);
  const mobileSelectionCtaRef = useRef<HTMLDivElement>(null);
  // Plattformssvar hämtat från fondanalysen (samma flik-session) — frågan ställs
  // ändå, men svaret är förmarkerat och bekräftas med ett klick.
  const [platformPrefilled, setPlatformPrefilled] = useState(false);
  const prefillPlatformRef = useRef<Platform | null>(null);
  // Sant när bygget återställts efter en inloggning — då ska inget skriva över svaren.
  const resumedRef = useRef(false);

  useEffect(() => {
    // Byggflödet ska inte lagras för utloggade användare. Rensa även data som
    // kan finnas kvar från den tidigare återställningsfunktionen.
    try {
      sessionStorage.removeItem("fondanalys_builder_quiz");
    } catch { /* ignore */ }

    // Undantag: bygget som pågick när användaren klickade "Logga in" hämtas
    // tillbaka, en gång, så att inloggningen inte kastar bort arbetet.
    const resumed = takeResumeData<BuilderSnapshot>("/bygg-portfolj");
    if (resumed) {
      resumedRef.current = true;
      setStep(resumed.step);
      setAnswers(resumed.answers);
      setPending(resumed.pending);
      setPriorities(resumed.priorities);
      setResult(resumed.result);
      setLocalEquity(resumed.localEquity);
      setSlotIndices(resumed.slotIndices);
      setShowAdvanced(resumed.showAdvanced);
      setAutoExplanation(resumed.autoExplanation);
      setShowManualSelections(resumed.showManualSelections);
      if (resumed.answers.platform) prefillPlatformRef.current = resumed.answers.platform;
    }

    // Har användaren redan angett var den handlar fonder i analysverktyget?
    // Förifyll i så fall plattformssteget här — men bara för inloggade användare.
    // Utloggade ska aldrig få sparade svar återanvända mellan verktygen.
    const applyPlatformPrefill = () => {
      if (resumedRef.current) return;
      try {
        let custodian: string | null = sessionStorage.getItem("fondanalys_custodian");
        if (!custodian) {
          const analyzeRaw = sessionStorage.getItem("fondanalys_state");
          if (analyzeRaw) {
            custodian = (JSON.parse(analyzeRaw) as { custodian?: string | null }).custodian ?? null;
          }
        }
        const mapped: Platform | null =
          custodian === "avanza" ? "avanza"
          : custodian === "nordnet" ? "nordnet"
          : custodian === "övrigt" ? "both"
          : null;
        if (mapped) {
          prefillPlatformRef.current = mapped;
          setAnswers((prev) => ({ ...prev, platform: mapped }));
          setPlatformPrefilled(true);
        }
      } catch { /* ignore */ }
    };

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) applyPlatformPrefill();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_IN" && session?.user) applyPlatformPrefill();
      if (event === "SIGNED_OUT") {
        setStep("platform");
        prefillPlatformRef.current = null;
        setPlatformPrefilled(false);
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

  // Spara bygget om användaren loggar in härifrån — annars är kvissen borta när hen kommer tillbaka.
  useEffect(() => {
    function saveBeforeLogin() {
      if (step === STEPS[0] && !result) return;
      saveResume("/bygg-portfolj", {
        step, answers, pending, priorities, result, localEquity, slotIndices,
        showAdvanced, autoExplanation, showManualSelections,
      } satisfies BuilderSnapshot);
    }

    window.addEventListener(BEFORE_LOGIN_EVENT, saveBeforeLogin);
    return () => window.removeEventListener(BEFORE_LOGIN_EVENT, saveBeforeLogin);
  }, [step, answers, pending, priorities, result, localEquity, slotIndices, showAdvanced, autoExplanation, showManualSelections]);

  function openAuthModal() {
    prepareLoginResume("/bygg-portfolj");
    setAuthModal(true);
  }

  async function handleAuthGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent("/bygg-portfolj")}&skip_onboarding=1`,
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
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent("/bygg-portfolj")}&skip_onboarding=1` },
    });
    if (error) setAuthError(error.message);
    else setAuthSent(true);
    setAuthLoading(false);
  }

  function resetSaveState() {
    setShowSaveForm(false);
    setSavingName("");
    setSaveStatus("idle");
    setDuplicatePortfolio(null);
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
  useMobileBottomOverlay(step === "selections", mobileSelectionCtaRef, "builder-selection-cta");

  // Single-select steps advance immediately on click
  function pick<K extends keyof Omit<Answers, "selections" | "priorities" | "equityOverride">>(field: K, value: Answers[K]) {
    const next = { ...answers, [field]: value };
    setAnswers(next);
    setDirection(1);
    if (field === "platform") {
      submit(next);
    } else {
      // Går användaren tillbaka och ändrar ett svar som påverkar risknivån måste
      // förslaget räknas om — annars ligger kategorier och förklaringstext kvar
      // från den tidigare nivån (useEffect nedan hoppar över när pending är satt).
      if (computeRiskScoreClient(next) !== computeRiskScoreClient(answers)) {
        setPending([]);
        setPriorities({});
        setAutoExplanation(null);
      }
      setStep(STEPS[STEPS.indexOf(step) + 1]);
    }
  }

  const TIER_LABELS: Record<number, string> = {
    1: "Hög vikt",
    2: "Medelvikt",
    3: "Låg vikt",
  };

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
    resetSaveState();
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

  function activePortfolio() {
    if (!result) return [];
    return result.portfolio.map((slot, si) => {
      const c = slot.candidates?.[slotIndices[si] ?? 0] ?? slot;
      return { ...slot, isin: c.isin, name: c.name };
    });
  }

  async function handleSave(overwrite = false) {
    if (!savingName.trim() || !result || !answers.platform) return;
    setSaveStatus("saving");
    try {
      const custodian = answers.platform === "avanza" ? "avanza" : answers.platform === "nordnet" ? "nordnet" : "övrigt";
      const normalizedName = savingName.trim().toLocaleLowerCase("sv-SE");
      let existing = duplicatePortfolio;
      if (!overwrite) {
        const portfoliosRes = await fetch("/api/portfolios");
        if (portfoliosRes.ok) {
          const portfolios = await portfoliosRes.json() as ExistingPortfolio[];
          existing = portfolios.find((p) => p.name.trim().toLocaleLowerCase("sv-SE") === normalizedName) ?? null;
          if (existing) {
            setDuplicatePortfolio(existing);
            setSaveStatus("idle");
            return;
          }
        }
      }

      const active    = activePortfolio();
      const holdings  = active.map((f) => ({ isin: f.isin, name: f.name, weight: f.weight }));
      const validEntries = active.map((f) => ({ isin: f.isin, weight: f.weight }));
      const analysisRes  = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custodian, entries: validEntries }),
      });
      const analysis = await analysisRes.json();

      const saveRes  = await fetch(overwrite && existing ? `/api/portfolios/${existing.id}` : "/api/portfolios", {
        method: overwrite && existing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: savingName.trim(), custodian, holdings, analysis }),
      });
      if (!saveRes.ok) throw new Error();
      setSaveStatus("saved");
      setShowSaveForm(false);
      setSavingName("");
      setDuplicatePortfolio(null);
    } catch {
      setSaveStatus("error");
    }
  }

  function resetQuiz() {
    setStep(STEPS[0]);
    setAnswers(prefillPlatformRef.current ? { ...EMPTY, platform: prefillPlatformRef.current } : EMPTY);
    setPending([]);
    setPriorities({});
    setResult(null);
    setError(null);
    setDirection(1);
    setLocalEquity(60);
    setSlotIndices([]);
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

  // Live preview panel data — reflects the answers given so far.
  const confirmedAnswers: Answers = answers;
  const previewRiskScore = computeRiskScoreClient(confirmedAnswers);
  const previewEquity = RISK_EQUITY_PCT[previewRiskScore as RiskLevel];
  const showPreview = !isResults && stepIdx >= 1;

  return (
    <div className={`${isResults ? "max-w-4xl" : step === "selections" ? "max-w-3xl" : showPreview ? "max-w-3xl" : "max-w-lg"} mx-auto px-4 py-5 transition-all duration-200 sm:py-16`}>

      {/* Page header */}
      <div className="mb-5 text-center sm:mb-8">
        <h1 className="font-heading text-xl font-bold text-slate-900 sm:text-3xl">Bygg din portfölj</h1>
        <p className="mt-1 text-xs text-slate-500 sm:mt-2 sm:text-sm">
          Svara på {totalSteps} frågor — vi visar ett komplett portföljexempel
        </p>
      </div>

      {/* Progress bar */}
      {!isResults && (
        <div className="mb-4 sm:mb-6">
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
            <div className="border-b border-slate-100 px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
              <p className="text-sm font-bold leading-snug text-slate-900 sm:text-base">{meta.title}</p>
              {meta.subtitle && <p className="mt-0.5 text-[11px] leading-snug text-slate-400 sm:text-xs">{meta.subtitle}</p>}
            </div>
          )}

          <div className="space-y-2 p-4 sm:p-5">

            {/* Platform */}
            {step === "platform" && (
              <>
                {platformPrefilled && answers.platform && (
                  <p className="rounded-[10px] bg-info px-3.5 py-2.5 text-xs leading-snug text-accent-press">
                    Vi har fyllt i ditt svar från fondanalysen — klicka för att bekräfta, eller välj ett annat.
                  </p>
                )}
                {PLATFORM_OPTIONS.map((o) => (
                  <OptionCard
                    key={o.value}
                    label={o.label}
                    desc={o.desc}
                    selected={answers.platform === o.value}
                    onClick={() => pick("platform", o.value)}
                  />
                ))}
              </>
            )}

            {step === "risk" && RISK_OPTIONS.map((o) => (
              <OptionCard key={o.value} label={o.label} desc={o.desc} onClick={() => pick("riskDirect", o.value)} />
            ))}

            {/* Horizon */}
            {step === "horizon" && HORIZON_OPTIONS.map((o) => (
              <OptionCard key={o.value} label={o.label} desc={o.desc} onClick={() => pick("horizon", o.value)} />
            ))}

            {/* Reaction */}
            {step === "reaction" && REACTION_OPTIONS.map((o) => (
              <OptionCard key={o.value} label={o.label} desc={o.desc} onClick={() => pick("reaction", o.value)} />
            ))}

            {/* Q3 — how important is the investment */}
            {step === "q3" && Q3_OPTIONS.map((o) => (
              <OptionCard key={o.value} label={o.label} desc={o.desc} onClick={() => pick("q3", o.value)} />
            ))}

            {/* Q4 — risk vs return priority */}
            {step === "q4" && Q4_OPTIONS.map((o) => (
              <OptionCard key={o.value} label={o.label} desc={o.desc} onClick={() => pick("q4", o.value)} />
            ))}

            {/* Selections — auto-suggested by default */}
            {step === "selections" && (
              <>
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
                      Ändra förslaget
                    </button>

                    {autoExplanation && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <div>
                          <p className="text-xs font-semibold text-blue-800">Förslag baserat på din valda risknivå</p>
                          <p className="mt-1 text-xs leading-relaxed text-blue-700">{autoExplanation}</p>
                          <p className="mt-1.5 text-xs leading-relaxed text-blue-600">
                            Fortsätt med förslaget som det är, eller ändra kategorierna själv.
                          </p>
                        </div>
                      </div>
                    )}
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
                      ← Tillbaka till översikten
                    </button>

                    <div className="rounded-[10px] bg-slate-50 px-3.5 py-2.5">
                      <p className="text-xs leading-relaxed text-slate-600">
                        Välj de kategorier du vill ha med. De markerade kategorierna ingår redan i förslaget.
                      </p>
                    </div>

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
                                    className={`w-full rounded-[10px] border px-3.5 py-2.5 text-left transition-colors sm:px-4 sm:py-3 ${
                                      selected
                                        ? "border-accent bg-info"
                                        : "border-line bg-white hover:border-accent"
                                    }`}
                                  >
                                    <p className={`text-[13px] font-semibold leading-snug sm:text-sm ${selected ? "text-blue-700" : "text-slate-800"}`}>{o.label}</p>
                                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500 sm:mt-1 sm:text-xs">{o.desc}</p>
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
                            <p className="text-sm font-semibold text-slate-800">Fördela mellan kategorierna</p>
                            <p className="text-xs text-slate-400 mt-0.5">Välj om varje kategori ska få hög, medelstor eller låg vikt</p>
                          </div>
                          {pending.map((id) => {
                            const opt  = SELECTION_OPTIONS.find((o) => o.value === id)!;
                            const prio = priorities[id] ?? 2;
                            return (
                              <div key={id} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                <p className="text-xs font-semibold text-slate-700 truncate mb-1.5">{opt.label}</p>
                                {pending.length > 1 ? (
                                  <div className="flex items-center gap-1.5">
                                    <button type="button" aria-label={`Minska vikten för ${opt.label}`} onClick={() => adjustPriority(id, 1)} disabled={prio >= 3} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-500 text-xs font-bold disabled:opacity-25 flex items-center justify-center hover:border-slate-300 transition-colors">−</button>
                                    <span className="text-xs font-semibold text-slate-600 flex-1 text-center">{TIER_LABELS[prio]}</span>
                                    <button type="button" aria-label={`Öka vikten för ${opt.label}`} onClick={() => adjustPriority(id, -1)} disabled={prio <= 1} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-500 text-xs font-bold disabled:opacity-25 flex items-center justify-center hover:border-slate-300 transition-colors">+</button>
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

                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Din valda fördelning</p>
                          <p className="mt-1 text-lg font-bold text-slate-900">{result.riskLabel}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {result.equityPct}% aktier · {100 - result.equityPct}% räntor
                          </p>
                        </div>
                        <div>
                          <DonutChart
                            palette={CHART_PALETTE}
                            slices={result.portfolio.map((slot) => ({
                              label: RATIONALE_SHORT[slot.rationale] ?? slot.rationale.split(" ")[0],
                              weight: slot.weight,
                            }))}
                            centerLabel={`${result.equityPct}%`}
                            centerSub="Aktier"
                            size={112}
                            thickness={18}
                            horizontal
                          />
                          <p className="mt-2 max-w-sm text-[10px] leading-snug text-slate-400">
                            * Fördelningen visas på fondnivå och baseras på fondkategori, inte underliggande innehav.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ── Fondlista & slider — alltid synliga ── */}
                    <div className="space-y-3">

                      <h2 className="pt-1 text-sm font-bold text-slate-900">Fonder i exemplet</h2>
                      <p className="-mt-1 text-xs leading-relaxed text-slate-500">
                        <span className="sm:hidden">Byt fond under fondnamnet för att se nästa rankade alternativ i samma kategori.</span>
                        <span className="hidden sm:inline">Använd pilarna för att byta från den bäst rankade fonden till nästa alternativ i samma kategori.</span>
                      </p>

                      {result.droppedSelections?.length > 0 && (
                        <div className="bg-warn-soft border border-amber-200 rounded-xl px-4 py-3 space-y-1">
                          <p className="text-xs font-semibold text-amber-800">Vissa kategorier togs bort</p>
                          {result.droppedSelections.map((msg, i) => (
                            <p key={i} className="text-xs text-amber-700">{msg}</p>
                          ))}
                        </div>
                      )}

                      {/* Sammanhållen fondlista */}
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:pl-28">Fond</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vikt</span>
                        </div>
                        {result.portfolio.map((slot, si) => {
                          const idx       = slotIndices[si] ?? 0;
                          const candidate = slot.candidates?.[idx] ?? slot;
                          const canBack   = idx > 0;
                          const canNext   = idx < (slot.candidates?.length ?? 1) - 1;
                          const candidateCount = slot.candidates?.length ?? 1;
                          return (
                            <div key={si} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
                              <div className="flex items-center gap-3">
                                {candidateCount > 1 ? (
                                  <div className="hidden shrink-0 items-center gap-1 sm:flex">
                                    <button type="button" aria-label="Föregående fond" onClick={() => { resetSaveState(); setSlotIndices((prev) => { const n=[...prev]; n[si]=idx-1; return n; }); }} disabled={!canBack} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600 disabled:opacity-20">
                                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                                    </button>
                                    <span className="w-8 text-center text-[10px] font-semibold text-slate-500">
                                      {idx === 0 ? "Bäst" : `${idx + 1}:a`}
                                    </span>
                                    <button type="button" aria-label="Nästa fond" onClick={() => { resetSaveState(); setSlotIndices((prev) => { const n=[...prev]; n[si]=idx+1; return n; }); }} disabled={!canNext} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600 disabled:opacity-20">
                                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="hidden w-[104px] shrink-0 sm:block" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="break-words text-[13px] font-semibold leading-snug text-slate-900 sm:text-sm">{candidate.name}</p>
                                  <p className="mt-0.5 text-[11px] text-slate-400">{RATIONALE_SHORT[slot.rationale] ?? slot.rationale}</p>
                                  {candidateCount > 1 && (
                                    <div className="mt-2 inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 sm:hidden">
                                      <button type="button" aria-label="Föregående fond" onClick={() => { resetSaveState(); setSlotIndices((prev) => { const n=[...prev]; n[si]=idx-1; return n; }); }} disabled={!canBack} className="flex h-7 w-7 items-center justify-center text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-20">
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                                      </button>
                                      <span className="min-w-16 border-x border-slate-200 px-2 text-center text-[10px] font-semibold text-slate-500">
                                        {idx === 0 ? "Bäst rankad" : `${idx + 1}a`}
                                      </span>
                                      <button type="button" aria-label="Nästa fond" onClick={() => { resetSaveState(); setSlotIndices((prev) => { const n=[...prev]; n[si]=idx+1; return n; }); }} disabled={!canNext} className="flex h-7 w-7 items-center justify-center text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-20">
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <span className="w-12 shrink-0 text-right text-sm font-bold text-accent">{slot.weight}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <details className="group overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                          Läs mer om portföljexemplet
                          <svg className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                        </summary>
                        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
                          {result.summary && (
                            <div>
                              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Kort sammanfattning</h3>
                              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{result.summary}</p>
                            </div>
                          )}
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Varför valdes fonderna?</h3>
                            <div className="mt-2 divide-y divide-slate-100">
                              {result.portfolio.map((slot, si) => {
                                const idx = slotIndices[si] ?? 0;
                                const candidate = slot.candidates?.[idx] ?? slot;
                                const returnValue = candidate.return_3yr ?? candidate.return_1yr;
                                const avgReturn = candidate.return_3yr != null ? slot.avgPoolReturn3yr : slot.avgPoolReturn1yr;
                                const returnYears = candidate.return_3yr != null ? 3 : 1;
                                const returnAboveAvg = returnValue != null && avgReturn != null && returnValue > avgReturn;
                                const riskAdjustedAboveAvg = candidate.sharpe_3yr != null && slot.avgPoolSharpe != null && candidate.sharpe_3yr > slot.avgPoolSharpe;
                                const costBelowAvg = candidate.ongoing_cost != null && slot.avgPoolCost != null && candidate.ongoing_cost < slot.avgPoolCost;
                                const poolStr = slot.poolSize > 1 ? ` av ${slot.poolSize} fonder` : "";
                                const explanation =
                                  riskAdjustedAboveAvg && costBelowAvg
                                    ? `Stark kombination av riskjusterad avkastning och låg avgift${poolStr}.`
                                    : riskAdjustedAboveAvg
                                      ? `Stark riskjusterad avkastning${poolStr}.`
                                      : returnAboveAvg && costBelowAvg
                                        ? `Stark kombination av historisk avkastning och låg avgift${poolStr}.`
                                        : returnAboveAvg
                                          ? `Stark historisk avkastning${poolStr}.`
                                      : costBelowAvg
                                          ? `Lägre avgift än kategorisnittet${poolStr}. Riskjusterad och historisk avkastning har också vägts in i rangordningen.`
                                          : `Högt rankad i sin kategori utifrån riskjusterad avkastning, historisk avkastning och avgift${poolStr}.`;
                                return (
                                  <div key={si} className="py-2.5 first:pt-0 last:pb-0">
                                    <p className="text-xs font-semibold text-slate-800">{candidate.name}</p>
                                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                                      {explanation} Fonden ger portföljen {slot.rationale.toLowerCase()}.
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
                                      {returnValue != null && (
                                        <span>
                                          Avkastning {returnYears} år {returnValue.toFixed(1)}%
                                          {avgReturn != null && ` · snitt ${avgReturn.toFixed(1)}%`}
                                        </span>
                                      )}
                                      {candidate.ongoing_cost != null && (
                                        <span>
                                          Avgift {candidate.ongoing_cost.toFixed(2)}%/år
                                          {slot.avgPoolCost != null && ` · snitt ${slot.avgPoolCost.toFixed(2)}%`}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </details>

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
                          <p className="text-xs text-blue-600 text-center font-medium">{localEquity}% aktier / {100 - localEquity}% räntor — klicka &ldquo;Generera om&rdquo; för att uppdatera</p>
                        ) : (
                          <p className="text-xs text-slate-400 text-center">Nuvarande: {result.equityPct}% aktier / {100 - result.equityPct}% räntor</p>
                        )}
                      </div>

                      {/* Restart button */}
                      <div className="flex items-center justify-center pt-1">
                        <button onClick={resetQuiz} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                          <RotateCcw className="w-3 h-3" />
                          Börja om
                        </button>
                      </div>
                    </div>

                    <div className="mx-auto max-w-md space-y-3">
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
                                    <button onClick={() => { setShowSaveForm(true); requestAnimationFrame(() => saveNameRef.current?.focus({ preventScroll: true })); }} className="w-full bg-accent hover:bg-accent-hover active:bg-accent-press text-white text-sm font-semibold py-3.5 rounded-[10px] transition-colors">
                                      Spara portfölj
                                    </button>
                                  </>
                                ) : (
                                  <div className="space-y-2">
                                    <input ref={saveNameRef} type="text" placeholder="t.ex. ISK, Pension, Barnspar…" value={savingName} onChange={(e) => { setSavingName(e.target.value); setDuplicatePortfolio(null); setSaveStatus("idle"); }} onKeyDown={(e) => e.key === "Enter" && handleSave()} className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    {duplicatePortfolio && (
                                      <div className="rounded-xl border border-amber-200 bg-warn-soft px-3 py-3 space-y-2">
                                        <p className="text-xs font-medium text-amber-800">
                                          Du har redan en portfölj med namnet &ldquo;{duplicatePortfolio.name}&rdquo;. Vill du skriva över den?
                                        </p>
                                        <div className="flex gap-2">
                                          <button type="button" onClick={() => { setDuplicatePortfolio(null); setSaveStatus("idle"); saveNameRef.current?.focus(); }} className="flex-1 rounded-[10px] border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-50">
                                            Ändra namn
                                          </button>
                                          <button type="button" onClick={() => handleSave(true)} disabled={saveStatus === "saving"} className="flex-1 rounded-[10px] bg-accent px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-40">
                                            Skriv över
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex gap-2">
                                      <button onClick={() => handleSave()} disabled={!savingName.trim() || saveStatus === "saving"} className="flex-1 bg-accent hover:bg-accent-hover active:bg-accent-press disabled:opacity-40 text-white text-sm font-semibold py-3 rounded-[10px] transition-colors">
                                        {saveStatus === "saving" ? "Sparar…" : "Spara"}
                                      </button>
                                      <button onClick={() => { setShowSaveForm(false); setSavingName(""); setSaveStatus("idle"); setDuplicatePortfolio(null); }} className="text-sm text-slate-400 hover:text-slate-600 px-3 transition-colors">
                                        Avbryt
                                      </button>
                                    </div>
                                    {saveStatus === "error" && <p className="text-xs text-red-500">Kunde inte spara. Försök igen.</p>}
                                  </div>
                                )}
                      </div>

                      <button onClick={sendToAnalyze} className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl py-3 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all">
                        Analysera portföljen
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Ett exempel — inte en rekommendation</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        Fördelningen är automatiskt genererad utifrån den risknivå du valt och generella
                        nyckeltal. Den tar inte hänsyn till din personliga ekonomiska situation och utgör
                        varken investeringsrådgivning eller en personlig rekommendation. Alla investeringsbeslut
                        fattar du själv och på egen risk. Historisk avkastning är ingen garanti för framtida resultat.
                      </p>
                    </div>

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
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Dina val hittills</p>

            {/* Risk score bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Din valda risknivå</span>
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

            {/* Answers summary — only confirmed answers, in flow order */}
            <div className="border-t border-slate-100 pt-3 space-y-1">
              {confirmedAnswers.riskDirect != null && (
                <p className="text-[10px] text-slate-400 leading-snug">
                  <span className="font-semibold text-slate-500">Vald risknivå:</span>{" "}
                  {RISK_OPTIONS.find(o => o.value === confirmedAnswers.riskDirect)?.label}
                </p>
              )}
              {confirmedAnswers.horizon && (
                <p className="text-[10px] text-slate-400 leading-snug">
                  <span className="font-semibold text-slate-500">Horisont:</span>{" "}
                  {HORIZON_OPTIONS.find(o => o.value === confirmedAnswers.horizon)?.label}
                </p>
              )}
              {confirmedAnswers.reaction && (
                <p className="text-[10px] text-slate-400 leading-snug">
                  <span className="font-semibold text-slate-500">Vid kursfall:</span>{" "}
                  {REACTION_OPTIONS.find(o => o.value === confirmedAnswers.reaction)?.label}
                </p>
              )}
              {confirmedAnswers.q3 !== null && (
                <p className="text-[10px] text-slate-400 leading-snug">
                  <span className="font-semibold text-slate-500">Investeringsvikt:</span>{" "}
                  {Q3_OPTIONS.find(o => o.value === confirmedAnswers.q3)?.label}
                </p>
              )}
              {confirmedAnswers.q4 !== null && (
                <p className="text-[10px] text-slate-400 leading-snug">
                  <span className="font-semibold text-slate-500">Prioritet:</span>{" "}
                  {Q4_OPTIONS.find(o => o.value === confirmedAnswers.q4)?.label}
                </p>
              )}
              {confirmedAnswers.management && (
                <p className="text-[10px] text-slate-400 leading-snug">
                  <span className="font-semibold text-slate-500">Förvaltning:</span>{" "}
                  {MANAGEMENT_OPTIONS.find(o => o.value === confirmedAnswers.management)?.label}
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
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70] p-4"
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
          ref={mobileSelectionCtaRef}
          className="sm:hidden fixed bottom-0 left-0 right-0 px-4 pb-3 pt-2 bg-white/95 backdrop-blur-sm border-t border-slate-100 z-40"
        >
          <button
            type="button"
            onClick={confirmSelections}
            disabled={pending.length === 0}
            className="w-full bg-accent hover:bg-accent-hover active:bg-accent-press disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-4 rounded-xl text-sm transition-colors"
          >
            {pending.length === 0 ? "Välj minst ett alternativ" : `Fortsätt — ${pending.length} valda`}
          </button>
        </div>
      )}

      {isResults && result && <DataFreshness className="mt-10 sm:mt-14" />}
    </div>
  );
}
