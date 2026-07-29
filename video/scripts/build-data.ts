/**
 * Härleder videons siffror ur den faktiska fonddatan i data/avanza-funds.json
 * och skriver src/data/portfolio.generated.ts.
 *
 *   npm run build:data
 *
 * Inget i videon får vara handknackat: portföljbetyget räknas med exakt samma
 * trösklar som lib/portfolio-score.ts och nyckeltalen viktas som i
 * lib/analysis.ts. Ändras formeln på sajten ska den ändras här och scriptet
 * köras om.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const FUNDS_JSON = path.join(ROOT, "..", "data", "avanza-funds.json");

type RawFund = {
  name: string;
  isin: string;
  category: string;
  investment_type: string | null;
  return_1yr: number | null;
  return_3yr: number | null;
  sharpe_3yr: number | null;
  ongoing_cost_actual: number | null;
  ongoing_cost_estimated: number | null;
};

/**
 * En typisk svensk banksparportfölj: fyra aktivt förvaltade fonder från de stora
 * bankerna. Vikterna är exempelvikter — fonderna och deras nyckeltal är äkta.
 */
const HOLDINGS: { isin: string; weight: number }[] = [
  { isin: "SE0000542979", weight: 35 }, // Swedbank Robur Globalfond A
  { isin: "SE0000996233", weight: 25 }, // Swedbank Robur Sverige A
  { isin: "SE0000837205", weight: 25 }, // Länsförsäkringar Global Vision A
  { isin: "SE0019019654", weight: 15 }, // Handelsbanken Global Digital
];

/** Billigare alternativ i samma kategori. Sista posten byts inte ut. */
const SWAPS: { from: string; to: string }[] = [
  { from: "SE0000542979", to: "SE0015382114" }, // → Handelsbanken Global Momentum
  { from: "SE0000996233", to: "SE0013801255" }, // → Handelsbanken Sverige 100 Index
  { from: "SE0000837205", to: "SE0005188836" }, // → Länsförsäkringar Global Index
];

/** Kapital som "kr per år"-siffran räknas på — samma som analyssidans antagande. */
const ASSUMED_CAPITAL = 100_000;

/** Fonder som får en egen video i FeeVideo-formatet (en video per fond). */
const FUND_VIDEO_ISINS = [
  "SE0000996233", // Swedbank Robur Sverige A
  "SE0000837205", // Länsförsäkringar Global Vision A
];

/** Slugg av fondnamnet — styr utfilens namn och vilken skärminspelning som plockas. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const cost = (f: RawFund) => f.ongoing_cost_actual ?? f.ongoing_cost_estimated;

function weighted(
  items: { fund: RawFund; weight: number }[],
  pick: (f: RawFund) => number | null,
): number | null {
  const usable = items.filter((i) => pick(i.fund) !== null);
  const total = usable.reduce((s, i) => s + i.weight, 0);
  if (total === 0) return null;
  return usable.reduce((s, i) => s + (i.weight / total) * pick(i.fund)!, 0);
}

/** Samma trösklar och samma oviktade medelvärde som lib/portfolio-score.ts. */
function score(m: {
  avgCost: number | null;
  weightedSharpe: number | null;
  weightedReturn3yr: number | null;
  distinctCategories: number;
}): { score: number; label: string } {
  let total = 0;
  let count = 0;
  const add = (p: number) => {
    total += p;
    count++;
  };

  if (m.avgCost !== null) {
    add(m.avgCost < 0.2 ? 10 : m.avgCost < 0.4 ? 8 : m.avgCost < 0.6 ? 6 : m.avgCost < 0.9 ? 4 : 2);
  }
  if (m.weightedSharpe !== null) {
    add(
      m.weightedSharpe > 1.2 ? 10 : m.weightedSharpe > 0.8 ? 8 : m.weightedSharpe > 0.5 ? 6 : m.weightedSharpe > 0.2 ? 4 : 2,
    );
  }
  if (m.weightedReturn3yr !== null) {
    const r = m.weightedReturn3yr;
    add(r > 40 ? 10 : r > 25 ? 9 : r > 15 ? 8 : r > 8 ? 7 : r > 3 ? 5 : 2);
  }
  const n = m.distinctCategories;
  add(n >= 4 ? 10 : n === 3 ? 8 : n === 2 ? 5 : 2);

  const value = count > 0 ? Math.round((total / count) * 10) / 10 : 5.0;
  const label =
    value >= 8.5 ? "Utmärkt" : value >= 7 ? "Bra" : value >= 5.5 ? "OK" : value >= 4 ? "Kan förbättras" : "Behöver ses över";
  return { score: value, label };
}

