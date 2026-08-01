import type { PortfolioAnalysis, PortfolioEntry } from "./analysis";

/**
 * Beslutsregler och orsakshärledning för automatisk portföljbevakning.
 *
 * Modulen är avsiktligt fri från I/O — inga Supabase-anrop, ingen e-post, ingen
 * miljöläsning utöver tröskeln. Allt som avgör OM ett mejl ska skickas och VAD
 * det ska säga går därför att testa utan att köra cron-jobbet.
 */

// ── Tröskel ───────────────────────────────────────────────────────────────────

export const DEFAULT_SCORE_DROP_THRESHOLD = 0.5;

/**
 * Tröskeln i poäng på 0–10-skalan. Konfigurerbar via
 * PORTFOLIO_SCORE_DROP_THRESHOLD. Ogiltiga eller icke-positiva värden faller
 * tillbaka på standardvärdet i stället för att tysta all bevakning.
 */
export function getScoreDropThreshold(
  env: Record<string, string | undefined> = process.env
): number {
  const raw = env.PORTFOLIO_SCORE_DROP_THRESHOLD;
  if (raw === undefined || raw === "") return DEFAULT_SCORE_DROP_THRESHOLD;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_SCORE_DROP_THRESHOLD;
  return parsed;
}

// ── Jämförelseunderlag ────────────────────────────────────────────────────────

export type FundMetric = {
  isin: string;
  sharpe3yr: number | null;
  return3yr: number | null;
  cost: number | null;
};

export type PortfolioMetricsSnapshot = {
  avgCost: number | null;
  weightedSharpe: number | null;
  weightedReturn3yr: number | null;
  /** Antal kategorier med mer än 5 % vikt — samma mått som betygets diversifiering. */
  diversifiedCategories: number;
  /** Antal innehav utan fonddata alls. */
  notFoundCount: number;
  /** Antal innehav som saknar minst ett av avgift, 3 års avkastning och Sharpe. */
  missingMetricCount: number;
  swapSuggestionCount: number;
  funds: FundMetric[];
};

function countDiversifiedCategories(analysis: PortfolioAnalysis): number {
  const source = analysis.detailedBreakdown ?? analysis.categoryBreakdown;
  if (!source?.length) return 0;
  return source.filter((c) => c.weight > 5).length;
}

/**
 * Kompakt underlag som sparas i historiken och jämförs vid nästa kontroll.
 * Innehåller nyckeltal per ISIN men varken namn, belopp eller persondata.
 *
 * `entries` finns bara när snapshoten byggs i samband med en ny analys. För
 * gamla historikrader och för portföljens sparade analysis-snapshot faller vi
 * tillbaka på portföljnivåns nyckeltal, vilket räcker för de flesta orsaker.
 */
export function buildMetricsSnapshot(
  analysis: PortfolioAnalysis,
  entries?: PortfolioEntry[]
): PortfolioMetricsSnapshot {
  const funds: FundMetric[] = (entries ?? [])
    .filter((e) => e.fund)
    .map((e) => ({
      isin: e.isin,
      sharpe3yr: e.fund!.sharpe_3yr ?? null,
      return3yr: e.fund!.return_3yr ?? null,
      cost: e.fund!.ongoing_cost_actual ?? e.fund!.ongoing_cost_estimated ?? null,
    }));

  const missingMetricCount = funds.filter(
    (f) => f.sharpe3yr === null || f.return3yr === null || f.cost === null
  ).length;

  return {
    avgCost: analysis.avgCost ?? null,
    weightedSharpe: analysis.weightedSharpe ?? null,
    weightedReturn3yr: analysis.weightedReturn3yr ?? null,
    diversifiedCategories: countDiversifiedCategories(analysis),
    notFoundCount: analysis.notFound?.length ?? 0,
    missingMetricCount,
    swapSuggestionCount: analysis.swapSuggestions?.length ?? 0,
    funds,
  };
}

// ── Orsaker ───────────────────────────────────────────────────────────────────

export type ChangeReason = {
  /** Stabil nyckel för test och loggning. */
  key:
    | "sharpe"
    | "return3yr"
    | "cost"
    | "funds-behind-peers"
    | "diversification"
    | "stale-data";
  /** Färdig mening på svenska. Beskrivande — aldrig en köp- eller säljuppmaning. */
  text: string;
  /** Intern rangordning, högre = visas först. */
  weight: number;
};

export const MAX_REASONS = 3;

// Minsta rörelse som räknas som en verklig förändring och inte brus i källdatan.
const SHARPE_EPS = 0.05;
const RETURN_EPS = 0.5;   // procentenheter
const COST_EPS   = 0.02;  // procentenheter

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

function fundsWithLowerSharpe(
  prev: PortfolioMetricsSnapshot,
  next: PortfolioMetricsSnapshot
): number {
  if (prev.funds.length === 0 || next.funds.length === 0) return 0;
  const prevByIsin = new Map(prev.funds.map((f) => [f.isin, f]));
  let count = 0;
  for (const f of next.funds) {
    const before = prevByIsin.get(f.isin);
    if (!before) continue;
    if (before.sharpe3yr === null || f.sharpe3yr === null) continue;
    if (before.sharpe3yr - f.sharpe3yr >= SHARPE_EPS) count++;
  }
  return count;
}

