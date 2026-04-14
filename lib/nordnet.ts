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
  Index: "Equity",      // index funds are equity funds
  Ränta: "Fixed Income",
  Bland: "Allocation",  // API returns "Bland" not "Blandfond"
  Hedge: "Alternative",
  Penningmarknad: "Money Market",
  Övrigt: "Other",
};

const NN_HEADERS = {
  "client-id": "NEXT",
  ntag: "NO_NTAG_RECEIVED_YET",
  Accept: "application/json",
  Referer: "https://www.nordnet.se/",
};


// ── Normalize Nordnet English Morningstar categories → Avanza Swedish format ──
// Ensures Nordnet-exclusive funds share the same category vocabulary as Avanza
// funds, so peer comparison and swap suggestions work across both brokers.
// Static map takes priority over the dynamic cross-reference (explicit > inferred).

const NN_CATEGORY_TO_AVANZA: Record<string, string> = {
  // Global equity
  "Global Equity Large Cap":               "Global, Mix bolag",
  "Global Equity Mid/Small Cap":           "Global, Små/medelstora bolag",
  "Global Emerging Markets Equity":        "Tillväxtmarknader",

  // European equity
  "Europe Equity Large Cap":               "Europa, Mix bolag",
  "Europe Equity Mid/Small Cap":           "Europa, Småbolag",
  "Europe Emerging Markets Equity":        "Östeuropa ex Ryssland",

  // US equity
  "US Equity Large Cap Blend":             "USA, Mix bolag",
  "US Equity Large Cap Growth":            "USA, Tillväxtbolag",
  "US Equity Large Cap Value":             "USA, Värdebolag",
  "US Equity Small Cap":                   "USA, Småbolag",
  "US Equity Mid Cap":                     "USA, Medelstora bolag",

  // Regional equity
  "Asia ex-Japan Equity":                  "Asien ex Japan",
  "Asia Equity":                           "Asien & Australien ex Japan",
  "Japan Equity":                          "Japan, Mix bolag",
  "Greater China Equity":                  "Kina & närliggande",
  "India Equity":                          "Indien",
  "Latin America Equity":                  "Latinamerika",
  "Africa Equity":                         "Afrika och Mellanöstern",
  "UK Equity Large Cap":                   "Storbritannien",
  "Korea Equity":                          "Övriga aktiefonder",
  "Thailand Equity":                       "Övriga aktiefonder",
  "Australia & New Zealand Equity":        "Övriga aktiefonder",
  "Equity Miscellaneous":                  "Övriga aktiefonder",

  // Sector equity
  "Technology Sector Equity":              "Branschfond, Ny teknik",
  "Healthcare Sector Equity":              "Branschfond, Bioteknik",
  "Real Estate Sector Equity":             "Branschfond, Fastighetsbolag övriga",
  "Energy Sector Equity":                  "Branschfond, Energi",
  "Natural Resources Sector Equity":       "Branschfond, Råvaror",
  "Infrastructure Sector Equity":          "Branschfond, Infrastruktur",
  "Precious Metals Sector Equity":         "Branschfond, Ädelmetaller",
  "Consumer Goods & Services Sector Equity": "Branschfond, Konsument",
  "Industrials Sector Equity":             "Branschfond, Industrimaterial",
  "Financials Sector Equity":              "Branschfond, Finans",
  "Communications Sector Equity":          "Branschfond, Kommunikation",

  // Fixed income
  "Europe Fixed Income":                   "Ränte - euro obligationer",
  "Global Fixed Income":                   "Ränte - övriga obligationer",
  "Emerging Markets Fixed Income":         "Ränte - tillväxtmarknader, Obligationer",
  "US Fixed Income":                       "Ränte - övriga obligationer",
  "Asia Fixed Income":                     "Ränte - övriga obligationer",
  "Fixed Income Miscellaneous":            "Ränte - övriga obligationer",

  // Allocation
  "Moderate Allocation":                   "Blandfond - SEK, Balanserad",
  "Flexible Allocation":                   "Blandfond - SEK, Flexibel",
  "Aggressive Allocation":                 "Blandfond - SEK, Aggressiv",
  "Cautious Allocation":                   "Blandfond - SEK, Försiktig",
  "Allocation Miscellaneous":              "Blandfond - SEK, Flexibel",
  "Target Date":                           "Blandfond - SEK, Balanserad",

  // Alternative / hedge
  "Long/Short Equity":                     "Lång/kort, Övriga",
  "Global Macro":                          "Hedgefond, Global makro, Övriga",
  "Market Neutral":                        "Hedgefond, Marknadsneutral, Övriga",
  "Multialternative":                      "Hedgefond, Multi-strategi, Övriga",
  "Alternative Miscellaneous":             "Hedgefond, Övriga",
  "Options Trading":                       "Hedgefond, Övriga",

  // Money market
  "Euro Money Market":                     "Penningmarknadsfond",
  "US Money Market":                       "Penningmarknadsfond",
  "Money Market Miscellaneous":            "Penningmarknadsfond",

  // Nordic countries — both English Morningstar names and Nordnet's own Swedish API strings
  "Norway Equity":                         "Norge",
  "Norwegian Equity":                      "Norge",
  "Sverige (Norge)":                       "Norge",
  "Sweden Equity":                         "Sverige, Mix bolag",
  "Swedish Equity":                        "Sverige, Mix bolag",
  "Sverige":                               "Sverige, Mix bolag",
  "Denmark Equity":                        "Danmark",
  "Sverige (Danmark)":                     "Danmark",
  "Finnish Equity":                        "Finland",
  "Sverige (Finland)":                     "Finland",
  "Nordic Equity":                         "Norden",
  "Scandinavia Equity":                    "Norden",

  // Other
  "Convertibles":                          "Konvertibler - global",
  "Commodities Broad Basket":              "Råvaror - Blandade",
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
    sharpe_3yr: null,
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
      .from("nordnet_offerings")
      .select("fetched_at")
      .limit(1)
      .single();

    if (sample && Date.now() - new Date(sample.fetched_at).getTime() < CACHE_TTL_MS) {
      const all: Fund[] = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data } = await supabase.from("nordnet_fund_data").select("*").order("isin").range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        all.push(...(data as Fund[]));
        if (data.length < PAGE) break;
      }
      if (all.length > 0) {
        console.log(`[nordnet] serving ${all.length} funds from cache`);
        return all;
      }
    }
  }

  const entries = await fetchNordnetList();
  let funds = entries.map((e) => e.fund);

  // ── Normalize categories: cross-reference with Avanza funds ──────────────────
  // Build a map of nordnet raw category → avanza Swedish category by finding
  // funds that exist on both platforms (same ISIN). Uses majority vote so one
  // outlier fund doesn't corrupt the mapping for an entire Nordnet category.
  // Static map (NN_CATEGORY_TO_AVANZA) takes priority over the dynamic result.
  if (supabase) {
    const avanzaCats: { isin: string; category: string | null }[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data } = await supabase
        .from("avanza_fund_data")
        .select("isin, category")
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      avanzaCats.push(...data);
      if (data.length < PAGE) break;
    }

    const avanzaByIsin = new Map(
      avanzaCats.filter((f) => f.category).map((f) => [f.isin, f.category as string])
    );

    // For each Nordnet raw category, count how many shared-ISIN funds map to each Avanza category.
    const catVotes = new Map<string, Map<string, number>>();
    for (const fund of funds) {
      if (!fund.category) continue;
      const avanzaCategory = avanzaByIsin.get(fund.isin);
      if (!avanzaCategory) continue;
      if (!catVotes.has(fund.category)) catVotes.set(fund.category, new Map());
      const votes = catVotes.get(fund.category)!;
      votes.set(avanzaCategory, (votes.get(avanzaCategory) ?? 0) + 1);
    }

    const dynamicCatMap = new Map<string, string>();
    for (const [nordnetCat, votes] of catVotes) {
      let bestCat = "";
      let bestCount = 0;
      for (const [avanzaCat, count] of votes) {
        if (count > bestCount) { bestCount = count; bestCat = avanzaCat; }
      }
      if (bestCat) dynamicCatMap.set(nordnetCat, bestCat);
    }

    console.log(`[nordnet] dynamic category mappings built: ${dynamicCatMap.size}`);

    // Apply: static map first (curated, trusted), dynamic map second, raw category last
    funds = funds.map((f) => ({
      ...f,
      category: f.category
        ? NN_CATEGORY_TO_AVANZA[f.category] ?? dynamicCatMap.get(f.category) ?? f.category
        : null,
    }));
  }

  if (supabase && funds.length > 0) {
    const now = new Date().toISOString();
    const BATCH = 500;

    // Only write Nordnet-exclusive funds to the funds table.
    // Funds that exist on Avanza already have richer data there — don't overwrite.
    const avanzaIsins = new Set<string>();
    for (let from = 0; ; from += BATCH) {
      const { data } = await supabase.from("avanza_offerings").select("isin").range(from, from + BATCH - 1);
      if (!data || data.length === 0) break;
      for (const r of data) avanzaIsins.add(r.isin);
      if (data.length < BATCH) break;
    }

    const exclusiveFunds = funds.filter((f) => !avanzaIsins.has(f.isin));
    const fundRows = exclusiveFunds.map((f) => ({ ...f, source: "nordnet", fetched_at: now }));
    for (let i = 0; i < fundRows.length; i += BATCH) {
      const { error } = await supabase
        .from("funds")
        .upsert(fundRows.slice(i, i + BATCH), { onConflict: "isin" });
      if (error) console.error(`[nordnet] funds upsert batch ${i} failed:`, error.message);
    }
    console.log(`[nordnet] upserted ${fundRows.length} Nordnet-exclusive funds (skipped ${avanzaIsins.size > 0 ? funds.length - fundRows.length : 0} Avanza overlaps)`);

    // Upsert nordnet_offerings (isin + name + display_slug)
    const offeringRows = entries.map((e) => ({
      isin: e.fund.isin,
      name: e.fund.name,
      display_slug: e.slug || null,
      fetched_at: now,
    }));
    for (let i = 0; i < offeringRows.length; i += BATCH) {
      const { error } = await supabase
        .from("nordnet_offerings")
        .upsert(offeringRows.slice(i, i + BATCH), { onConflict: "isin" });
      if (error) console.error(`[nordnet] offerings upsert batch ${i} failed:`, error.message);
    }

    console.log(`[nordnet] cached ${funds.length} funds`);
  }

  return funds;
}

