import type { PortfolioAnalysis } from "./analysis";
import type { Custodian } from "./funds";
import type { Fund } from "./supabase";
import { computePortfolioScore, type PortfolioScoreResult } from "./portfolio-score";
import {
  buildMetricsSnapshot,
  decideNotification,
  deriveChangeReasons,
  getScoreDropThreshold,
  type NotificationDecision,
  type PortfolioMetricsSnapshot,
} from "./portfolio-watch";
import { analyzePortfolioEntries } from "./analysis-service";
import { sendPortfolioAlert } from "./email/send-portfolio-alert";
import type { SendEmailResult } from "./email/resend";

/**
 * Körningen bakom /api/cron/check-portfolios.
 *
 * Ligger utanför route-handlern och pratar med omvärlden genom {@link WatchStore}
 * och {@link WatchRunDeps}, så att hela beslutskedjan går att testa med en fejkad
 * store i stället för en riktig databas och riktiga utskick.
 *
 * Ordningen per portfölj är avsiktlig:
 *   1. hoppa över om portföljen redan kontrollerats mot den här fonddatan
 *   2. analysera om mot AKTUELL fonddata (inte den sparade snapshoten)
 *   3. skriv historikraden först — unikt index (portfolio_id, fund_data_version)
 *      gör att en omkörning stoppas här och aldrig når utskicket
 *   4. spara ny analys, betyg och delresultat
 *   5. skicka mejl bara om beslutsreglerna säger till
 *   6. bokför notisen först efter att Resend accepterat meddelandet
 */

// ── Datamodell ────────────────────────────────────────────────────────────────

export type WatchPortfolio = {
  id: string;
  user_id: string;
  name: string;
  custodian: string;
  holdings: { isin: string; weight: string | number }[];
  analysis: PortfolioAnalysis | null;
  score: number | null;
  last_notification_score: number | null;
  last_checked_fund_version: string | null;
};

export type HistoryRow = {
  portfolio_id: string;
  user_id: string;
  score: number;
  previous_score: number | null;
  score_delta: number | null;
  score_breakdown: PortfolioScoreResult;
  metrics: PortfolioMetricsSnapshot;
  analysis_snapshot: PortfolioAnalysis;
  reasons: string[];
  fund_data_version: string;
};

export type PortfolioPatch = {
  analysis: PortfolioAnalysis;
  score: number;
  score_breakdown: PortfolioScoreResult;
  last_checked_at: string;
  last_checked_fund_version: string;
};

export type NotificationRecord = {
  portfolioId: string;
  historyId: string | null;
  score: number;
  messageId: string | null;
  notifiedAt: string;
};

export interface WatchStore {
  /** Identifierare för aktuell fonddata, t.ex. max(funds.fetched_at). */
  getFundDataVersion(): Promise<string | null>;
  listPortfolios(): Promise<WatchPortfolio[]>;
  /** user_id → email_score_alerts. Saknad rad betyder påslaget (default TRUE). */
  getAlertPreferences(userIds: string[]): Promise<Map<string, boolean>>;
  getUserEmail(userId: string): Promise<string | null>;
  /** Senaste jämförelseunderlag per portfölj, för orsakshärledningen. */
  getPreviousMetrics(portfolioIds: string[]): Promise<Map<string, PortfolioMetricsSnapshot>>;
  /**
   * Skriv historikrad. `inserted: false` betyder att raden redan fanns —
   * körningen har alltså redan behandlat portföljen mot den här fonddatan.
   */
  insertHistory(row: HistoryRow): Promise<{ inserted: boolean; id: string | null }>;
  updatePortfolio(portfolioId: string, patch: PortfolioPatch): Promise<void>;
  markNotified(record: NotificationRecord): Promise<void>;
  markNotificationFailed(portfolioId: string): Promise<void>;
}

export type WatchRunDeps = {
  store: WatchStore;
  loadFunds?: (custodian: Custodian) => Promise<Fund[]>;
  analyze?: typeof analyzePortfolioEntries;
  sendAlert?: typeof sendPortfolioAlert;
  now?: () => Date;
  threshold?: number;
  /** Antal portföljer som behandlas samtidigt. */
  batchSize?: number;
  /**
   * Tidsbudget i millisekunder. När den passerats startas inga fler batchar och
   * återstoden rapporteras som `remaining`. Körningen är idempotent, så nästa
   * dagliga körning tar vid där den här slutade i stället för att timeouta.
   */
  timeBudgetMs?: number;
};

