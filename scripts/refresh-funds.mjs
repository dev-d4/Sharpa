/**
 * Hämtar färsk fonddata från Avanza och Nordnet och skriver till Supabase.
 * Kör med:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/refresh-funds.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jgbwzrlkmgyyglscasfe.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BATCH        = 500;

if (!SUPABASE_KEY) { console.error("Sätt SUPABASE_SERVICE_ROLE_KEY."); process.exit(1); }

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────

function annualize(cum, years) {
  if (cum == null) return null;
  return (Math.pow(1 + cum / 100, 1 / years) - 1) * 100;
}

const AVANZA_TYPE_MAP = {
  EQUITY_FUND: "Equity", BOND_FUND: "Fixed Income", INTEREST_FUND: "Fixed Income",
  MIXED_FUND: "Allocation", HEDGE_FUND: "Alternative", ALTERNATIVE_FUND: "Alternative",
  MONEY_MARKET_FUND: "Money Market", FUND_OF_FUNDS: "Allocation", MISC_FUND: "Other",
};

const NN_TYPE_MAP = {
  Aktie: "Equity", Index: "Equity", Ränta: "Fixed Income",
  Bland: "Allocation", Hedge: "Alternative", Penningmarknad: "Money Market", Övrigt: "Other",
};

const NN_HEADERS = {
  "client-id": "NEXT", ntag: "NO_NTAG_RECEIVED_YET",
  Accept: "application/json", Referer: "https://www.nordnet.se/",
};

// ── Avanza ────────────────────────────────────────────────────────────────────

const AVANZA_URL = "https://www.avanza.se/_api/fund-guide/list?shouldCheckFundExcludedFromPromotion=true";
const AVANZA_HEADERS = {
  "Content-Type": "application/json;charset=UTF-8", Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
};

function avanzaBody(startIndex) {
  return JSON.stringify({
    startIndex, managedType: "ANY", svanenMark: false,
    commonRegionFilter: [], otherRegionFilter: [], alignmentFilter: [],
    industryFilter: [], fundTypeFilter: [], interestTypeFilter: [],
    sortField: "developmentThreeYears", sortDirection: "DESCENDING", name: "",
    recommendedHoldingPeriodFilter: [], companyFilter: [], productInvolvementsFilter: [],
    ratingFilter: [], riskFilter: [], sustainabilityRatingFilter: [],
    environmentalRatingFilter: [], socialRatingFilter: [], governanceRatingFilter: [],
    sustainableDevelopmentGoalsAlignmentFilter: [], euArticleTypeFilter: [],
    maxTotalFee: null, cashDividends: false,
  });
}

async function fetchAvanza() {
  console.log("→ Avanza: hämtar fondlista...");
  const r0    = await fetch(AVANZA_URL, { method: "POST", headers: AVANZA_HEADERS, body: avanzaBody(0) });
  const d0    = await r0.json();
  const page0 = d0.fundListViews ?? d0;
  const total = d0.totalNoFunds  ?? page0.length;
  const all   = [...page0];

  const offsets = [];
  for (let i = 20; i < total; i += 20) offsets.push(i);

  for (let i = 0; i < offsets.length; i += 8) {
    const batch = offsets.slice(i, i + 8);
    const pages = await Promise.all(batch.map(async off => {
      const r = await fetch(AVANZA_URL, { method: "POST", headers: AVANZA_HEADERS, body: avanzaBody(off) });
      const d = await r.json();
      return d.fundListViews ?? d;
    }));
    for (const p of pages) all.push(...p);
    process.stdout.write(`\r  ${all.length}/${total}...`);
  }

  const seen = new Set();
  const unique = all.filter(f => { if (seen.has(f.isin)) return false; seen.add(f.isin); return true; });
  console.log(`\n  ${unique.length} unika fonder`);
  return unique;
}

async function upsertAvanza(raw) {
  const now  = new Date().toISOString();
  const rows = raw.map((f, i) => ({
    id: parseInt(f.orderbookId) || i,
    name: f.name, base_currency: f.currencyCode ?? "SEK", isin: f.isin,
    category_group: AVANZA_TYPE_MAP[f.fundType] ?? "Other",
    category: f.category ?? null, global_category: null, equity_style_box: null,
    return_ytd: f.developmentThisYear ?? null, return_1yr: f.developmentOneYear ?? null,
    return_2yr: null, return_3yr: f.developmentThreeYears ?? null,
    return_5yr: f.developmentFiveYears ?? null,
    investment_type: f.managedType ?? null, std_dev_3yr: f.standardDeviation ?? null,
    std_dev_1yr: null, sharpe_3yr: f.sharpeRatio ?? null,
    alpha_3yr: null, beta_3yr: null,
    sri_value: f.esgScore != null ? Math.round(f.esgScore) : null,
    ongoing_cost_actual: f.totalFee ?? null, ongoing_cost_estimated: f.managementFee ?? null,
    selection_id: null, source: "avanza", fetched_at: now,
  }));

  // funds table
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await sb.from("funds").upsert(rows.slice(i, i + BATCH), { onConflict: "isin" });
    if (error) console.error(`  ⚠ funds[avanza] batch ${i}:`, error.message);
  }

  // avanza_offerings (isin + name)
  const offerings = raw.map(f => ({ isin: f.isin, name: f.name, fetched_at: now }));
  for (let i = 0; i < offerings.length; i += BATCH) {
    const { error } = await sb.from("avanza_offerings").upsert(offerings.slice(i, i + BATCH), { onConflict: "isin" });
    if (error) console.error(`  ⚠ avanza_offerings batch ${i}:`, error.message);
  }

  console.log(`  ✓ ${rows.length} Avanza-fonder sparade`);
  return new Set(raw.map(f => f.isin));
}

// ── Nordnet ───────────────────────────────────────────────────────────────────

async function fetchNordnet() {
  console.log("→ Nordnet: hämtar fondlista...");
  const all = [];
  let offset = 0, total = 9999;

  while (offset < total) {
    const url = `https://www.nordnet.se/api/2/instrument_search/query/fundlist?sort_order=asc&sort_attribute=fund_yearly_fee&limit=100&offset=${offset}`;
    const res = await fetch(url, { headers: NN_HEADERS });
    if (!res.ok) { console.error(`  ✗ Nordnet svarade ${res.status} vid offset ${offset}`); break; }
    const d = await res.json();
    total = d.total_hits ?? 0;
    all.push(...(d.results ?? []));
    offset += 100;
    process.stdout.write(`\r  ${all.length}/${total}...`);
  }

  const seen = new Set();
  const unique = all.filter(f => {
    const isin = f.instrument_info?.isin;
    if (!isin || seen.has(isin)) return false;
    seen.add(isin); return true;
  });
  console.log(`\n  ${unique.length} unika fonder`);
  return unique;
}

async function upsertNordnet(raw, avanzaIsins) {
  const now  = new Date().toISOString();
  const all  = raw.map((f, i) => {
    const info  = f.instrument_info ?? {};
    const fi    = f.fund_info ?? {};
    const hist  = f.historical_returns_info ?? {};
    return {
      id: info.instrument_id ?? i + 100000,
      name: info.name, base_currency: "SEK", isin: info.isin,
      category_group: NN_TYPE_MAP[fi.fund_type] ?? "Other",
      category: fi.fund_category ?? null, global_category: null, equity_style_box: null,
      return_ytd: hist.yield_ytd ?? null, return_1yr: hist.yield_1y ?? null,
      return_2yr: null, return_3yr: hist.yield_3y ?? null, return_5yr: hist.yield_5y ?? null,
      investment_type: fi.fund_type === "Index" ? "PASSIVE_INDEX" : fi.fund_type ? "ACTIVELY_MANAGED" : null,
      std_dev_3yr: null, std_dev_1yr: null, sharpe_3yr: null, alpha_3yr: null, beta_3yr: null,
      sri_value: null,
      ongoing_cost_actual: fi.fund_calculated_fee ?? null,
      ongoing_cost_estimated: fi.fund_yearly_fee ?? null,
      selection_id: null, source: "nordnet", fetched_at: now,
    };
  }).filter(r => r.isin);

  // Only Nordnet-exclusive funds → funds table (don't overwrite richer Avanza data)
  const exclusive = all.filter(r => !avanzaIsins.has(r.isin));
  for (let i = 0; i < exclusive.length; i += BATCH) {
    const { error } = await sb.from("funds").upsert(exclusive.slice(i, i + BATCH), { onConflict: "isin" });
    if (error) console.error(`  ⚠ funds[nordnet] batch ${i}:`, error.message);
  }

  // nordnet_offerings (alla fonder inkl. display_slug)
  const offerings = raw.map(f => ({
    isin: f.instrument_info?.isin, name: f.instrument_info?.name,
    display_slug: f.nnx_info?.display_slug ?? null, fetched_at: now,
  })).filter(r => r.isin);
  for (let i = 0; i < offerings.length; i += BATCH) {
    const { error } = await sb.from("nordnet_offerings").upsert(offerings.slice(i, i + BATCH), { onConflict: "isin" });
    if (error) console.error(`  ⚠ nordnet_offerings batch ${i}:`, error.message);
  }

  console.log(`  ✓ ${exclusive.length} Nordnet-exklusiva fonder + ${offerings.length} offerings sparade`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();
  console.log(`\n🔄 Fonduppdatering – ${new Date().toLocaleString("sv-SE")}\n`);

  const [avanzaRaw, nordnetRaw] = await Promise.all([fetchAvanza(), fetchNordnet()]);
  const avanzaIsins = await upsertAvanza(avanzaRaw);
  await upsertNordnet(nordnetRaw, avanzaIsins);

  const s = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ Klar på ${s}s`);
  console.log(`   Avanza: ${avanzaRaw.length} fonder`);
  console.log(`   Nordnet: ${nordnetRaw.length} fonder (${nordnetRaw.length - [...new Set(nordnetRaw.map(f => f.instrument_info?.isin))].filter(i => avanzaIsins.has(i)).length} exklusiva)\n`);
}

main().catch(console.error);
