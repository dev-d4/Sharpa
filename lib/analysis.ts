import { Fund } from "./supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PortfolioEntry = {
  isin: string;
  weight: number;
  fund?: Fund | null;
};

export type CategoryBreakdown = {
  label: string;
  weight: number;
};

export type SwapSuggestion = {
  currentFund: Fund;
  suggestedFund: Fund;
  reason: string;
  similarityNote: string;
  improvement: {
    sharpe?: number;
    cost?: number;
    return1yr?: number;
  };
  consolidate: boolean;
  weight: number;
};

export type SuggestedMetrics = {
  avgCost: number | null;
  weightedReturn1yr: number | null;
  weightedReturn3yr: number | null;
  weightedSharpe: number | null;
  funds: { name: string; isin: string; weight: number }[];
};

export type BestInCategory = {
  fundName: string;
  isin: string;
  category: string;
};

export type ManagementBreakdown = {
  active: number;   // % of portfolio weight
  passive: number;  // % of portfolio weight
  unknown: number;  // % of portfolio weight (Nordnet funds lack this field)
};

export type ConcentrationWarning = {
  category: string;
  weight: number;
};

export type PortfolioAnalysis = {
  totalWeight: number;
  notFound: string[];
  categoryBreakdown: CategoryBreakdown[];
  detailedBreakdown: CategoryBreakdown[];
  managementBreakdown: ManagementBreakdown;
  concentrationWarnings: ConcentrationWarning[];
  avgCost: number | null;
  weightedReturn1yr: number | null;
  weightedReturn3yr: number | null;
  weightedSharpe: number | null;
  weightedAlpha: number | null;
  weightedBeta: number | null;
  weightedStdDev: number | null;
  weightedReturn5yr: number | null;
  swapSuggestions: SwapSuggestion[];
  bestInCategory: BestInCategory[];
  summaryText: string;
  suggestedMetrics: SuggestedMetrics | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const SELECTION_ID_LABELS: Record<string, string> = {
  global:           "Global",
  sweden:           "Sverige",
  usa:              "USA",
  europe:           "Europa",
  nordic:           "Norden",
  emerging:         "Tillväxtmarknader",
  asia:             "Asien",
  japan:            "Japan",
  china:            "Kina",
  india:            "Indien",
  latam:            "Latinamerika",
  tech:             "Teknik",
  health:           "Hälsovård",
  "real-estate":    "Fastigheter",
  energy:           "Energi",
  finance:          "Finans",
  consumer:         "Konsumentvaror",
  industry:         "Industri",
  "bond-sek":       "Svenska räntor",
  "bond-global":    "Globala räntor",
  "bond-highyield": "High yield",
};

const CATEGORY_LABELS: Record<string, string> = {
  Equity: "Aktiefonder",
  "Fixed Income": "Räntefonder",
  Allocation: "Blandfonder",
  Alternative: "Alternativa fonder",
  Convertibles: "Konvertibler",
  "Money Market": "Penningmarknadsfonder",
  Other: "Övrigt",
};

function categoryLabel(group: string | null): string {
  if (!group) return "Övrigt";
  return CATEGORY_LABELS[group] ?? group;
}

function weightedAvg(
  entries: PortfolioEntry[],
  getValue: (f: Fund) => number | null
): number | null {
  let sumW = 0;
  let sumV = 0;
  for (const e of entries) {
    if (!e.fund) continue;
    const v = getValue(e.fund);
    if (v === null || v === undefined) continue;
    sumW += e.weight;
    sumV += v * e.weight;
  }
  return sumW === 0 ? null : sumV / sumW;
}

// ── Absolute fund scoring (same logic as scripts/analyze.py) ─────────────────

function absoluteScore(f: Fund): number {
  let score = 0;
  score += (f.sharpe_3yr ?? 0) * 3;
  score += (f.return_3yr ?? 0) * 0.05;
  score += (f.return_1yr ?? 0) * 0.02;
  const cost = f.ongoing_cost_actual ?? f.ongoing_cost_estimated ?? 0;
  score -= cost * 1.5;
  return score;
}

// ── Category display ──────────────────────────────────────────────────────────
// Categories are stored in Swedish in the DB — use them directly, no translation.

function categoryDisplay(category: string | null): string {
  return category ?? "samma kategori";
}

// ── Geographic focus ──────────────────────────────────────────────────────────
// Primary source: Avanza category (already encodes geography explicitly, e.g.
// "Asien ex Japan", "Global, Mix bolag"). Name parsing is only a fallback for
// funds whose category carries no geographic signal.

export function geoFromCategory(category: string | null): string {
  if (!category) return "";
  const c = category.toLowerCase();

  // Non-geographic top-level categories — let name fallback handle or leave unconstrained
  if (c.startsWith("branschfond") || c.startsWith("ränte") || c.startsWith("pengamark")) return "";

  // Use the full category string to derive geo — this naturally handles "ex"-variants
  // (e.g. "Asien ex Japan" → "asia-ex-japan", different from "Asien" → "asia")
  if (c.includes("global")) return "global";
  if (c.includes("tillväxtmark") || c.includes("emerging market")) return "emerging";
  if (c.includes("asien ex japan")) return "asia-ex-japan";
  if (c.includes("asien")) return "asia";
  if (c.includes("japan")) return "japan";
  if (c.includes("kina") || c.includes("china")) return "china";
  if (c.includes("indien") || c.includes("india")) return "india";
  if (c.includes("norden") || c.includes("nordic")) return "nordic";
  if (c.includes("sverige")) return "sweden";
  if (c.includes("norge")) return "norway";
  if (c.includes("danmark")) return "denmark";
  if (c.includes("finland")) return "finland";
  if (c.includes("usa") || c.includes("nordamerika")) return "usa";
  if (c.includes("östeuropa") || c.includes("europa")) return "europe";
  if (c.includes("latinamerika") || c.includes("brasilien")) return "latam";
  if (c.includes("blandfond") || c.includes("allokering")) return "";

  return "";
}

function geoFromName(name: string): string {
  const n = name.toLowerCase();
  if (/sverig|sweden|swedish|svenska/.test(n)) return "sweden";
  if (/norg|norway|norwegian|norsk/.test(n)) return "norway";
  if (/finlan|finska|suomi/.test(n)) return "finland";
  if (/\bisland|\biceland/.test(n)) return "iceland";
  if (/nordic|norden|skandin/.test(n)) return "nordic";
  if (/\bex[\s-]?usa\b|excl[\.\s]+usa|excluding usa/.test(n)) return "global";
  if (/\busa\b|united states|amerik|s&p|nasdaq|dow jones|north americ/.test(n)) return "usa";
  if (/emerging|tillväxtmark|frontier/.test(n)) return "emerging";
  if (/japan|japanese/.test(n)) return "japan";
  if (/kina|china|chinese|hong kong/.test(n)) return "china";
  if (/indien|india|indian/.test(n)) return "india";
  if (/\bbrasil|\bbrazil/.test(n)) return "brazil";
  if (/europ/.test(n)) return "europe";
  if (/asia|pacific|apac/.test(n)) return "asia";
  if (/latin americ|latinameri/.test(n)) return "latam";
  if (/africa|afrik/.test(n)) return "africa";
  if (/middle east|nahost/.test(n)) return "middleeast";
  if (/global|world|värld|international/.test(n)) return "global";
  return "";
}

function geographicFocus(category: string | null, name: string): string {
  const fromCat = geoFromCategory(category);
  if (fromCat !== "") return fromCat;
  return geoFromName(name);
}


// Two funds are geographic peers if their focus is the same, OR if either has
// no detectable focus (broadly-named funds can match within any geography).
function geographicMatch(a: string, b: string): boolean {
  if (a === "" || b === "") return true;
  return a === b;
}

function buildSimilarityNote(current: Fund, suggested: Fund): string {
  const cat = categoryDisplay(current.category);
  const styleMatch =
    current.equity_style_box && suggested.equity_style_box &&
    current.equity_style_box === suggested.equity_style_box;
  const base = `${cat}`;
  return styleMatch ? `${base} (${current.equity_style_box}).` : `${base}.`;
}

// ── Swap suggestions ──────────────────────────────────────────────────────────

function generateSwaps(
  entries: PortfolioEntry[],
  allFunds: Fund[]
): { suggestions: SwapSuggestion[]; bestInCategory: BestInCategory[] } {
  const suggestions: SwapSuggestion[] = [];
  const bestInCategory: BestInCategory[] = [];
  const portfolioIsins = new Set(
    entries.filter((e) => e.fund).map((e) => e.fund!.isin)
  );

  for (const entry of entries) {
    const current = entry.fund!;

    const currentGeo = geographicFocus(current.category, current.name);

    const peers = allFunds.filter(
      (f) =>
        f.isin !== current.isin &&
        f.category !== null &&
        f.category === current.category &&
        geographicMatch(currentGeo, geographicFocus(f.category, f.name))
    );
    if (peers.length === 0) {
      // No comparable peers found — still acknowledge the fund so it's not silently dropped
      bestInCategory.push({
        fundName: current.name,
        isin: current.isin,
        category: current.category ?? categoryLabel(current.category_group),
      });
      continue;
    }

    const best = peers.reduce((a, b) =>
      absoluteScore(b) > absoluteScore(a) ? b : a
    );

    if (absoluteScore(best) <= absoluteScore(current)) {
      bestInCategory.push({
        fundName: current.name,
        isin: current.isin,
        category: current.category ?? categoryLabel(current.category_group),
      });
      continue;
    }

    const consolidate = portfolioIsins.has(best.isin);

    const parts: string[] = [];
    const improvement: SwapSuggestion["improvement"] = {};

    if (best.sharpe_3yr !== null && current.sharpe_3yr !== null) {
      const diff = best.sharpe_3yr - current.sharpe_3yr;
      if (diff > 0) {
        parts.push(`bättre Sharpe (${best.sharpe_3yr.toFixed(2)} vs ${current.sharpe_3yr.toFixed(2)})`);
        improvement.sharpe = diff;
      }
    }

    const bCost = best.ongoing_cost_actual ?? best.ongoing_cost_estimated;
    const cCost = current.ongoing_cost_actual ?? current.ongoing_cost_estimated;
    if (bCost !== null && cCost !== null && bCost < cCost) {
      parts.push(`lägre avgift (${bCost.toFixed(2)}% vs ${cCost.toFixed(2)}%)`);
      improvement.cost = cCost - bCost;
    }

    if (best.return_1yr !== null && current.return_1yr !== null && best.return_1yr > current.return_1yr) {
      parts.push(`högre 1-årsavkastning (${best.return_1yr.toFixed(1)}% vs ${current.return_1yr.toFixed(1)}%)`);
      improvement.return1yr = best.return_1yr - current.return_1yr;
    }

    suggestions.push({
      currentFund: current,
      suggestedFund: best,
      reason: parts.join(", "),
      similarityNote: buildSimilarityNote(current, best),
      improvement,
      consolidate,
      weight: entry.weight,
    });
  }

  return { suggestions, bestInCategory };
}

// ── Suggested portfolio metrics ───────────────────────────────────────────────

function buildSuggestedMetrics(
  found: PortfolioEntry[],
  swapSuggestions: SwapSuggestion[]
): SuggestedMetrics | null {
  if (swapSuggestions.length === 0) return null;

  const swapMap = new Map(
    swapSuggestions.map((s) => [s.currentFund.isin, s])
  );

  const newPortfolio = new Map<string, { fund: Fund; weight: number }>();

  for (const entry of found) {
    const fund = entry.fund!;
    const swap = swapMap.get(fund.isin);
    const target = swap ? swap.suggestedFund : fund;

    const existing = newPortfolio.get(target.isin);
    if (existing) {
      existing.weight += entry.weight;
    } else {
      newPortfolio.set(target.isin, { fund: target, weight: entry.weight });
    }
  }

  const suggestedEntries: PortfolioEntry[] = Array.from(newPortfolio.values()).map(
    (v) => ({ isin: v.fund.isin, weight: v.weight, fund: v.fund })
  );

  return {
    avgCost: weightedAvg(suggestedEntries, (f) => f.ongoing_cost_actual ?? f.ongoing_cost_estimated),
    weightedReturn1yr: weightedAvg(suggestedEntries, (f) => f.return_1yr),
    weightedReturn3yr: weightedAvg(suggestedEntries, (f) => f.return_3yr),
    weightedSharpe: weightedAvg(suggestedEntries, (f) => f.sharpe_3yr),
    funds: Array.from(newPortfolio.values()).map((v) => ({
      name: v.fund.name,
      isin: v.fund.isin,
      weight: v.weight,
    })),
  };
}

// ── Summary text ──────────────────────────────────────────────────────────────

function buildSummary(
  categoryBreakdown: CategoryBreakdown[],
  avgCost: number | null,
  return1yr: number | null,
  return3yr: number | null,
  sharpe: number | null,
  notFound: string[],
  totalWeight: number
): string {
  const lines: string[] = [];

  const top = categoryBreakdown.slice(0, 3);
  if (top.length > 0) {
    const desc = top.map((c) => `${c.weight.toFixed(0)}% ${c.label.toLowerCase()}`).join(", ");
    lines.push(`Din portfölj består till ${desc}.`);
  }

  if (avgCost !== null) {
    if (avgCost < 0.5) {
      lines.push(`Den genomsnittliga avgiften är låg (${avgCost.toFixed(2)}%), vilket är bra för din långsiktiga avkastning.`);
    } else if (avgCost < 1.0) {
      lines.push(`Den genomsnittliga avgiften är ${avgCost.toFixed(2)}%, vilket är rimligt men det kan finnas billigare alternativ.`);
    } else {
      lines.push(`Den genomsnittliga avgiften är relativt hög (${avgCost.toFixed(2)}%). Det kan löna sig att se över fonderna.`);
    }
  }

  if (return1yr !== null)
    lines.push(`Avkastning senaste 12 månader: ${return1yr.toFixed(1)}%.`);
  if (return3yr !== null)
    lines.push(`Total 3-årsavkastning: ${return3yr.toFixed(1)}%.`);

  if (sharpe !== null) {
    if (sharpe > 1)
      lines.push(`Sharpe-kvoten är ${sharpe.toFixed(2)}, vilket indikerar god riskjusterad avkastning.`);
    else if (sharpe > 0)
      lines.push(`Sharpe-kvoten är ${sharpe.toFixed(2)}, vilket är godkänt men det finns utrymme för förbättring.`);
    else
      lines.push(`Sharpe-kvoten är ${sharpe.toFixed(2)}, vilket tyder på låg riskjusterad avkastning.`);
  }

  if (Math.abs(totalWeight - 100) > 0.01)
    lines.push(`OBS: Vikterna summerar till ${totalWeight.toFixed(1)}%, inte 100%.`);
  if (notFound.length > 0)
    lines.push(`Följande ISIN hittades inte: ${notFound.join(", ")}.`);

  return lines.join(" ");
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function analyzePortfolio(
  entries: PortfolioEntry[],
  allFunds: Fund[]
): PortfolioAnalysis {
  const found = entries.filter((e) => e.fund);
  const notFound = entries.filter((e) => !e.fund).map((e) => e.isin);
  const totalWeight = found.reduce((s, e) => s + e.weight, 0);

  const catMap: Record<string, number> = {};
  for (const e of found) {
    const label = categoryLabel(e.fund!.category_group);
    catMap[label] = (catMap[label] ?? 0) + e.weight;
  }
  const categoryBreakdown: CategoryBreakdown[] = Object.entries(catMap)
    .map(([label, w]) => ({ label, weight: totalWeight ? (w / totalWeight) * 100 : 0 }))
    .sort((a, b) => b.weight - a.weight);

  // Detailed breakdown using selection_id — same granularity as build-portfolio.
  // Uses selection_id for builder portfolios, fund.category for real portfolios (rapport).
  const detailedMap: Record<string, number> = {};
  for (const e of found) {
    const sid = e.fund!.selection_id;
    const label = sid
      ? (SELECTION_ID_LABELS[sid] ?? sid)
      : (e.fund!.category ?? categoryLabel(e.fund!.category_group));
    detailedMap[label] = (detailedMap[label] ?? 0) + e.weight;
  }
  const detailedBreakdown: CategoryBreakdown[] = Object.entries(detailedMap)
    .map(([label, w]) => ({ label, weight: totalWeight ? (w / totalWeight) * 100 : 0 }))
    .sort((a, b) => b.weight - a.weight);

  const avgCost = weightedAvg(found, (f) => f.ongoing_cost_actual ?? f.ongoing_cost_estimated);
  const weightedReturn1yr = weightedAvg(found, (f) => f.return_1yr);
  const weightedReturn3yr = weightedAvg(found, (f) => f.return_3yr);
  const weightedSharpe = weightedAvg(found, (f) => f.sharpe_3yr);
  const weightedAlpha = weightedAvg(found, (f) => f.alpha_3yr);
  const weightedBeta = weightedAvg(found, (f) => f.beta_3yr);
  const weightedStdDev = weightedAvg(found, (f) => f.std_dev_3yr);
  const weightedReturn5yr = weightedAvg(found, (f) => f.return_5yr);

  // ── Active / passive breakdown ───────────────────────────────────────────────
  let activeW = 0, passiveW = 0, unknownW = 0;
  for (const e of found) {
    const t = e.fund!.investment_type?.toUpperCase() ?? "";
    if (t.includes("PASSIVE") || t.includes("INDEX")) passiveW += e.weight;
    else if (t.includes("ACTIVE") || t.includes("ACTIVELY")) activeW += e.weight;
    else unknownW += e.weight;
  }
  const wSum = activeW + passiveW + unknownW || 1;
  const managementBreakdown: ManagementBreakdown = {
    active: (activeW / wSum) * 100,
    passive: (passiveW / wSum) * 100,
    unknown: (unknownW / wSum) * 100,
  };

  // ── Concentration warnings — based on specific fund category, not category_group
  // Warn if a single specific category (e.g. "Global Large-Cap Blend Equity") makes
  // up ≥50% of the portfolio. This catches "5 globalfonder" but not generic "lots of equity".
  const specificCatMap: Record<string, number> = {};
  for (const e of found) {
    const key = e.fund!.category ?? "__unknown__";
    specificCatMap[key] = (specificCatMap[key] ?? 0) + e.weight;
  }
  const concentrationWarnings: ConcentrationWarning[] = Object.entries(specificCatMap)
    .filter(([key, w]) => key !== "__unknown__" && totalWeight > 0 && (w / totalWeight) * 100 >= 50)
    .map(([key, w]) => ({
      category: categoryDisplay(key),
      weight: (w / totalWeight) * 100,
    }))
    .sort((a, b) => b.weight - a.weight);

  const { suggestions: swapSuggestions, bestInCategory } = generateSwaps(found, allFunds);
  const suggestedMetrics = buildSuggestedMetrics(found, swapSuggestions);

  const summaryText = buildSummary(
    categoryBreakdown, avgCost, weightedReturn1yr, weightedReturn3yr,
    weightedSharpe, notFound, totalWeight
  );

  return {
    totalWeight,
    notFound,
    categoryBreakdown,
    detailedBreakdown,
    managementBreakdown,
    concentrationWarnings,
    avgCost,
    weightedReturn1yr,
    weightedReturn3yr,
    weightedSharpe,
    weightedAlpha,
    weightedBeta,
    weightedStdDev,
    weightedReturn5yr,
    swapSuggestions,
    bestInCategory,
    summaryText,
    suggestedMetrics,
  };
}
