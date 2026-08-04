import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type SelectionId =
  | "global" | "sweden" | "usa" | "europe" | "nordic" | "emerging" | "asia"
  | "japan" | "china" | "india" | "latam"
  | "tech" | "health" | "real-estate" | "energy" | "finance" | "consumer" | "industry"
  | "growth" | "value" | "smallcap"
  | "bond-sek" | "bond-global" | "bond-highyield";

const BOND_IDS = new Set<SelectionId>(["bond-sek", "bond-global", "bond-highyield"]);

// Compliance: fälten får aldrig beskriva användarens personliga förhållanden
// (sparhorisont, förlusttolerans, beteende vid kursfall). Se COMPLIANCE.md § 2 och
// § 5 fråga 1–2 — svar om personen som styr vilka namngivna fonder som visas gör
// utdatan till en personlig rekommendation (2017/565 art. 9).
type Answers = {
  platform:      "avanza" | "nordnet" | "both";
  riskDirect?:   number | null;  // 1–5: vald risknivå för exemplet
  selections:    SelectionId[];
  priorities:    Record<string, number> | null;
  management:    "passive" | "mixed" | "active";
  equityOverride: number | null;
};

type FundRow = {
  isin:                   string;
  name:                   string;
  category:               string | null;
  category_group:         string | null;
  selection_id:           string | null;   // pre-classified in DB by classify-funds.ts
  equity_style_box:       string | null;
  sharpe_3yr:             number | null;
  return_1yr:             number | null;
  return_3yr:             number | null;
  ongoing_cost_actual:    number | null;
  ongoing_cost_estimated: number | null;
  investment_type:        string | null;
};

const MAX_EQUITY_SLOTS = 8;
const MIN_WEIGHT_PCT   = 5;

// ── Risk scoring ──────────────────────────────────────────────────────────────

const RISK_LABELS: Record<number, string> = {
  1: "Försiktig", 2: "Defensiv", 3: "Balanserad", 4: "Tillväxt", 5: "Offensiv",
};

const EQUITY_PCT: Record<number, number> = {
  1: 20, 2: 40, 3: 60, 4: 80, 5: 100,
};

// Risknivån kommer enbart från användarens direkta val av vilken nivå exemplet
// ska byggas för. Härled den aldrig ur frågor om användarens egen situation.
function computeRiskScore(a: Answers): number {
  if (a.riskDirect == null) return 3;
  return Math.max(1, Math.min(5, Math.round(a.riskDirect)));
}

// ── Live classification (mirrors scripts/classify-funds.ts) ──────────────────
// Using the fund's `category` field directly avoids depending on the pre-classified
// `selection_id` column in the DB, which gets wiped to null whenever the cron job
// refreshes fund data via fetchAvanzaFunds/fetchNordnetFunds upserts.

