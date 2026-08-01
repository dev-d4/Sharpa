import { fetchFundsByCustodian, type Custodian } from "./funds";
import { fetchNordnetDetail } from "./nordnet";
import { fetchAvanzaFunds } from "./avanza";
import { analyzePortfolio, type PortfolioAnalysis, type PortfolioEntry } from "./analysis";
import type { Fund } from "./supabase";
import { createClient } from "@supabase/supabase-js";

/**
 * Delad analyslogik för både /api/analyze och cron-jobbet som bevakar sparade
 * portföljer. Låg tidigare bara i route-handlern, vilket tvingade cron-jobbet
 * att antingen anropa sin egen HTTP-route eller räkna om betyget på en gammal
 * sparad analys-snapshot. Den senare varianten var buggen: betyget ändrades
 * aldrig när fonddatan uppdaterades.
 *
 * Serverkod. Importeras aldrig från klientkomponenter.
 */

export type AnalyzeRequestEntry = { isin: string; weight: number };

export type PortfolioAnalysisResult = {
  analysis: PortfolioAnalysis;
  /** Innehaven med uppslagen fonddata — underlag för metrics-snapshot. */
  entries: PortfolioEntry[];
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Fondunderlaget för en depå. Cron-jobbet hämtar detta en gång per depå och
 * återanvänder det för alla portföljer, i stället för en hämtning per portfölj.
 */
export async function loadCustodianFunds(custodian: Custodian): Promise<Fund[]> {
  return fetchFundsByCustodian(custodian);
}

/**
 * Nordnet-exklusiva fonder saknar Sharpe i listendpointen. Berika dem med
 * detaljanrop — samma logik som /api/analyze alltid har använt.
 */
async function enrichNordnetOnly(
  fundMap: Map<string, Fund>,
  requestedIsins: string[]
): Promise<void> {
  const avanzaFunds = await fetchAvanzaFunds();
  const avanzaIsins = new Set(avanzaFunds.map((f) => f.isin));

  const needsDetail = requestedIsins.filter(
    (isin) => !avanzaIsins.has(isin) && fundMap.has(isin)
  );
  if (needsDetail.length === 0) return;

  const supabase = getSupabase();
  const nordnetSlugMap = new Map<string, string>();
  if (supabase) {
    const { data } = await supabase
      .from("nordnet_offerings")
      .select("isin, display_slug")
      .in("isin", needsDetail);
    for (const row of data ?? []) {
      if (row.display_slug) nordnetSlugMap.set(row.isin, row.display_slug);
    }
  }

  const details = await Promise.all(
    needsDetail.map(async (isin) => {
      const slug = nordnetSlugMap.get(isin) ?? "";
      if (!slug) return { isin, detail: {} };
      return { isin, detail: await fetchNordnetDetail(isin, slug) };
    })
  );

  for (const { isin, detail } of details) {
    const fund = fundMap.get(isin);
    if (fund && Object.keys(detail).length > 0) {
      fundMap.set(isin, { ...fund, ...detail } as Fund);
    }
  }
}

/**
 * Analysera en uppsättning innehav mot aktuell fonddata.
 *
 * @param opts.funds Förhämtat fondunderlag för depån. Utelämnas i API-routen
 *   (en portfölj per anrop) och sätts av cron-jobbet (många portföljer per
 *   depå), så att fondlistan hämtas en gång i stället för N gånger.
 */
export async function analyzePortfolioEntries(
  entries: AnalyzeRequestEntry[],
  custodian: Custodian,
  opts: { funds?: Fund[] } = {}
): Promise<PortfolioAnalysisResult> {
  const allFunds = opts.funds ?? (await loadCustodianFunds(custodian));
  const fundMap = new Map(allFunds.map((f) => [f.isin, f]));

  const requestedIsins = entries.map((e) => String(e.isin).trim().toUpperCase());

  if (custodian === "nordnet") {
    await enrichNordnetOnly(fundMap, requestedIsins);
  }

  const portfolioEntries: PortfolioEntry[] = requestedIsins.map((isin, i) => ({
    isin,
    weight: entries[i].weight,
    fund: fundMap.get(isin) ?? null,
  }));

  const categories = new Set(
    portfolioEntries.filter((e) => e.fund?.category).map((e) => e.fund!.category!)
  );

  const peerFunds = Array.from(fundMap.values()).filter(
    (f) => f.category !== null && categories.has(f.category)
  );

  return {
    analysis: analyzePortfolio(portfolioEntries, peerFunds),
    entries: portfolioEntries,
  };
}

export type { Custodian };