/**
 * Härled de viktigaste orsakerna till att betyget gått ned, genom att jämföra
 * föregående och ny analys. Max {@link MAX_REASONS} orsaker.
 *
 * Formuleringarna beskriver vad som förändrats i datan. De innehåller
 * medvetet ingen rekommendation om att köpa, sälja eller byta något.
 */
export function deriveChangeReasons(
  prev: PortfolioMetricsSnapshot | null,
  next: PortfolioMetricsSnapshot
): ChangeReason[] {
  if (!prev) return [];

  const reasons: ChangeReason[] = [];

  if (
    prev.weightedSharpe !== null &&
    next.weightedSharpe !== null &&
    prev.weightedSharpe - next.weightedSharpe >= SHARPE_EPS
  ) {
    const diff = prev.weightedSharpe - next.weightedSharpe;
    reasons.push({
      key: "sharpe",
      weight: 100 * diff,
      text: `Portföljens riskjusterade avkastning (Sharpe) har försämrats, från ${fmt(prev.weightedSharpe, 2)} till ${fmt(next.weightedSharpe, 2)}.`,
    });
  }

  if (
    prev.weightedReturn3yr !== null &&
    next.weightedReturn3yr !== null &&
    prev.weightedReturn3yr - next.weightedReturn3yr >= RETURN_EPS
  ) {
    const diff = prev.weightedReturn3yr - next.weightedReturn3yr;
    reasons.push({
      key: "return3yr",
      weight: 8 * diff,
      text: `Den historiska treårsavkastningen har gått ned, från ${fmt(prev.weightedReturn3yr, 1)} % till ${fmt(next.weightedReturn3yr, 1)} %.`,
    });
  }

  if (
    prev.avgCost !== null &&
    next.avgCost !== null &&
    next.avgCost - prev.avgCost >= COST_EPS
  ) {
    const diff = next.avgCost - prev.avgCost;
    reasons.push({
      key: "cost",
      weight: 120 * diff,
      text: `Den genomsnittliga avgiften har ökat, från ${fmt(prev.avgCost, 2)} % till ${fmt(next.avgCost, 2)} %.`,
    });
  }

  const lagging = fundsWithLowerSharpe(prev, next);
  if (lagging > 0) {
    reasons.push({
      key: "funds-behind-peers",
      weight: 30 + 10 * lagging,
      text: `${lagging === 1 ? "En" : lagging} av dina fonder har lägre riskjusterad avkastning än vid förra kontrollen.`,
    });
  }

  if (next.diversifiedCategories < prev.diversifiedCategories) {
    reasons.push({
      key: "diversification",
      weight: 40,
      text: `Portföljen är mer koncentrerad än tidigare — ${next.diversifiedCategories} ${plural(next.diversifiedCategories, "kategori väger", "kategorier väger")} nu mer än 5 %, mot ${prev.diversifiedCategories} tidigare.`,
    });
  }

  const staleBefore = prev.notFoundCount + prev.missingMetricCount;
  const staleNow = next.notFoundCount + next.missingMetricCount;
  if (staleNow > staleBefore) {
    const diff = staleNow - staleBefore;
    reasons.push({
      key: "stale-data",
      weight: 25,
      text: `Fonddata saknas eller är inaktuell för ${diff} innehav fler än vid förra kontrollen.`,
    });
  }

  return reasons.sort((a, b) => b.weight - a.weight).slice(0, MAX_REASONS);
}

function fmt(n: number, decimals: number): string {
  return n.toLocaleString("sv-SE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Betyg formaterat som i gränssnittet: en decimal, svenskt decimaltecken. */
export function formatScore(n: number): string {
  return fmt(n, 1);
}

// ── Notifieringsbeslut ────────────────────────────────────────────────────────

export type NotificationDecision =
  /** Första beräkningen — bara en baslinje sparas. */
  | "baseline"
  | "improved"
  | "unchanged"
  | "below-threshold"
  | "alerts-disabled"
  /** Exakt samma nya betyg har redan mejlats — samma förändring, inte en ny. */
  | "already-notified"
  | "notify";

export type NotificationInput = {
  previousScore: number | null;
  newScore: number;
  /** Betyget vid det senast SKICKADE mejlet, om något. */
  lastNotifiedScore: number | null;
  alertsEnabled: boolean;
  threshold: number;
};

// Betyget lagras med två decimaler; mindre skillnader är avrundningsbrus.
const SCORE_EPS = 0.005;

export function decideNotification(input: NotificationInput): NotificationDecision {
  const { previousScore, newScore, lastNotifiedScore, alertsEnabled, threshold } = input;

  // Baslinjen går före allt annat: en portfölj utan tidigare betyg får aldrig
  // ett mejl om att något "försämrats", eftersom det inte finns något att
  // jämföra med.
  if (previousScore === null || previousScore === undefined) return "baseline";

  const drop = previousScore - newScore;
  if (drop <= SCORE_EPS) {
    return newScore - previousScore > SCORE_EPS ? "improved" : "unchanged";
  }
  if (drop + SCORE_EPS < threshold) return "below-threshold";

  // Inställningen kollas efter tröskeln så att loggen skiljer på "inget att
  // rapportera" och "hade rapporterats om användaren ville".
  if (!alertsEnabled) return "alerts-disabled";

  // Samma betyg har redan mejlats — fonddatan har ändrats men resultatet för
  // användaren är oförändrat sedan förra utskicket.
  if (lastNotifiedScore !== null && Math.abs(lastNotifiedScore - newScore) <= SCORE_EPS) {
    return "already-notified";
  }

  return "notify";
}
