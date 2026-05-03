/**
 * Pre-classifies every fund in the Supabase `funds` table with a `selection_id`
 * that maps directly to the product's SelectionId enum.
 *
 * Run once after first deploy, and again whenever the fund data is refreshed:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   npx tsx scripts/classify-funds.ts
 *
 * The env vars are automatically available if you have a .env.local file —
 * in that case prefix the command with:  source .env.local &&  npx tsx ...
 * Or just paste the values inline in your terminal session.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ── SelectionId type ─────────────────────────────────────────────────────────

type SelectionId =
  // Geographic equity
  | "global" | "sweden" | "usa" | "europe" | "nordic" | "emerging"
  | "asia"   | "japan"  | "china" | "india" | "latam"
  // Sector equity
  | "tech" | "health" | "real-estate" | "energy" | "finance" | "consumer" | "industry"
  // Bonds
  | "bond-sek" | "bond-global" | "bond-highyield";

// ── Classification rules ──────────────────────────────────────────────────────

/**
 * Deterministically maps an Avanza `category` + `category_group` to a
 * SelectionId. Returns null for funds outside the product's scope
 * (blandfonder, hedgefonder, lång/kort, etc.).
 *
 * Rules are ordered: bonds first, then sectors, then geography.
 * Within geography, more specific regions come before broader ones.
 */
