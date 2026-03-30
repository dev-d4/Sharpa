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
  improvement: {
    sharpe?: number;
    cost?: number;
    return1yr?: number;
  };
  consolidate: boolean;
};

export type SuggestedMetrics = {
  avgCost: number | null;
  weightedReturn1yr: number | null;
  weightedReturn3yr: number | null;
  weightedSharpe: number | null;
  funds: { name: string; isin: string; weight: number }[];
};

export type PortfolioAnalysis = {
  totalWeight: number;
  notFound: string[];
  categoryBreakdown: CategoryBreakdown[];
  avgCost: number | null;
  weightedReturn1yr: number | null;
  weightedReturn3yr: number | null;
  weightedSharpe: number | null;
  swapSuggestions: SwapSuggestion[];
  summaryText: string;
  suggestedMetrics: SuggestedMetrics | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Swap suggestions ──────────────────────────────────────────────────────────

function generateSwaps(
  entries: PortfolioEntry[],
  allFunds: Fund[]
): SwapSuggestion[] {
  const suggestions: SwapSuggestion[] = [];
  const portfolioIsins = new Set(
    entries.filter((e) => e.fund).map((e) => e.fund!.isin)
  );

  for (const entry of entries) {
    const current = entry.fund!;

    const peers = allFunds.filter(
      (f) =>
        f.isin !== current.isin &&
        f.category !== null &&
        f.category === current.category
    );
    if (peers.length === 0) continue;

    const best = peers.reduce((a, b) =>
      absoluteScore(b) > absoluteScore(a) ? b : a
    );

    if (absoluteScore(best) <= absoluteScore(current)) continue;

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
      improvement,
      consolidate,
    });
  }

  return suggestions;
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
    lines.push(`Förväntad avkastning (senaste 12 månader, viktad): ${return1yr.toFixed(1)}%.`);
  if (return3yr !== null)
    lines.push(`Annualiserad 3-årsavkastning (viktad): ${return3yr.toFixed(1)}% per år.`);

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

  const avgCost = weightedAvg(found, (f) => f.ongoing_cost_actual ?? f.ongoing_cost_estimated);
  const weightedReturn1yr = weightedAvg(found, (f) => f.return_1yr);
  const weightedReturn3yr = weightedAvg(found, (f) => f.return_3yr);
  const weightedSharpe = weightedAvg(found, (f) => f.sharpe_3yr);

  const swapSuggestions = generateSwaps(found, allFunds);
  const suggestedMetrics = buildSuggestedMetrics(found, swapSuggestions);

  const summaryText = buildSummary(
    categoryBreakdown, avgCost, weightedReturn1yr, weightedReturn3yr,
    weightedSharpe, notFound, totalWeight
  );

  return {
    totalWeight,
    notFound,
    categoryBreakdown,
    avgCost,
    weightedReturn1yr,
    weightedReturn3yr,
    weightedSharpe,
    swapSuggestions,
    summaryText,
    suggestedMetrics,
  };
}
