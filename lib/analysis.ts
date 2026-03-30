import { Fund } from "./supabase";

export type PortfolioEntry = {
  isin: string;
  weight: number; // 0–100
  fund?: Fund;
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
};

// ── Kategorimappning (svenska etiketter) ─────────────────────────────────────
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

// Viktat medelvärde, hoppar över null
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
  if (sumW === 0) return null;
  return sumV / sumW;
}

export function analyzePortfolio(
  entries: PortfolioEntry[],
  allFunds: Fund[]
): PortfolioAnalysis {
  const found = entries.filter((e) => e.fund);
  const notFound = entries.filter((e) => !e.fund).map((e) => e.isin);
  const totalWeight = found.reduce((s, e) => s + e.weight, 0);

  // Kategorifördelning
  const catMap: Record<string, number> = {};
  for (const e of found) {
    const label = categoryLabel(e.fund!.category_group);
    catMap[label] = (catMap[label] ?? 0) + e.weight;
  }
  const categoryBreakdown: CategoryBreakdown[] = Object.entries(catMap)
    .map(([label, weight]) => ({ label, weight: (weight / totalWeight) * 100 }))
    .sort((a, b) => b.weight - a.weight);

  // Nyckeltal
  const avgCost = weightedAvg(
    found,
    (f) => f.ongoing_cost_actual ?? f.ongoing_cost_estimated
  );
  const weightedReturn1yr = weightedAvg(found, (f) => f.return_1yr);
  const weightedReturn3yr = weightedAvg(found, (f) => f.return_3yr);
  const weightedSharpe = weightedAvg(found, (f) => f.sharpe_3yr);

  // Fondbyteförslag
  const swapSuggestions = generateSwaps(found, allFunds);

  // Beskrivande text
  const summaryText = buildSummary({
    categoryBreakdown,
    avgCost,
    weightedReturn1yr,
    weightedReturn3yr,
    weightedSharpe,
    notFound,
    totalWeight,
  });

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
  };
}

// ── Fondbyteförslag ───────────────────────────────────────────────────────────
function generateSwaps(
  entries: PortfolioEntry[],
  allFunds: Fund[]
): SwapSuggestion[] {
  const suggestions: SwapSuggestion[] = [];

  for (const entry of entries) {
    const current = entry.fund!;

    // Hitta fonder i samma kategori (exkludera sig själv)
    const peers = allFunds.filter(
      (f) =>
        f.isin !== current.isin &&
        f.category === current.category &&
        f.category !== null
    );

    if (peers.length === 0) continue;

    // Välj bästa alternativ baserat på Sharpe + kostnad + avkastning
    let best: Fund | null = null;
    let bestScore = -Infinity;

    for (const peer of peers) {
      let score = 0;
      let improvements = 0;

      if (
        peer.sharpe_3yr !== null &&
        current.sharpe_3yr !== null &&
        peer.sharpe_3yr > current.sharpe_3yr
      ) {
        score += (peer.sharpe_3yr - current.sharpe_3yr) * 2;
        improvements++;
      }

      const peerCost = peer.ongoing_cost_actual ?? peer.ongoing_cost_estimated;
      const curCost =
        current.ongoing_cost_actual ?? current.ongoing_cost_estimated;
      if (peerCost !== null && curCost !== null && peerCost < curCost) {
        score += (curCost - peerCost) * 1.5;
        improvements++;
      }

      if (
        peer.return_1yr !== null &&
        current.return_1yr !== null &&
        peer.return_1yr > current.return_1yr
      ) {
        score += (peer.return_1yr - current.return_1yr) * 0.5;
        improvements++;
      }

      if (improvements > 0 && score > bestScore) {
        bestScore = score;
        best = peer;
      }
    }

    if (!best) continue;

    // Bygg upp reason-text
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
    });
  }

  return suggestions;
}

// ── Sammanfattningstext ───────────────────────────────────────────────────────
function buildSummary({
  categoryBreakdown,
  avgCost,
  weightedReturn1yr,
  weightedReturn3yr,
  weightedSharpe,
  notFound,
  totalWeight,
}: {
  categoryBreakdown: CategoryBreakdown[];
  avgCost: number | null;
  weightedReturn1yr: number | null;
  weightedReturn3yr: number | null;
  weightedSharpe: number | null;
  notFound: string[];
  totalWeight: number;
}): string {
  const lines: string[] = [];

  // Fördelning
  const top = categoryBreakdown.slice(0, 3);
  if (top.length > 0) {
    const desc = top
      .map((c) => `${c.weight.toFixed(0)}% ${c.label.toLowerCase()}`)
      .join(", ");
    lines.push(`Din portfölj består till ${desc}.`);
  }

  // Kostnad
  if (avgCost !== null) {
    if (avgCost < 0.5) {
      lines.push(`Den genomsnittliga avgiften är låg (${avgCost.toFixed(2)}%), vilket är bra för din långsiktiga avkastning.`);
    } else if (avgCost < 1.0) {
      lines.push(`Den genomsnittliga avgiften är ${avgCost.toFixed(2)}%, vilket är rimligt men det kan finnas billigare alternativ.`);
    } else {
      lines.push(`Den genomsnittliga avgiften är relativt hög (${avgCost.toFixed(2)}%). Det kan löna sig att se över fonderna.`);
    }
  }

  // Avkastning
  if (weightedReturn1yr !== null) {
    lines.push(`Förväntad avkastning (senaste 12 månader, viktad): ${weightedReturn1yr.toFixed(1)}%.`);
  }
  if (weightedReturn3yr !== null) {
    lines.push(`Annualiserad 3-årsavkastning (viktad): ${weightedReturn3yr.toFixed(1)}% per år.`);
  }

  // Risk
  if (weightedSharpe !== null) {
    if (weightedSharpe > 1) {
      lines.push(`Sharpe-kvoten är ${weightedSharpe.toFixed(2)}, vilket indikerar god riskjusterad avkastning.`);
    } else if (weightedSharpe > 0) {
      lines.push(`Sharpe-kvoten är ${weightedSharpe.toFixed(2)}, vilket är godkänt men det finns utrymme för förbättring.`);
    } else {
      lines.push(`Sharpe-kvoten är ${weightedSharpe.toFixed(2)}, vilket tyder på låg riskjusterad avkastning.`);
    }
  }

  // Vikter
  if (Math.abs(totalWeight - 100) > 0.01) {
    lines.push(`OBS: Vikterna summerar till ${totalWeight.toFixed(1)}%, inte 100%.`);
  }

  // Ej hittade
  if (notFound.length > 0) {
    lines.push(`Följande ISIN hittades inte i databasen: ${notFound.join(", ")}.`);
  }

  return lines.join(" ");
}
