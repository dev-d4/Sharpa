import { Fund } from "./supabase";
import fs from "fs";
import path from "path";

// ── Raw shape returned by Avanza's fund-guide list API ────────────────────────
interface AvanzaFund {
  isin: string;
  name: string;
  currencyCode: string;
  fundType: string;
  category: string;
  managedType: string | null;
  developmentThisYear: number | null;
  developmentOneYear: number | null;
  developmentThreeYears: number | null;
  developmentFiveYears: number | null;
  standardDeviation: number | null;
  sharpeRatio: number | null;
  totalFee: number | null;
  managementFee: number | null;
  esgScore: number | null;
  orderbookId: string;
}

const FUND_TYPE_TO_CATEGORY_GROUP: Record<string, string> = {
  EQUITY_FUND: "Equity",
  BOND_FUND: "Fixed Income",
  MIXED_FUND: "Allocation",
  HEDGE_FUND: "Alternative",
  MONEY_MARKET_FUND: "Money Market",
  FUND_OF_FUNDS: "Allocation",
};

// Convert cumulative multi-year return to annualised %
function annualize(cumulative: number | null, years: number): number | null {
  if (cumulative === null) return null;
  return (Math.pow(1 + cumulative / 100, 1 / years) - 1) * 100;
}

function mapAvanzaToFund(f: AvanzaFund, index: number): Fund {
  return {
    id: parseInt(f.orderbookId) || index,
    name: f.name,
    base_currency: f.currencyCode ?? "SEK",
    isin: f.isin,
    category_group: FUND_TYPE_TO_CATEGORY_GROUP[f.fundType] ?? "Other",
    category: f.category ?? null,
    global_category: null,
    equity_style_box: null,
    return_ytd: f.developmentThisYear ?? null,
    return_1yr: f.developmentOneYear ?? null,
    return_2yr: null,
    return_3yr: annualize(f.developmentThreeYears, 3),
    return_5yr: annualize(f.developmentFiveYears, 5),
    investment_type: f.managedType ?? null,
    std_dev_3yr: f.standardDeviation ?? null,
    std_dev_1yr: null,
    sharpe_3yr: f.sharpeRatio ?? null,
    alpha_3yr: null,
    beta_3yr: null,
    sri_value: f.esgScore ?? null,
    ongoing_cost_actual: f.totalFee ?? null,
    ongoing_cost_estimated: f.managementFee ?? null,
  };
}

// ── File-based cache (30 days) ────────────────────────────────────────────────
const CACHE_FILE = path.join(process.cwd(), "data", "avanza-funds.json");
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CacheFile {
  fetchedAt: number;
  funds: Fund[];
}

function readCache(): Fund[] | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    const cache: CacheFile = JSON.parse(raw);
    if (Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      return cache.funds;
    }
  } catch {
    // File doesn't exist or is corrupt — treat as cache miss
  }
  return null;
}

function writeCache(funds: Fund[]): void {
  const cache: CacheFile = { fetchedAt: Date.now(), funds };
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), "utf-8");
}

const PAGE_SIZE = 20;
const API_URL =
  "https://www.avanza.se/_api/fund-guide/list?shouldCheckFundExcludedFromPromotion=true";
const HEADERS = {
  "Content-Type": "application/json;charset=UTF-8",
  Accept: "application/json, text/plain, */*",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Safari/605.1.15",
};

function buildBody(startIndex: number) {
  return JSON.stringify({
    startIndex,
    managedType: "ANY",
    svanenMark: false,
    commonRegionFilter: [],
    otherRegionFilter: [],
    alignmentFilter: [],
    industryFilter: [],
    fundTypeFilter: [],
    interestTypeFilter: [],
    sortField: "developmentThreeYears",
    sortDirection: "DESCENDING",
    name: "",
    recommendedHoldingPeriodFilter: [],
    companyFilter: [],
    productInvolvementsFilter: [],
    ratingFilter: [],
    riskFilter: [],
    sustainabilityRatingFilter: [],
    environmentalRatingFilter: [],
    socialRatingFilter: [],
    governanceRatingFilter: [],
    sustainableDevelopmentGoalsAlignmentFilter: [],
    euArticleTypeFilter: [],
    maxTotalFee: null,
    cashDividends: false,
  });
}

function extractPage(data: unknown): { funds: AvanzaFund[]; total: number } {
  if (Array.isArray(data)) {
    return { funds: data as AvanzaFund[], total: (data as AvanzaFund[]).length };
  }
  const d = data as Record<string, unknown>;
  const funds = (d.fundListViews as AvanzaFund[]) ?? [];
  const total = (d.totalNoFunds as number) ?? funds.length;
  return { funds, total };
}

async function fetchFromAvanza(): Promise<Fund[]> {
  // Fetch first page to discover total count
  const firstRes = await fetch(API_URL, {
    method: "POST",
    headers: HEADERS,
    body: buildBody(0),
  });
  if (!firstRes.ok) throw new Error(`Avanza API svarade med ${firstRes.status}`);

  const firstData = await firstRes.json();
  const { funds: firstPage, total } = extractPage(firstData);

  console.log(
    `[avanza] total=${total} first page=${firstPage.length} top-level keys=${Object.keys(firstData as object).join(",")}`
  );

  const all: AvanzaFund[] = [...firstPage];

  // Fetch remaining pages in small batches to avoid hammering the API
  if (total > PAGE_SIZE) {
    const offsets: number[] = [];
    for (let i = PAGE_SIZE; i < total; i += PAGE_SIZE) offsets.push(i);

    const BATCH = 5;
    for (let i = 0; i < offsets.length; i += BATCH) {
      const batch = offsets.slice(i, i + BATCH);
      const pages = await Promise.all(
        batch.map(async (startIndex) => {
          const res = await fetch(API_URL, {
            method: "POST",
            headers: HEADERS,
            body: buildBody(startIndex),
          });
          if (!res.ok) throw new Error(`Avanza API svarade med ${res.status} (startIndex=${startIndex})`);
          const { funds } = extractPage(await res.json());
          return funds;
        })
      );
      for (const page of pages) all.push(...page);
    }
  }

  // Deduplicate by ISIN — keep the first occurrence
  const seen = new Set<string>();
  const unique = all.filter((f) => {
    if (seen.has(f.isin)) return false;
    seen.add(f.isin);
    return true;
  });

  return unique.map((f, i) => mapAvanzaToFund(f, i));
}

export async function fetchAvanzaFunds(): Promise<Fund[]> {
  const cached = readCache();
  if (cached) return cached;

  const funds = await fetchFromAvanza();
  writeCache(funds);
  return funds;
}
