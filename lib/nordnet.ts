import { Fund } from "./supabase";
import { createClient } from "@supabase/supabase-js";

// ── Nordnet raw types ─────────────────────────────────────────────────────────

interface NordnetListFund {
  instrument_info: {
    instrument_id: number;
    name: string;
    isin: string;
  };
  fund_info?: {
    fund_type?: string;
    fund_category?: string;
    fund_yearly_fee?: number;
    fund_calculated_fee?: number;
    fund_raw_risk?: number;
  };
  historical_returns_info?: {
    yield_1y?: number;
    yield_3y?: number;
    yield_5y?: number;
    yield_ytd?: number;
  };
  annual_growth_info?: {
    annual_growth_1y?: number;
    annual_growth_3y?: number;
    annual_growth_5y?: number;
  };
  nnx_info?: {
    display_slug?: string;
  };
}

interface NordnetDetailResponse {
  fees?: {
    ongoingCost?: number;
    managementFee?: number;
  };
  risksStatistics?: {
    threeYears?: {
      sharpeRatio?: number;
      standardDeviation?: number;
      alpha?: number;
      beta?: number;
    };
    oneYear?: {
      sharpeRatio?: number;
      standardDeviation?: number;
    };
  };
  instrument?: {
    name?: string;
    isin?: string;
  };
}

// ── Nordnet fund_type → category_group ───────────────────────────────────────

const NN_FUND_TYPE_MAP: Record<string, string> = {
  Aktie: "Equity",
  Ränta: "Fixed Income",
  Blandfond: "Allocation",
  Hedge: "Alternative",
  Penningmarknad: "Money Market",
  "Fond-i-fond": "Allocation",
};

const NN_HEADERS = {
  "client-id": "NEXT",
  ntag: "NO_NTAG_RECEIVED_YET",
  Accept: "application/json",
  Referer: "https://www.nordnet.se/",
};

// ── Map Nordnet list entry → Fund (without Sharpe) ───────────────────────────

function mapNordnetListToFund(f: NordnetListFund, index: number): Fund {
  const fee = f.fund_info?.fund_yearly_fee ?? f.fund_info?.fund_calculated_fee ?? null;
  const r1 = f.annual_growth_info?.annual_growth_1y ?? null;
  const r3 = f.annual_growth_info?.annual_growth_3y ?? null;
  const r5 = f.annual_growth_info?.annual_growth_5y ?? null;
  const fundType = f.fund_info?.fund_type ?? "";
  const categoryGroup = NN_FUND_TYPE_MAP[fundType] ?? "Other";

  return {
    id: f.instrument_info.instrument_id ?? index,
    name: f.instrument_info.name,
    isin: f.instrument_info.isin,
    base_currency: "SEK",
    category_group: categoryGroup,
    category: f.fund_info?.fund_category ?? null,
    global_category: null,
    equity_style_box: null,
    return_ytd: f.historical_returns_info?.yield_ytd ?? null,
    return_1yr: r1,
    return_2yr: null,
    return_3yr: r3,
    return_5yr: r5,
    investment_type: null,
    std_dev_3yr: null,
    std_dev_1yr: null,
    sharpe_3yr: null, // filled in by detail fetch
    alpha_3yr: null,
    beta_3yr: null,
    sri_value: null,
    ongoing_cost_actual: fee,
    ongoing_cost_estimated: fee,
  };
}

// ── Fetch all Nordnet funds (list endpoint, paginated) ────────────────────────

async function fetchNordnetList(): Promise<{ fund: Fund; slug: string }[]> {
  const all: NordnetListFund[] = [];
  let offset = 0;
  let total = 9999;

  while (offset < total) {
    const url = `https://www.nordnet.se/api/2/instrument_search/query/fundlist?sort_order=asc&sort_attribute=fund_yearly_fee&limit=100&offset=${offset}`;
    const res = await fetch(url, { headers: NN_HEADERS });
    if (!res.ok) throw new Error(`Nordnet list API svarade med ${res.status}`);
    const data = await res.json();
    total = data.total_hits ?? 0;
    all.push(...(data.results ?? []));
    offset += 100;
  }

  const seen = new Set<string>();
  return all
    .filter((f) => {
      if (!f.instrument_info?.isin || seen.has(f.instrument_info.isin)) return false;
      seen.add(f.instrument_info.isin);
      return true;
    })
    .map((f, i) => ({
      fund: mapNordnetListToFund(f, i),
      slug: f.nnx_info?.display_slug ?? "",
    }));
}