function classify(category: string | null, categoryGroup: string | null): SelectionId | null {
  if (!category) return null;
  const cat = category.trim();
  const low = cat.toLowerCase();

  // ── Bonds ──────────────────────────────────────────────────────────────────
  // Identify bonds by prefix OR by category_group (handles edge cases).
  if (cat.startsWith("Ränte") || categoryGroup === "Money Market") {
    // Emerging-market bonds carry higher credit risk → bond-highyield
    if (low.includes("tillväxtmark") || low.includes("tillväxtm")) return "bond-highyield";
    // Explicit high-yield label
    if (low.includes("högrisk"))                                     return "bond-highyield";
    // Chinese bonds — niche, high risk
    if (low.includes("kina") || low.includes("china"))               return "bond-highyield";
    // SEK-denominated bonds are the "safe" domestic option
    if (low.includes("sek"))                                         return "bond-sek";
    // Everything else: euro, dollar, global, asian, etc.
    return "bond-global";
  }

  // ── Sector funds ───────────────────────────────────────────────────────────
  if (cat.startsWith("Branschfond,")) {
    if (low.includes("teknik") || low.includes("tech") || low.includes("kommunikation"))
      return "tech";
    if (low.includes("läkemedel") || low.includes("bioteknik") || low.includes("hälsa"))
      return "health";
    if (low.includes("fastighetsbolag") || low.includes("fastighet"))
      return "real-estate";
    // Broad "energy" bucket: renewables, commodities, precious metals, water, environment
    if (low.includes("ny energi") || low.includes("energi") || low.includes("råvaror") ||
        low.includes("ädelmetaller") || low.includes("vattenresurser") || low.includes("miljö"))
      return "energy";
    if (low.includes("finans") || low.includes("bank"))
      return "finance";
    if (low.includes("konsument"))
      return "consumer";
    if (low.includes("infrastruktur") || low.includes("industrimaterial"))
      return "industry";
    // Private equity, jordbruk — niche, out of product scope
    return null;
  }

  // ── Commodity funds (not branded as Branschfond) ──────────────────────────
  if (cat.startsWith("Råvaror")) return "energy";

  // ── Geographic equity ──────────────────────────────────────────────────────

  // Global (must check before anything more specific)
  if (cat.startsWith("Global")) return "global";
  if (cat === "Global & Sverige")  return "global";  // primary exposure is global

  // Sweden
  if (cat.startsWith("Sverige"))   return "sweden";

  // USA
  if (cat.startsWith("USA"))       return "usa";

  // Europe — standard + eurozone + country-level
  if (cat.startsWith("Europa") || cat.startsWith("Euroland"))  return "europe";
  if (["Spanien", "Italien", "Hongkong"].includes(cat) ||
      cat.startsWith("Tyskland") || cat.startsWith("Storbritannien"))
    return "europe";

  // Nordics — includes individual Nordic countries
  if (cat.startsWith("Norden") || ["Norge", "Finland", "Danmark"].includes(cat))
    return "nordic";

  // Emerging markets — broad EM + frontier + specific regions without own slot
  if (cat.startsWith("Tillväxtmarknader") ||
      cat === "Afrika och Mellanöstern" ||
      cat === "Östeuropa ex Ryssland")
    return "emerging";

  // Asia — all "Asien*" categories.
  // "Asien ex Japan", "Asien & Australien ex Japan & Kina" etc. are correctly
  // mapped here: they represent Asian exposure despite excluding sub-regions.
  if (cat.startsWith("Asien")) return "asia";
  // Other Asian markets that don't have a dedicated slot
  if (["ASEAN", "Taiwan", "Korea", "Australien & Nya Zeeland",
       "Indonesien", "Vietnam"].includes(cat))
    return "asia";

  // Japan — only "Japan, *" categories.
  // Does NOT match "Asien ex Japan" (starts with "Asien", handled above).
  if (cat.startsWith("Japan")) return "japan";

  // China — only "Kina" prefix.
  // "Tillväxtmarknader ex Kina" starts with "Tillväxtmarknader" → already "emerging".
  // "Asien & Australien ex Japan & Kina" starts with "Asien" → already "asia".
  // Neither will reach this check.
  if (cat.startsWith("Kina")) return "china";

  // India
  if (cat.startsWith("Indien")) return "india";

  // Latin America
  if (cat === "Latinamerika" || cat === "Brasilien") return "latam";

  // ── Out of scope ────────────────────────────────────────────────────────────
  // Blandfond, Hedgefond, Lång/kort, Övriga, Bull/Bear, Konvertibler → null
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

type FundRow = { isin: string; category: string | null; category_group: string | null };

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // ── Fetch all funds ─────────────────────────────────────────────────────────
  console.log("Fetching funds from Supabase...");
  const PAGE = 1000;
  const allFunds: FundRow[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("funds")
      .select("isin, category, category_group")
      .order("isin")
      .range(from, from + PAGE - 1);

    if (error) { console.error("Fetch error:", error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    allFunds.push(...(data as FundRow[]));
    if (data.length < PAGE) break;
  }

  console.log(`Fetched ${allFunds.length} funds.\n`);

  // ── Classify ─────────────────────────────────────────────────────────────
  const updates: { isin: string; selection_id: string | null }[] = [];
  const tally: Record<string, number> = {};

  for (const fund of allFunds) {
    const sid = classify(fund.category, fund.category_group);
    updates.push({ isin: fund.isin, selection_id: sid });
    const key = sid ?? "(null — out of scope)";
    tally[key] = (tally[key] ?? 0) + 1;
  }

  // Print summary
  console.log("Classification breakdown:");
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  for (const [k, v] of sorted) {
    console.log(`  ${v.toString().padStart(4)}  ${k}`);
  }
  const classified = updates.filter((u) => u.selection_id !== null).length;
  console.log(`\n  ${classified} / ${allFunds.length} funds classified (${((classified / allFunds.length) * 100).toFixed(1)}%)`);

  // ── Write back in parallel batches ──────────────────────────────────────────
  console.log("\nWriting selection_id to database...");
  const BATCH = 50;
  let done = 0;

  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(({ isin, selection_id }) =>
        supabase.from("funds").update({ selection_id }).eq("isin", isin)
      )
    );
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error(`  ${errors.length} errors in batch ${Math.ceil(i / BATCH) + 1}`);
      errors.forEach((r) => console.error("   ", r.error?.message));
    }
    done += batch.length;
    process.stdout.write(`\r  ${done}/${updates.length} updated`);
  }

  console.log("\n\nDone! Re-run this script after each fund data refresh.");
  console.log("Tip: verify with  SELECT selection_id, COUNT(*) FROM funds GROUP BY 1 ORDER BY 2 DESC;");
}

main().catch((err) => { console.error(err); process.exit(1); });
