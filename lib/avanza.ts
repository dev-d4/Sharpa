import { Fund } from "./supabase";
import { createClient } from "@supabase/supabase-js";

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
  INTEREST_FUND: "Fixed Income",   // actual API value for bond funds
  MIXED_FUND: "Allocation",
  HEDGE_FUND: "Alternative",
  ALTERNATIVE_FUND: "Alternative", // actual API value for hedge/alternative funds
  MONEY_MARKET_FUND: "Money Market",
  FUND_OF_FUNDS: "Allocation",
  MISC_FUND: "Other",
};

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
    return_3yr: f.developmentThreeYears ?? null,
    return_5yr: f.developmentFiveYears ?? null,
    investment_type: f.managedType ?? null,
    std_dev_3yr: f.standardDeviation ?? null,
    std_dev_1yr: null,
    sharpe_3yr: f.sharpeRatio ?? null,
    alpha_3yr: null,
    beta_3yr: null,
    sri_value: f.esgScore ?? null,
    ongoing_cost_actual: f.totalFee ?? null,
    ongoing_cost_estimated: f.managementFee ?? null,
    selection_id: null,
  };
}

// ── Avanza API fetch (paginated) ──────────────────────────────────────────────

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
  const firstRes = await fetch(API_URL, {
    method: "POST",
    headers: HEADERS,
    body: buildBody(0),
  });
  if (!firstRes.ok) throw new Error(`Avanza API svarade med ${firstRes.status}`);

  const firstData = await firstRes.json();
  const { funds: firstPage, total } = extractPage(firstData);

  console.log(`[avanza] total=${total} first page=${firstPage.length}`);

  const all: AvanzaFund[] = [...firstPage];

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
          if (!res.ok) throw new Error(`Avanza API svarade med ${res.status}`);
          const { funds } = extractPage(await res.json());
          return funds;
        })
      );
      for (const page of pages) all.push(...page);
    }
  }

  const seen = new Set<string>();
  const unique = all.filter((f) => {
    if (seen.has(f.isin)) return false;
    seen.add(f.isin);
    return true;
  });

  return unique.map((f, i) => mapAvanzaToFund(f, i));
}

// ── Supabase-backed cache ─────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function fetchAvanzaFunds({ force = false } = {}): Promise<Fund[]> {
  const supabase = getSupabase();

  if (supabase) {
    const { data: sample } = await supabase
      .from("avanza_offerings")
      .select("fetched_at")
      .limit(1)
      .single();

    if (!force && sample && Date.now() - new Date(sample.fetched_at).getTime() < CACHE_TTL_MS) {
      const all: Fund[] = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data } = await supabase.from("avanza_fund_data").select("*").order("isin").range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        all.push(...(data as Fund[]));
        if (data.length < PAGE) break;
      }
      if (all.length > 0) {
        console.log(`[avanza] serving ${all.length} funds from cache`);
        return all;
      }
    }
  }

  const funds = await fetchFromAvanza();

  if (supabase && funds.length > 0) {
    const now = new Date().toISOString();
    const BATCH = 500;

    // Upsert fund data into unified funds table
    const fundRows = funds.map((f) => ({
      ...f,
      sri_value: f.sri_value != null ? Math.round(f.sri_value) : null,
      source: "avanza",
      fetched_at: now,
    }));
    for (let i = 0; i < fundRows.length; i += BATCH) {
      const { error } = await supabase
        .from("funds")
        .upsert(fundRows.slice(i, i + BATCH), { onConflict: "isin" });
      if (error) console.error(`[avanza] funds upsert batch ${i} failed:`, error.message);
    }

    // Upsert avanza_offerings (isin + name only)
    const offeringRows = funds.map((f) => ({ isin: f.isin, name: f.name, fetched_at: now }));
    for (let i = 0; i < offeringRows.length; i += BATCH) {
      const { error } = await supabase
        .from("avanza_offerings")
        .upsert(offeringRows.slice(i, i + BATCH), { onConflict: "isin" });
      if (error) console.error(`[avanza] offerings upsert batch ${i} failed:`, error.message);
    }

    console.log(`[avanza] cached ${funds.length} funds`);
  }

  return funds;
}