// ── Fetch Nordnet fund detail (Sharpe, alpha, beta, fees) ─────────────────────
// Called on-demand for ISINs not in Avanza. Results cached directly in funds table.

export async function fetchNordnetDetail(isin: string, displaySlug: string): Promise<Partial<Fund>> {
  // 1. Check funds table — if sharpe_3yr is already set, detail was previously fetched
  const supabase = getSupabase();
  if (supabase) {
    const { data } = await supabase
      .from("funds")
      .select("sharpe_3yr, std_dev_3yr, std_dev_1yr, alpha_3yr, beta_3yr, ongoing_cost_actual, ongoing_cost_estimated")
      .eq("isin", isin)
      .not("sharpe_3yr", "is", null)
      .maybeSingle();
    if (data) {
      return {
        sharpe_3yr: data.sharpe_3yr,
        std_dev_3yr: data.std_dev_3yr,
        std_dev_1yr: data.std_dev_1yr,
        alpha_3yr: data.alpha_3yr,
        beta_3yr: data.beta_3yr,
        ongoing_cost_actual: data.ongoing_cost_actual,
        ongoing_cost_estimated: data.ongoing_cost_estimated,
      };
    }
  }

  // 2. Fetch from Nordnet detail API
  const url = `https://api.prod.nntech.io/instrument-screening/v2/mutual-funds/web/${displaySlug}`;
  const res = await fetch(url, {
    headers: {
      Accept: "*/*",
      "Accept-Language": "sv-SE,sv;q=0.9",
      Origin: "https://www.nordnet.se",
      Referer: "https://www.nordnet.se/",
      "User-Agent": "Mozilla/5.0",
      "x-locale": "sv-SE",
    },
  });
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

  // 3. Update the funds table row with the fetched detail
  if (supabase && detail.sharpe_3yr !== null) {
    const { error } = await supabase
      .from("funds")
      .update({
        sharpe_3yr: detail.sharpe_3yr,
        std_dev_3yr: detail.std_dev_3yr,
        std_dev_1yr: detail.std_dev_1yr,
        alpha_3yr: detail.alpha_3yr,
        beta_3yr: detail.beta_3yr,
        ongoing_cost_actual: detail.ongoing_cost_actual,
        ongoing_cost_estimated: detail.ongoing_cost_estimated,
      })
      .eq("isin", isin);
    if (error) console.error(`[nordnet] detail update failed for ${isin}:`, error.message);
  }

  return detail;
}
