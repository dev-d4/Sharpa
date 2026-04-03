import { fetchAvanzaFunds } from "./avanza";
import { fetchNordnetFunds } from "./nordnet";
import { Fund } from "./supabase";

export type Custodian = "avanza" | "nordnet" | "övrigt";

// Returns funds for a specific custodian.
// Avanza: only Avanza funds (has Sharpe ratio for all).
// Nordnet: all Nordnet funds. Overlapping ISINs use Avanza data (richer).
export async function fetchFundsByCustodian(custodian: Custodian): Promise<Fund[]> {
  if (custodian === "avanza") {
    return fetchAvanzaFunds();
  }

  if (custodian === "övrigt") {
    return fetchAllFunds();
  }

  // Nordnet: use Nordnet list but enrich overlapping ISINs with Avanza data
  const [avanzaFunds, nordnetFunds] = await Promise.all([
    fetchAvanzaFunds(),
    fetchNordnetFunds(),
  ]);

  const avanzaMap = new Map(avanzaFunds.map((f) => [f.isin, f]));

  return nordnetFunds.map((f) => avanzaMap.get(f.isin) ?? f);
}

// Combined index used for warming the cache (not custodian-specific)
export async function fetchAllFunds(): Promise<Fund[]> {
  const [avanzaFunds, nordnetFunds] = await Promise.all([
    fetchAvanzaFunds(),
    fetchNordnetFunds(),
  ]);
  const avanzaIsins = new Set(avanzaFunds.map((f) => f.isin));
  const nordnetExclusive = nordnetFunds.filter((f) => !avanzaIsins.has(f.isin));
  return [...avanzaFunds, ...nordnetExclusive];
}