export function classifyFund(category: string | null, categoryGroup: string | null): SelectionId | null {
  if (!category) return null;
  const cat = category.trim();
  const low = cat.toLowerCase();

  if (cat.startsWith("Ränte") || categoryGroup === "Money Market") {
    if (low.includes("tillväxtmark") || low.includes("tillväxtm")) return "bond-highyield";
    if (low.includes("högrisk"))                                    return "bond-highyield";
    if (low.includes("kina") || low.includes("china"))              return "bond-highyield";
    if (low.includes("sek"))                                        return "bond-sek";
    return "bond-global";
  }

  if (cat.startsWith("Branschfond,")) {
    if (low.includes("teknik") || low.includes("tech") || low.includes("kommunikation")) return "tech";
    if (low.includes("läkemedel") || low.includes("bioteknik") || low.includes("hälsa")) return "health";
    if (low.includes("fastighetsbolag") || low.includes("fastighet"))                    return "real-estate";
    if (low.includes("ny energi") || low.includes("energi") || low.includes("råvaror") ||
        low.includes("ädelmetaller") || low.includes("vattenresurser") || low.includes("miljö")) return "energy";
    if (low.includes("finans") || low.includes("bank"))   return "finance";
    if (low.includes("konsument"))                        return "consumer";
    if (low.includes("infrastruktur") || low.includes("industrimaterial")) return "industry";
    return null;
  }

  if (cat.startsWith("Råvaror"))                                           return "energy";
  if (cat.startsWith("Global") || cat === "Global & Sverige")              return "global";
  if (cat.startsWith("Sverige"))                                            return "sweden";
  if (cat.startsWith("USA"))                                                return "usa";
  if (cat.startsWith("Europa") || cat.startsWith("Euroland"))              return "europe";
  if (["Spanien","Italien","Hongkong"].includes(cat) ||
      cat.startsWith("Tyskland") || cat.startsWith("Storbritannien"))      return "europe";
  if (cat.startsWith("Norden") || ["Norge","Finland","Danmark"].includes(cat)) return "nordic";
  if (cat.startsWith("Tillväxtmarknader") ||
      cat === "Afrika och Mellanöstern" || cat === "Östeuropa ex Ryssland") return "emerging";
  if (cat.startsWith("Asien"))                                              return "asia";
  if (["ASEAN","Taiwan","Korea","Australien & Nya Zeeland","Indonesien","Vietnam"].includes(cat)) return "asia";
  if (cat.startsWith("Japan"))                                              return "japan";
  if (cat.startsWith("Kina"))                                               return "china";
  if (cat.startsWith("Indien"))                                             return "india";
  if (cat === "Latinamerika" || cat === "Brasilien")                        return "latam";

  return null;
}

export function isBroadGlobalEquityCategory(category: string | null): boolean {
  if (!category) return false;
  const cat = category.trim().toLowerCase();
  return cat === "global" || cat === "global, mix bolag" || cat === "global & sverige";
}

// ── Selection → fund category mapping ────────────────────────────────────────
export const SELECTION_FILTER: Record<SelectionId, (f: FundRow) => boolean> = {
  global:        (f) => isBroadGlobalEquityCategory(f.category),
  sweden:        (f) => classifyFund(f.category, f.category_group) === "sweden",
  usa:           (f) => classifyFund(f.category, f.category_group) === "usa",
  europe:        (f) => classifyFund(f.category, f.category_group) === "europe",
  nordic:        (f) => classifyFund(f.category, f.category_group) === "nordic",
  emerging:      (f) => classifyFund(f.category, f.category_group) === "emerging",
  asia:          (f) => classifyFund(f.category, f.category_group) === "asia",
  japan:         (f) => classifyFund(f.category, f.category_group) === "japan",
  china:         (f) => classifyFund(f.category, f.category_group) === "china",
  india:         (f) => classifyFund(f.category, f.category_group) === "india",
  latam:         (f) => classifyFund(f.category, f.category_group) === "latam",

  tech:          (f) => classifyFund(f.category, f.category_group) === "tech",
  health:        (f) => classifyFund(f.category, f.category_group) === "health",
  "real-estate": (f) => classifyFund(f.category, f.category_group) === "real-estate",
  energy:        (f) => classifyFund(f.category, f.category_group) === "energy",
  finance:       (f) => classifyFund(f.category, f.category_group) === "finance",
  consumer:      (f) => classifyFund(f.category, f.category_group) === "consumer",
  industry:      (f) => classifyFund(f.category, f.category_group) === "industry",

  // Style uses equity_style_box — crosses geographic boundaries, so category alone isn't enough
  growth:        (f) => !!(f.equity_style_box?.toLowerCase().includes("growth")),
  value:         (f) => !!(f.equity_style_box?.toLowerCase().includes("value")),
  smallcap:      (f) => !!(f.equity_style_box?.toLowerCase().includes("small")),

  "bond-sek":       (f) => classifyFund(f.category, f.category_group) === "bond-sek",
  "bond-global":    (f) => classifyFund(f.category, f.category_group) === "bond-global",
  "bond-highyield": (f) => classifyFund(f.category, f.category_group) === "bond-highyield",
};