export type WatchRunResult = {
  fundDataVersion: string | null;
  checked: number;
  updated: number;
  improved: number;
  degraded: number;
  notified: number;
  skipped: number;
  failed: number;
  /** Portföljer som inte hanns med inom tidsbudgeten. */
  remaining: number;
  /** Antal per beslutsutfall — begripligt utan att avslöja vem eller vad. */
  decisions: Record<string, number>;
};

const DEFAULT_BATCH_SIZE = 5;

// ── Hjälpare ──────────────────────────────────────────────────────────────────

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function normalizeCustodian(value: string): Custodian {
  return value === "nordnet" || value === "övrigt" ? value : "avanza";
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ── Körning ───────────────────────────────────────────────────────────────────

export async function runPortfolioWatch(deps: WatchRunDeps): Promise<WatchRunResult> {
  const {
    store,
    analyze = analyzePortfolioEntries,
    sendAlert = sendPortfolioAlert,
    now = () => new Date(),
    threshold = getScoreDropThreshold(),
    batchSize = DEFAULT_BATCH_SIZE,
  } = deps;

  const result: WatchRunResult = {
    fundDataVersion: null,
    checked: 0,
    updated: 0,
    improved: 0,
    degraded: 0,
    notified: 0,
    skipped: 0,
    failed: 0,
    remaining: 0,
    decisions: {},
  };

  const fundDataVersion = await store.getFundDataVersion();
  if (!fundDataVersion) {
    // Utan fonddataversion går det inte att avgöra vad som redan behandlats.
    // Att köra ändå skulle kunna mejla samma förändring om och om igen.
    console.warn("[cron] ingen fonddataversion hittades — hoppar över körningen");
    return result;
  }
  result.fundDataVersion = fundDataVersion;

  const allPortfolios = await store.listPortfolios();

  // Portföljer som redan kontrollerats mot exakt den här fonddatan är klara.
  // Det är det som gör den dagliga körningen billig mellan fonduppdateringarna.
  const pending = allPortfolios.filter(
    (p) => p.last_checked_fund_version !== fundDataVersion
  );
  result.skipped += allPortfolios.length - pending.length;

  if (pending.length === 0) return result;

  const prefs = await store.getAlertPreferences([...new Set(pending.map((p) => p.user_id))]);

  // Fondunderlaget hämtas en gång per depå, inte en gång per portfölj. Det är
  // löftet som cachas, inte resultatet: portföljerna i en batch körs parallellt,
  // och med ett resultatcache hade alla hunnit se en tom cache och startat var
  // sin hämtning av samma fondlista.
  const fundCache = new Map<Custodian, Promise<Fund[]>>();
  const loadFunds = deps.loadFunds;
  async function fundsFor(custodian: Custodian): Promise<Fund[] | undefined> {
    if (!loadFunds) return undefined;
    let pendingFunds = fundCache.get(custodian);
    if (!pendingFunds) {
      pendingFunds = loadFunds(custodian);
      fundCache.set(custodian, pendingFunds);
    }
    return pendingFunds;
  }

  const bump = (decision: string) => {
    result.decisions[decision] = (result.decisions[decision] ?? 0) + 1;
  };

  const startedAt = now().getTime();
  const timeBudgetMs = deps.timeBudgetMs ?? Infinity;

  const batches = chunk(pending, batchSize);
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    if (now().getTime() - startedAt > timeBudgetMs) {
      result.remaining = batches.slice(i).reduce((n, b) => n + b.length, 0);
      console.warn(`[cron] tidsbudget slut — ${result.remaining} portföljer tas nästa körning`);
      break;
    }

    const previousMetrics = await store.getPreviousMetrics(batch.map((p) => p.id));

    // Promise.all är avgränsat till en batch, och varje portfölj fångar sina
    // egna fel — en trasig portfölj stoppar aldrig resten av körningen.
    await Promise.all(
      batch.map(async (portfolio) => {
        try {
          await checkOnePortfolio({
            portfolio,
            fundDataVersion,
            previousMetrics: previousMetrics.get(portfolio.id) ?? null,
            alertsEnabled: prefs.get(portfolio.user_id) ?? true,
            threshold,
            store,
            analyze,
            sendAlert,
            now,
            fundsFor,
            result,
            bump,
          });
        } catch (err) {
          result.failed++;
          const message = err instanceof Error ? err.message : String(err);
          // Portfölj-id är inte persondata; innehav och e-post loggas aldrig.
          console.error(`[cron] portfölj ${portfolio.id} misslyckades: ${message}`);
        }
      })
    );
  }

  return result;
}

