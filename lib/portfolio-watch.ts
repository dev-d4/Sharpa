import type { PortfolioAnalysis, PortfolioEntry } from "./analysis";
import { computePortfolioScore, type ScoreComponent, type ScoreComponentKey } from "./portfolio-score";

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
  /**
   * Betygets delpoäng vid den här kontrollen. Jämförelsen mellan två snapshots
   * är det som gör att orsakerna i mejlet alltid förklarar det betygsfall som
   * utlöste mejlet. Saknas fältet är snapshoten från före den här ändringen —
   * då faller {@link deriveChangeReasons} tillbaka på nyckeltalsjämförelsen.
   */
  scoreComponents?: ScoreComponent[];
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
    scoreComponents: computePortfolioScore(analysis).components,
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
 * Generisk formulering per betygsdimension. Används när delpoängen bevisligen
 * sjunkit men de underliggande nyckeltalen rört sig för lite för att få en egen
 * mening — t.ex. när avgiften kryssat över en tröskel med några hundradelar.
 */
const COMPONENT_FALLBACK_TEXT: Record<ScoreComponentKey, string> = {
  cost: "Portföljens avgiftsnivå väger nu ned betyget mer än vid förra kontrollen.",
  sharpe:
    "Portföljens riskjusterade avkastning (Sharpe) väger nu ned betyget mer än vid förra kontrollen.",
  return3yr:
    "Portföljens historiska treårsavkastning väger nu ned betyget mer än vid förra kontrollen.",
  diversification:
    "Portföljens spridning mellan kategorier väger nu ned betyget mer än vid förra kontrollen.",
};

/** Delpoäng per dimension, för dimensioner som gick att beräkna båda gångerna. */
function componentDrops(
  prev: PortfolioMetricsSnapshot,
  next: PortfolioMetricsSnapshot
): Map<ScoreComponentKey, number> | null {
  if (!prev.scoreComponents?.length || !next.scoreComponents?.length) return null;

  const before = new Map(prev.scoreComponents.map((c) => [c.key, c.points]));
  const drops = new Map<ScoreComponentKey, number>();
  for (const c of next.scoreComponents) {
    const p = before.get(c.key);
    if (p === undefined) continue;
    if (p - c.points > 0) drops.set(c.key, p - c.points);
  }
  return drops;
}

/**
 * Härled de viktigaste orsakerna till att betyget gått ned, genom att jämföra
 * föregående och ny analys. Max {@link MAX_REASONS} orsaker.
 *
 * Finns delpoäng i båda snapshots styr de urvalet: en dimension som faktiskt
 * dragit ned betyget får alltid en mening, även när nyckeltalen rört sig för
 * lite för en detaljerad formulering. Det är det som garanterar att ett mejl om
 * ett betygsfall aldrig går ut utan en förklaring till fallet.
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

  const drops = componentDrops(prev, next);

  // Utan delpoäng i båda snapshots (historikrader skrivna före den här
  // ändringen) finns inget urval att göra — då gäller ren nyckeltalsjämförelse.
  if (!drops) return reasons.sort((a, b) => b.weight - a.weight).slice(0, MAX_REASONS);

  const byKey = new Map(reasons.map((r) => [r.key, r]));
  const explained: ChangeReason[] = [];

  // Dimensioner som bevisligen dragit ned betyget, störst fall först. Har
  // dimensionen en detaljerad mening används den — annars den generiska.
  for (const [key, drop] of [...drops].sort((a, b) => b[1] - a[1])) {
    const detailed = byKey.get(key);
    explained.push(
      detailed
        ? { ...detailed, weight: 1000 + drop }
        : { key, weight: 1000 + drop, text: COMPONENT_FALLBACK_TEXT[key] }
    );
  }

  // Orsaker utan egen betygsdimension (eftersläpande fonder, saknad fonddata)
  // hamnar under, som komplement när det finns plats kvar.
  for (const r of reasons) {
    if (!drops.has(r.key as ScoreComponentKey)) explained.push(r);
  }

  return explained.sort((a, b) => b.weight - a.weight).slice(0, MAX_REASONS);
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
  /**
   * Betyget vid det senast SKICKADE mejlet, om något. Utgör tillsammans med
   * föregående betyg baslinjen som tröskeln mäts mot.
   */
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

  // Jämförelsen görs mot det högsta av föregående betyg och det senast MEJLADE
  // betyget. Annars kan en portfölj glida nedåt i steg strax under tröskeln —
  // 8,0 → 7,6 → 7,2 → 6,8 — utan att ett enda steg räknas som en försämring,
  // trots att användaren sedan förra beskedet tappat långt över tröskeln.
  const baseline =
    lastNotifiedScore === null ? previousScore : Math.max(previousScore, lastNotifiedScore);

  // "Förbättrad" och "oförändrad" avgörs mot föregående kontroll, inte mot
  // baslinjen: det beskriver vad som hände sedan sist och används bara i loggen.
  if (newScore - previousScore > SCORE_EPS) return "improved";

  const drop = baseline - newScore;
  if (drop <= SCORE_EPS) return "unchanged";
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