const SELECTION_RATIONALE: Record<SelectionId, string> = {
  global:        "Global aktieexponering",
  sweden:        "Exponering mot svenska marknaden",
  usa:           "Exponering mot den amerikanska marknaden",
  europe:        "Europeisk aktieexponering",
  nordic:        "Nordisk aktieexponering",
  emerging:      "Exponering mot tillväxtmarknader",
  asia:          "Asiatisk aktieexponering",
  tech:          "Teknik- och IT-sektor",
  health:        "Hälsovård och läkemedel",
  "real-estate": "Fastighetssektor",
  energy:        "Energi och råvaror",
  finance:       "Finans- och banksektorn",
  consumer:      "Konsumentvaror och detaljhandel",
  industry:      "Industri och tillverkning",
  japan:         "Japansk aktieexponering",
  china:         "Kinesisk aktieexponering",
  india:         "Indisk aktieexponering",
  latam:         "Latinamerikansk aktieexponering",
  growth:           "Tillväxtbolag",
  value:            "Värdeaktier",
  smallcap:         "Småbolag",
  "bond-sek":       "Svenska räntor",
  "bond-global":    "Globala räntor",
  "bond-highyield": "High yield-räntor",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isPassive(f: FundRow): boolean {
  if (f.investment_type === "INDEX") return true;
  const n = f.name?.toLowerCase() ?? "";
  return n.includes("index") || n.includes("msci") || n.includes("s&p") || n.includes("etf");
}

function applyMgmt(funds: FundRow[], mgmt: string): FundRow[] {
  if (mgmt === "passive") return funds.filter(isPassive);
  if (mgmt === "active")  return funds.filter((f) => !isPassive(f));
  return funds;
}

// Samma viktning som absoluteScore i lib/analysis.ts: avgiften väger tungt
// (×3) så att dyra fonder inte toppar kategorislotsen på ren momentum.
function scoreF(f: FundRow): number {
  return (f.sharpe_3yr ?? 0) * 3
    + (f.return_3yr ?? 0) * 0.03
    + (f.return_1yr ?? 0) * 0.01
    - (f.ongoing_cost_actual ?? f.ongoing_cost_estimated ?? 0) * 3;
}

function pickTop(pool: FundRow[], exclude: string[] = [], n = 6): FundRow[] {
  const withData = pool.filter(
    (f) => !exclude.includes(f.isin) &&
    (f.sharpe_3yr !== null || f.return_1yr !== null || f.return_3yr !== null)
  );
  // Fall back to all funds (including data-less) if the filtered pool is empty
  const candidates = withData.length > 0 ? withData : pool.filter((f) => !exclude.includes(f.isin));
  return candidates.sort((a, b) => scoreF(b) - scoreF(a)).slice(0, n);
}

function distributeWeights(total: number, count: number): number[] {
  if (count === 0) return [];
  const base      = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

function distributeByPriority(total: number, selections: SelectionId[], priorities: Record<string, number>): number[] {
  if (selections.length === 0) return [];
  const invPrios   = selections.map((id) => 1 / (priorities[id] ?? 1));
  const totalInv   = invPrios.reduce((s, v) => s + v, 0);
  const rawWeights = invPrios.map((inv) => (inv / totalInv) * total);
  const floored    = rawWeights.map((w) => Math.floor(w));
  const remainder  = total - floored.reduce((s, v) => s + v, 0);
  rawWeights
    .map((w, i) => ({ i, frac: w - floored[i] }))
    .sort((a, b) => b.frac - a.frac)
    .slice(0, remainder)
    .forEach(({ i }) => floored[i]++);
  return floored;
}

export function allocateSelectionWeights(
  total: number,
  selections: SelectionId[],
  priorities: Record<string, number>,
  maxSlots = Number.POSITIVE_INFINITY,
): { selections: SelectionId[]; weights: number[]; dropped: SelectionId[] } {
  if (total <= 0 || selections.length === 0) {
    return { selections: [], weights: [], dropped: [...selections] };
  }

  // A category may never be removed after the asset allocation has been set and
  // then leave its weight to another asset class. Keep only as many categories as
  // can fit at the minimum weight, and redistribute solely inside this class.
  const maxByMinimum = Math.max(1, Math.floor(total / MIN_WEIGHT_PCT));
  const ordered = selections.slice().sort((a, b) => (priorities[a] ?? 2) - (priorities[b] ?? 2));
  let kept = ordered.slice(0, Math.min(maxSlots, maxByMinimum));
  const dropped = ordered.slice(kept.length);

  while (kept.length > 1) {
    const weights = Object.keys(priorities).length > 0
      ? distributeByPriority(total, kept, priorities)
      : distributeWeights(total, kept.length);
    const smallest = Math.min(...weights);
    if (smallest >= MIN_WEIGHT_PCT) return { selections: kept, weights, dropped };

    // Remove the smallest, least important slot and calculate the weights again.
    let removeAt = -1;
    for (let i = weights.length - 1; i >= 0; i--) {
      if (weights[i] === smallest) { removeAt = i; break; }
    }
    dropped.push(kept[removeAt]);
    kept = kept.filter((_, i) => i !== removeAt);
  }

  return { selections: kept, weights: [total], dropped };
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function fetchAllFunds(supabase: SupabaseClient, view: string, group: string | string[]): Promise<FundRow[]> {
  const PAGE = 1000;
  const cols = "isin, name, category, category_group, selection_id, equity_style_box, sharpe_3yr, return_1yr, return_3yr, ongoing_cost_actual, ongoing_cost_estimated, investment_type";
  const all: FundRow[] = [];

  let base = supabase.from(view).select(cols).not("name", "is", null);
  base = Array.isArray(group)
    ? base.in("category_group", group)
    : base.eq("category_group", group);
  const ordered = base.order("isin");

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await ordered.range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as FundRow[]));
    if (data.length < PAGE) break;
  }
  return all;
}