function metricsFor(items: { fund: RawFund; weight: number }[]) {
  const distinct = new Set(items.filter((i) => i.weight > 5).map((i) => i.fund.category)).size;
  const avgCost = weighted(items, cost);
  const weightedReturn1yr = weighted(items, (f) => f.return_1yr);
  const weightedReturn3yr = weighted(items, (f) => f.return_3yr);
  const weightedSharpe = weighted(items, (f) => f.sharpe_3yr);
  return {
    avgCost,
    weightedReturn1yr,
    weightedReturn3yr,
    weightedSharpe,
    ...score({ avgCost, weightedSharpe, weightedReturn3yr, distinctCategories: distinct }),
  };
}

function main() {
  const { funds } = JSON.parse(fs.readFileSync(FUNDS_JSON, "utf8")) as { funds: RawFund[] };
  const byIsin = new Map(funds.map((f) => [f.isin, f]));

  const need = (isin: string): RawFund => {
    const f = byIsin.get(isin);
    if (!f) throw new Error(`Hittar ingen fond med ISIN ${isin} i avanza-funds.json`);
    if (cost(f) === null) throw new Error(`${f.name} saknar avgift`);
    return f;
  };

  const current = HOLDINGS.map((h) => ({ fund: need(h.isin), weight: h.weight }));
  const swapMap = new Map(SWAPS.map((s) => [s.from, s.to]));
  const suggested = current.map((h) => {
    const to = swapMap.get(h.fund.isin);
    return { fund: to ? need(to) : h.fund, weight: h.weight };
  });

  const currentMetrics = metricsFor(current);
  const suggestedMetrics = metricsFor(suggested);

  const feeSaving =
    currentMetrics.avgCost !== null && suggestedMetrics.avgCost !== null
      ? ((currentMetrics.avgCost - suggestedMetrics.avgCost) / 100) * ASSUMED_CAPITAL
      : 0;

  // Tillgångsslag härlett ur kategoritexten — grovt men speglar analyssidans
  // uppdelning i aktie-/ränte-/branschexponering.
  const allocation = Object.entries(
    current.reduce<Record<string, number>>((acc, h) => {
      const key = h.fund.category.startsWith("Branschfond")
        ? "Branschfonder"
        : h.fund.category.startsWith("Sverige")
          ? "Sverige"
          : "Global";
      acc[key] = (acc[key] ?? 0) + h.weight;
      return acc;
    }, {}),
  )
    .map(([label, weight]) => ({ label, weight }))
    .sort((a, b) => b.weight - a.weight);

  const activeShare = current
    .filter((h) => h.fund.investment_type === "ACTIVE")
    .reduce((s, h) => s + h.weight, 0);

  // Per-fond-videorna: kategorisnittet och det billigaste alternativet i samma
  // kategori räknas fram ur hela datasetet, inte handplockat.
  const fundVideos = FUND_VIDEO_ISINS.map((isin) => {
    const fund = need(isin);
    const peers = funds.filter((f) => f.category === fund.category && cost(f) !== null);
    const categoryAverageFee = peers.reduce((s, f) => s + cost(f)!, 0) / peers.length;
    const alternative = peers
      .filter((f) => f.isin !== fund.isin && f.return_3yr !== null)
      .sort((a, b) => cost(a)! - cost(b)!)[0];
    if (!alternative) throw new Error(`Inget alternativ i kategorin ${fund.category}`);
    return {
      slug: slugify(fund.name),
      name: fund.name,
      category: fund.category,
      fee: round(cost(fund)),
      categoryAverageFee: round(categoryAverageFee),
      alternativeName: alternative.name,
      alternativeFee: round(cost(alternative)),
    };
  });

  const out = `// GENERERAD FIL — ändra inte för hand.
// Skapad av scripts/build-data.ts ur data/avanza-funds.json.
// Kör \`npm run build:data\` för att uppdatera.

export type Holding = {
  name: string;
  category: string;
  weight: number;
  cost: number;
  isActive: boolean;
};

export type Swap = {
  currentName: string;
  suggestedName: string;
  currentCost: number;
  suggestedCost: number;
};

export type PortfolioMetrics = {
  avgCost: number;
  return1yr: number;
  return3yr: number;
  sharpe: number;
  score: number;
  label: string;
};

export const HOLDINGS: Holding[] = ${JSON.stringify(
    current.map((h) => ({
      name: h.fund.name,
      category: h.fund.category,
      weight: h.weight,
      cost: cost(h.fund),
      isActive: h.fund.investment_type === "ACTIVE",
    })),
    null,
    2,
  )};

export const CURRENT: PortfolioMetrics = ${JSON.stringify(
    {
      avgCost: round(currentMetrics.avgCost),
      return1yr: round(currentMetrics.weightedReturn1yr),
      return3yr: round(currentMetrics.weightedReturn3yr),
      sharpe: round(currentMetrics.weightedSharpe),
      score: currentMetrics.score,
      label: currentMetrics.label,
    },
    null,
    2,
  )};

export const SUGGESTED: PortfolioMetrics = ${JSON.stringify(
    {
      avgCost: round(suggestedMetrics.avgCost),
      return1yr: round(suggestedMetrics.weightedReturn1yr),
      return3yr: round(suggestedMetrics.weightedReturn3yr),
      sharpe: round(suggestedMetrics.weightedSharpe),
      score: suggestedMetrics.score,
      label: suggestedMetrics.label,
    },
    null,
    2,
  )};

export const SWAPS: Swap[] = ${JSON.stringify(
    SWAPS.map((s) => {
      const from = need(s.from);
      const to = need(s.to);
      return {
        currentName: from.name,
        suggestedName: to.name,
        currentCost: cost(from),
        suggestedCost: cost(to),
      };
    }),
    null,
    2,
  )};

export const ALLOCATION: { label: string; weight: number }[] = ${JSON.stringify(allocation, null, 2)};

/** Andel av portföljvikten som ligger i aktivt förvaltade fonder. */
export const ACTIVE_SHARE = ${activeShare};

/** Kapitalet "kr per år"-siffran räknas på. */
export const ASSUMED_CAPITAL = ${ASSUMED_CAPITAL};

/** Skillnad i avgiftskostnad per år vid ASSUMED_CAPITAL. Endast avgift — ingen avkastningsprognos. */
export const FEE_SAVING_PER_YEAR = ${Math.round(feeSaving)};

export type FundVideoData = {
  slug: string;
  name: string;
  category: string;
  fee: number;
  categoryAverageFee: number;
  alternativeName: string;
  alternativeFee: number;
};

/** Underlag till FeeVideo — en video per fond. Kategorisnitt räknat över hela datasetet. */
export const FUND_VIDEOS: FundVideoData[] = ${JSON.stringify(fundVideos, null, 2)};
`;

  fs.writeFileSync(path.join(ROOT, "src", "data", "portfolio.generated.ts"), out);

  console.log("Skrev src/data/portfolio.generated.ts");
  console.table({
    nuvarande: {
      avgift: round(currentMetrics.avgCost),
      "3 år": round(currentMetrics.weightedReturn3yr),
      sharpe: round(currentMetrics.weightedSharpe),
      betyg: `${currentMetrics.score} (${currentMetrics.label})`,
    },
    förslag: {
      avgift: round(suggestedMetrics.avgCost),
      "3 år": round(suggestedMetrics.weightedReturn3yr),
      sharpe: round(suggestedMetrics.weightedSharpe),
      betyg: `${suggestedMetrics.score} (${suggestedMetrics.label})`,
    },
  });
  console.log(`Avgiftsskillnad vid ${ASSUMED_CAPITAL} kr: ${Math.round(feeSaving)} kr/år`);
}

function round(n: number | null): number {
  return n === null ? 0 : Math.round(n * 100) / 100;
}

main();