type CheckOneArgs = {
  portfolio: WatchPortfolio;
  fundDataVersion: string;
  previousMetrics: PortfolioMetricsSnapshot | null;
  alertsEnabled: boolean;
  threshold: number;
  store: WatchStore;
  analyze: typeof analyzePortfolioEntries;
  sendAlert: typeof sendPortfolioAlert;
  now: () => Date;
  fundsFor: (custodian: Custodian) => Promise<Fund[] | undefined>;
  result: WatchRunResult;
  bump: (decision: string) => void;
};

async function checkOnePortfolio(args: CheckOneArgs): Promise<void> {
  const {
    portfolio, fundDataVersion, alertsEnabled, threshold,
    store, analyze, sendAlert, now, fundsFor, result, bump,
  } = args;

  const custodian = normalizeCustodian(portfolio.custodian);
  const entries = (portfolio.holdings ?? []).map((h) => ({
    isin: String(h.isin),
    weight: toNumber(h.weight),
  }));

  if (entries.length === 0) {
    result.skipped++;
    bump("no-holdings");
    return;
  }

  // Steg 2: analysera om mot AKTUELL fonddata. Det är hela poängen — den gamla
  // implementationen räknade om betyget på portföljens sparade analys-snapshot,
  // så betyget kunde aldrig ändras när fonddatan gjorde det.
  const funds = await fundsFor(custodian);
  const { analysis: newAnalysis, entries: resolvedEntries } = await analyze(
    entries,
    custodian,
    funds ? { funds } : {}
  );

  const scoreResult = computePortfolioScore(newAnalysis);
  const newScore = scoreResult.score;
  const previousScore = toNullableNumber(portfolio.score);

  const nextMetrics = buildMetricsSnapshot(newAnalysis, resolvedEntries);
  // Föregående underlag: i första hand historikens metrics (har nyckeltal per
  // fond), annars portföljens sparade analys.
  const prevMetrics =
    args.previousMetrics ??
    (portfolio.analysis ? buildMetricsSnapshot(portfolio.analysis) : null);

  const reasons = deriveChangeReasons(prevMetrics, nextMetrics).map((r) => r.text);

  // Steg 3: historiken först. Unikt index (portfolio_id, fund_data_version)
  // gör insert till körningens idempotensspärr.
  const history = await store.insertHistory({
    portfolio_id: portfolio.id,
    user_id: portfolio.user_id,
    score: newScore,
    previous_score: previousScore,
    score_delta: previousScore === null ? null : Number((newScore - previousScore).toFixed(2)),
    score_breakdown: scoreResult,
    metrics: nextMetrics,
    analysis_snapshot: newAnalysis,
    reasons,
    fund_data_version: fundDataVersion,
  });

  if (!history.inserted) {
    result.skipped++;
    bump("already-processed");
    return;
  }

  result.checked++;

  // Steg 4: spara ny analys, betyg och delresultat.
  await store.updatePortfolio(portfolio.id, {
    analysis: newAnalysis,
    score: newScore,
    score_breakdown: scoreResult,
    last_checked_at: now().toISOString(),
    last_checked_fund_version: fundDataVersion,
  });
  result.updated++;

  if (previousScore !== null) {
    if (newScore > previousScore) result.improved++;
    else if (newScore < previousScore) result.degraded++;
  }

  const decision: NotificationDecision = decideNotification({
    previousScore,
    newScore,
    lastNotifiedScore: toNullableNumber(portfolio.last_notification_score),
    alertsEnabled,
    threshold,
  });
  bump(decision);

  if (decision !== "notify") return;

  const email = await store.getUserEmail(portfolio.user_id);
  if (!email) {
    bump("no-email");
    return;
  }

  const sendResult: SendEmailResult = await sendAlert({
    to: email,
    userId: portfolio.user_id,
    portfolioId: portfolio.id,
    portfolioName: portfolio.name,
    previousScore: previousScore as number,
    newScore,
    reasons,
    fundDataVersion,
  });

  // Steg 6: tidsstämpeln sätts bara när Resend faktiskt accepterat meddelandet.
  // Ett överhoppat utskick (testläge, saknad nyckel) räknas inte som skickat —
  // annars skulle en riktig försämring aldrig mejlas när nyckeln väl finns.
  if (!sendResult.ok) {
    await store.markNotificationFailed(portfolio.id);
    result.failed++;
    bump(sendResult.skipped ? "send-skipped" : "send-failed");
    return;
  }

  await store.markNotified({
    portfolioId: portfolio.id,
    historyId: history.id,
    score: newScore,
    messageId: sendResult.messageId,
    notifiedAt: now().toISOString(),
  });
  result.notified++;
}