// ── Reasoning builder ─────────────────────────────────────────────────────────

type Slot = {
  name: string; weight: number; sharpe_3yr: number | null; ongoing_cost: number | null; rationale: string;
  poolSize: number; avgPoolSharpe: number | null; avgPoolCost: number | null;
};

export type FundExplanation = {
  name:          string;
  weight:        number;
  rationale:     string;
  sharpe:        number | null;
  cost:          number | null;
  poolSize:      number;
  avgPoolSharpe: number | null;
  avgPoolCost:   number | null;
};

function buildFundExplanations(portfolio: Slot[]): FundExplanation[] {
  return portfolio.map((f) => ({
    name:          f.name,
    weight:        f.weight,
    rationale:     f.rationale,
    sharpe:        f.sharpe_3yr,
    cost:          f.ongoing_cost,
    poolSize:      f.poolSize,
    avgPoolSharpe: f.avgPoolSharpe,
    avgPoolCost:   f.avgPoolCost,
  }));
}

function buildReasoning(
  a: Answers,
  riskScore: number,
  riskLabel: string,
  equityPct: number,
  bondPct: number,
  portfolio: Slot[],
  droppedSelections: string[]
): string[] {
  const lines: string[] = [];

  // 1. Vilken risknivå exemplet är byggt för. Beskriv parametern — aldrig personen.
  if (a.equityOverride != null) {
    const computed = EQUITY_PCT[riskScore];
    lines.push(
      `Fördelningen är satt manuellt till ${equityPct}% aktier och ${bondPct}% räntor.` +
      (equityPct !== computed
        ? ` Risknivån ${riskScore} av 5 motsvarar annars ${computed}% aktier.`
        : "")
    );
  } else {
    lines.push(`Exemplet är byggt för risknivå ${riskScore} av 5 (${riskLabel}).`);
  }

  // 2. Asset allocation context
  if (bondPct > 0) {
    const bondSels = (a.selections ?? []).filter((s) => BOND_IDS.has(s as SelectionId));
    const bondNote = bondSels.length > 0
      ? ` Räntedelen är fördelad över ${bondSels.map((s) => SELECTION_RATIONALE[s as SelectionId].toLowerCase()).join(" och ")} enligt de kategorier som valts.`
      : "";
    lines.push(`Fördelningen ${equityPct}% aktier / ${bondPct}% räntor: räntedelen minskar portföljens svängningar och fungerar som stötdämpare vid börsnedgångar.${bondNote}`);
  } else {
    lines.push(`Hela portföljen ligger i aktier (${equityPct}%) — utan räntedel svänger portföljen mer vid marknadsrörelser.`);
  }

  // 3. Management style. Avgiftspåståendet går att styrka mot vår egen fonddata;
  // ett påstående om att index slår aktiv förvaltning gör det inte (MFL 10 §, 18 §).
  const mgmtExplain = a.management === "passive"
    ? "Enbart indexfonder valdes — dessa följer ett marknadsindex och har generellt lägre avgift än aktivt förvaltade fonder."
    : a.management === "active"
      ? "Enbart aktivt förvaltade fonder valdes — dessa har förvaltare som aktivt väljer aktier med målet att slå sitt jämförelseindex."
      : "En mix av index- och aktivt förvaltade fonder valdes för att kombinera lägre avgifter med aktiv förvaltning.";
  lines.push(mgmtExplain);

  lines.push("Fonderna valdes baserat på riskjusterad avkastning (Sharpe-kvot, väger tyngst), historisk avkastning samt lägsta möjliga avgift.");

  // 4. Dropped selections
  for (const msg of droppedSelections) {
    lines.push(`⚠ ${msg}.`);
  }

  // 5. Cost summary
  const withCost = portfolio.filter((f) => f.ongoing_cost !== null);
  if (withCost.length > 0) {
    const totalWeight  = withCost.reduce((s, f) => s + f.weight, 0);
    const weightedCost = withCost.reduce((s, f) => s + (f.ongoing_cost ?? 0) * f.weight, 0);
    const avgCost      = totalWeight > 0 ? weightedCost / totalWeight : 0;
    const sorted       = [...withCost].sort((a, b) => (b.ongoing_cost ?? 0) - (a.ongoing_cost ?? 0));
    const expensive    = sorted.filter((f) => (f.ongoing_cost ?? 0) > avgCost * 1.5 && (f.ongoing_cost ?? 0) > 0.2);
    let costLine = `Viktad genomsnittsavgift: ${avgCost.toFixed(2)}%/år.`;
    if (expensive.length > 0) {
      costLine += ` De dyraste fonderna är ${expensive.map((f) => `${f.name} (${f.ongoing_cost!.toFixed(2)}%/år)`).join(" och ")} — se över dessa i Analysera om du vill optimera avgifterna.`;
    } else {
      costLine += " Avgifterna är generellt låga i portföljen.";
    }
    lines.push(costLine);
  }

  return lines;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const answers: Answers = await req.json();
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "DB ej tillgänglig" }, { status: 500 });

    const view =
      answers.platform === "avanza"  ? "avanza_fund_data"  :
      answers.platform === "nordnet" ? "nordnet_fund_data" :
      "funds";

    const [equityFunds, fixedFunds] = await Promise.all([
      fetchAllFunds(supabase, view, "Equity"),
      fetchAllFunds(supabase, view, ["Fixed Income", "Money Market"]),
    ]);

    const riskScore = computeRiskScore(answers);
    const equityPct = answers.equityOverride ?? EQUITY_PCT[riskScore];
    const bondPct   = 100 - equityPct;
    const allSels   = answers.selections?.length ? answers.selections : ["global" as SelectionId];

    const selectedEquitySels = allSels.filter((s) => !BOND_IDS.has(s));
    // Later category choices cannot erase an asset class chosen in the first step.
    // If no equity category was selected, use a broad global equity fund as the core.
    const equitySels = equityPct > 0 && selectedEquitySels.length === 0
      ? ["global" as SelectionId]
      : selectedEquitySels;
    const bondSels   = allSels.filter((s) => BOND_IDS.has(s));
    const prios      = answers.priorities ?? {};

    const equityPlan = allocateSelectionWeights(equityPct, equitySels, prios, MAX_EQUITY_SLOTS);
    const bondPlan = allocateSelectionWeights(bondPct, bondSels, prios);
    const keptEquitySels = equityPlan.selections;
    const equityWeights = equityPlan.weights;
    const droppedSelections: string[] = equityPlan.dropped.map(
      (id) => `${SELECTION_RATIONALE[id]} togs bort för att övriga aktiekategorier ska kunna väga minst ${MIN_WEIGHT_PCT}% utan att ändra aktieandelen`,
    );
    droppedSelections.push(...bondPlan.dropped.map(
      (id) => `${SELECTION_RATIONALE[id]} togs bort för att övriga räntekategorier ska kunna väga minst ${MIN_WEIGHT_PCT}% utan att ändra ränteandelen`,
    ));

    type CandidateFund = { isin: string; name: string; category: string; ongoing_cost: number | null; sharpe_3yr: number | null; return_1yr: number | null; return_3yr: number | null };
    type PortfolioSlot = { isin: string; name: string; weight: number; category: string; rationale: string; ongoing_cost: number | null; sharpe_3yr: number | null; return_1yr: number | null; return_3yr: number | null; candidates: CandidateFund[]; poolSize: number; avgPoolSharpe: number | null; avgPoolCost: number | null; avgPoolReturn1yr: number | null; avgPoolReturn3yr: number | null };
    const equityPortfolio: PortfolioSlot[] = [];
    const bondPortfolio: PortfolioSlot[] = [];
    const usedIsins: string[] = [];

    const toCandidates = (funds: FundRow[]): CandidateFund[] =>
      funds.map((f) => ({ isin: f.isin, name: f.name, category: f.category ?? "", ongoing_cost: f.ongoing_cost_actual ?? f.ongoing_cost_estimated ?? null, sharpe_3yr: f.sharpe_3yr, return_1yr: f.return_1yr, return_3yr: f.return_3yr }));

    function poolStats(pool: FundRow[]): { poolSize: number; avgPoolSharpe: number | null; avgPoolCost: number | null; avgPoolReturn1yr: number | null; avgPoolReturn3yr: number | null } {
      const withSharpe = pool.filter((f) => f.sharpe_3yr != null);
      const withCost   = pool.filter((f) => (f.ongoing_cost_actual ?? f.ongoing_cost_estimated) != null);
      const withReturn1yr = pool.filter((f) => f.return_1yr != null);
      const withReturn3yr = pool.filter((f) => f.return_3yr != null);
      return {
        poolSize:      pool.length,
        avgPoolSharpe: withSharpe.length > 0 ? withSharpe.reduce((s, f) => s + f.sharpe_3yr!, 0) / withSharpe.length : null,
        avgPoolCost:   withCost.length   > 0 ? withCost.reduce((s, f) => s + (f.ongoing_cost_actual ?? f.ongoing_cost_estimated)!, 0) / withCost.length : null,
        avgPoolReturn1yr: withReturn1yr.length > 0 ? withReturn1yr.reduce((s, f) => s + f.return_1yr!, 0) / withReturn1yr.length : null,
        avgPoolReturn3yr: withReturn3yr.length > 0 ? withReturn3yr.reduce((s, f) => s + f.return_3yr!, 0) / withReturn3yr.length : null,
      };
    }

    // Equity slots
    for (let i = 0; i < keptEquitySels.length; i++) {
      const selId  = keptEquitySels[i];
      const weight = equityWeights[i];
      if (weight <= 0) continue;

      const basePool = equityFunds.filter(SELECTION_FILTER[selId]);
      const mgmtPool = applyMgmt(basePool, answers.management);
      const pool = mgmtPool.length > 0 ? mgmtPool : basePool.length > 0 ? basePool : equityFunds;
      if (basePool.length === 0) {
        droppedSelections.push(`${SELECTION_RATIONALE[selId]} saknade tillgänglig fond och ersattes inom aktiedelen`);
      }
      const top  = pickTop(pool, usedIsins);
      if (top.length === 0) { if (equityPortfolio.length > 0) equityPortfolio[0].weight += weight; continue; }
      const best = top[0];
      equityPortfolio.push({ isin: best.isin, name: best.name, weight, category: best.category ?? "", rationale: SELECTION_RATIONALE[selId], ongoing_cost: best.ongoing_cost_actual ?? best.ongoing_cost_estimated ?? null, sharpe_3yr: best.sharpe_3yr, return_1yr: best.return_1yr, return_3yr: best.return_3yr, candidates: toCandidates(top), ...poolStats(pool) });
      usedIsins.push(best.isin);
    }

    // Bond slots — from user bond selections or one auto-picked fund
    if (bondPct > 0) {
      if (bondPlan.selections.length > 0) {
        for (let i = 0; i < bondPlan.selections.length; i++) {
          const selId  = bondPlan.selections[i];
          const weight = bondPlan.weights[i];
          if (weight <= 0) continue;
          const pool = fixedFunds.filter(SELECTION_FILTER[selId]);
          const activePool = pool.length ? pool : fixedFunds;
          const top  = pickTop(activePool, usedIsins);
          if (top.length === 0) { if (bondPortfolio.length > 0) bondPortfolio[0].weight += weight; continue; }
          const best = top[0];
          bondPortfolio.push({ isin: best.isin, name: best.name, weight, category: best.category ?? "Räntefond", rationale: SELECTION_RATIONALE[selId], ongoing_cost: best.ongoing_cost_actual ?? best.ongoing_cost_estimated ?? null, sharpe_3yr: best.sharpe_3yr, return_1yr: best.return_1yr, return_3yr: best.return_3yr, candidates: toCandidates(top), ...poolStats(activePool) });
          usedIsins.push(best.isin);
        }
      } else {
        const top = pickTop(fixedFunds, usedIsins);
        if (top.length > 0) {
          const best = top[0];
          bondPortfolio.push({ isin: best.isin, name: best.name, weight: bondPct, category: best.category ?? "Räntefond", rationale: bondPct <= 20 ? "Stabiliserar portföljen" : "Lägre risk och volatilitet", ongoing_cost: best.ongoing_cost_actual ?? best.ongoing_cost_estimated ?? null, sharpe_3yr: best.sharpe_3yr, return_1yr: best.return_1yr, return_3yr: best.return_3yr, candidates: toCandidates(top), ...poolStats(fixedFunds) });
        }
      }
    }

    if (equityPct > 0 && equityPortfolio.length === 0) {
      return NextResponse.json({ error: "Det finns ingen tillgänglig aktiefond som kan behålla din valda aktieandel." }, { status: 422 });
    }
    if (bondPct > 0 && bondPortfolio.length === 0) {
      return NextResponse.json({ error: "Det finns ingen tillgänglig räntefond som kan behålla din valda ränteandel." }, { status: 422 });
    }

    // Correct rounding or unavailable category slots only within the same asset class.
    const equityTotal = equityPortfolio.reduce((s, f) => s + f.weight, 0);
    const bondTotal = bondPortfolio.reduce((s, f) => s + f.weight, 0);
    if (equityPortfolio.length > 0) equityPortfolio[0].weight += equityPct - equityTotal;
    if (bondPortfolio.length > 0) bondPortfolio[0].weight += bondPct - bondTotal;
    const portfolio = [...equityPortfolio, ...bondPortfolio];

    const computedLabel = RISK_LABELS[riskScore];
    const riskLabel = answers.equityOverride != null
      ? (equityPct <= 20 ? "Försiktig" : equityPct <= 40 ? "Defensiv" : equityPct <= 60 ? "Balanserad" : equityPct <= 80 ? "Tillväxt" : "Offensiv")
      : computedLabel;
    const mgmtLabel = answers.management === "passive" ? "indexfonder" : answers.management === "active" ? "aktivt förvaltade fonder" : "en mix av index och aktiva fonder";
    const selCount  = allSels.length;
    const summary   = `En ${riskLabel.toLowerCase()} portfölj med ${equityPct}% aktier${bondPct > 0 ? ` och ${bondPct}% räntor` : ""}, byggd med ${mgmtLabel} fördelat över ${selCount} område${selCount > 1 ? "n" : ""}.`;

    const reasoning         = buildReasoning(answers, riskScore, riskLabel, equityPct, bondPct, portfolio, droppedSelections);
    const fundExplanations  = buildFundExplanations(portfolio);

    return NextResponse.json({ portfolio, riskScore, riskLabel, equityPct, summary, reasoning, droppedSelections, fundExplanations });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