// ── Supabase-backed cache ─────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function fetchNordnetFunds(): Promise<Fund[]> {
  const supabase = getSupabase();

  if (supabase) {
    const { data: sample } = await supabase
      .from("nordnet_funds")
      .select("fetched_at")
      .limit(1)
      .single();

    if (sample && Date.now() - new Date(sample.fetched_at).getTime() < CACHE_TTL_MS) {
      const { data } = await supabase.from("nordnet_funds").select("*");
      if (data && data.length > 0) {
        console.log(`[nordnet] serving ${data.length} funds from Supabase cache`);
        return data as Fund[];
      }
    }
  }

  const entries = await fetchNordnetList();
  const funds = entries.map((e) => e.fund);

  if (supabase && funds.length > 0) {
    const now = new Date().toISOString();
    // Upsert fund data first (no display_slug — avoids failure if column not yet added)
    const fundRows = funds.map((f) => ({ ...f, fetched_at: now }));
    const BATCH = 500;
    for (let i = 0; i < fundRows.length; i += BATCH) {
      const { error } = await supabase
        .from("nordnet_funds")
        .upsert(fundRows.slice(i, i + BATCH), { onConflict: "isin" });
      if (error) console.error(`[nordnet] upsert batch ${i} failed:`, error.message);
    }
    console.log(`[nordnet] cached ${funds.length} funds in Supabase`);

    // Separately update display_slug (requires ALTER TABLE nordnet_funds ADD COLUMN display_slug TEXT)
    const slugRows = entries
      .filter((e) => e.slug)
      .map((e) => ({ isin: e.fund.isin, display_slug: e.slug }));
    if (slugRows.length > 0) {
      for (let i = 0; i < slugRows.length; i += BATCH) {
        const { error } = await supabase
          .from("nordnet_funds")
          .upsert(slugRows.slice(i, i + BATCH), { onConflict: "isin" });
        if (error) console.error(`[nordnet] slug upsert batch ${i} failed:`, error.message);
      }
    }
  }

  return funds;
}

// ── Fetch Nordnet fund detail (Sharpe, alpha, beta, fees) ─────────────────────
// Called on-demand for ISINs not in Avanza. Results cached in Supabase.

export async function fetchNordnetDetail(isin: string, displaySlug: string): Promise<Partial<Fund>> {
  // 1. Check Supabase cache first
  const supabase = getSupabase();
  if (supabase) {
    const { data } = await supabase
      .from("nordnet_fund_details")
      .select("*")
      .eq("isin", isin)
      .single();
    if (data) {
      return {
        sharpe_3yr: data.sharpe_3yr,
        std_dev_3yr: data.std_dev_3yr,
        std_dev_1yr: data.std_dev_1yr,
        alpha_3yr: data.alpha_3yr,
        beta_3yr: data.beta_3yr,
        ongoing_cost_actual: data.ongoing_cost_actual,
      };
    }
  }

  // 2. Fetch from Nordnet detail API
  const url = `https://www.nordnet.se/api/2/instrument_search/query/slugdata?slug=${displaySlug}`;
  const res = await fetch(url, { headers: NN_HEADERS });
  if (!res.ok) return {};
  const data: NordnetDetailResponse = await res.json();

  const detail: Partial<Fund> = {
    sharpe_3yr: data.risksStatistics?.threeYears?.sharpeRatio ?? null,
    std_dev_3yr: data.risksStatistics?.threeYears?.standardDeviation ?? null,
    std_dev_1yr: data.risksStatistics?.oneYear?.standardDeviation ?? null,
    alpha_3yr: data.risksStatistics?.threeYears?.alpha ?? null,
    beta_3yr: data.risksStatistics?.threeYears?.beta ?? null,
    ongoing_cost_actual: data.fees?.ongoingCost ?? null,
    ongoing_cost_estimated: data.fees?.managementFee ?? null,
  };

  // 3. Cache in Supabase
  if (supabase) {
    await supabase.from("nordnet_fund_details").upsert({
      isin,
      sharpe_3yr: detail.sharpe_3yr,
      std_dev_3yr: detail.std_dev_3yr,
      std_dev_1yr: detail.std_dev_1yr,
      alpha_3yr: detail.alpha_3yr,
      beta_3yr: detail.beta_3yr,
      ongoing_cost_actual: detail.ongoing_cost_actual,
      ongoing_cost_estimated: detail.ongoing_cost_estimated,
      fetched_at: new Date().toISOString(),
    });
  }

  return detail;
}
