// Analyserar vilka fonder där geographicFocus(name) ger ett annat resultat
// än vad Avanzas kategori antyder.
// Kör: npx tsx scripts/check-geo-mismatch.ts

import { readFileSync } from "fs";
import { join } from "path";

// ── Exakt samma logik som lib/analysis.ts (kopierad hit för standalone-körning) ──

function geoFromCategory(category: string | null): string {
  if (!category) return "";
  const c = category.toLowerCase();
  if (c.startsWith("branschfond") || c.startsWith("ränte") || c.startsWith("pengamark")) return "";
  if (c.includes("global")) return "global";
  if (c.includes("tillväxtmark") || c.includes("emerging market")) return "emerging";
  if (c.includes("asien ex japan")) return "asia-ex-japan";
  if (c.includes("asien")) return "asia";
  if (c.includes("japan")) return "japan";
  if (c.includes("kina") || c.includes("china")) return "china";
  if (c.includes("indien") || c.includes("india")) return "india";
  if (c.includes("norden") || c.includes("nordic")) return "nordic";
  if (c.includes("sverige")) return "sweden";
  if (c.includes("usa") || c.includes("nordamerika")) return "usa";
  if (c.includes("östeuropa") || c.includes("europa")) return "europe";
  if (c.includes("latinamerika") || c.includes("brasilien")) return "latam";
  if (c.includes("norge")) return "norway";
  if (c.includes("blandfond") || c.includes("allokering")) return "";
  return "";
}

function geoFromName(name: string): string {
  const n = name.toLowerCase();
  if (/sverig|sweden|swedish|svenska/.test(n)) return "sweden";
  if (/norg|norway|norwegian|norsk/.test(n)) return "norway";
  if (/finlan|finska|suomi/.test(n)) return "finland";
  if (/\bisland|\biceland/.test(n)) return "iceland";
  if (/nordic|norden|skandin/.test(n)) return "nordic";
  if (/\bex[\s-]?usa\b|excl[\.\s]+usa|excluding usa/.test(n)) return "global";
  if (/\busa\b|united states|amerik|s&p|nasdaq|dow jones|north americ/.test(n)) return "usa";
  if (/emerging|tillväxtmark|frontier/.test(n)) return "emerging";
  if (/japan|japanese/.test(n)) return "japan";
  if (/kina|china|chinese|hong kong/.test(n)) return "china";
  if (/indien|india|indian/.test(n)) return "india";
  if (/\bbrasil|\bbrazil/.test(n)) return "brazil";
  if (/europ/.test(n)) return "europe";
  if (/asia|pacific|apac/.test(n)) return "asia";
  if (/latin americ|latinameri/.test(n)) return "latam";
  if (/africa|afrik/.test(n)) return "africa";
  if (/middle east|nahost/.test(n)) return "middleeast";
  if (/global|world|värld|international/.test(n)) return "global";
  return "";
}

function geographicFocus(category: string | null, name: string): string {
  const fromCat = geoFromCategory(category);
  if (fromCat !== "") return fromCat;
  return geoFromName(name);
}

// Förväntad geo ENBART från kategori (referens för jämförelse)
function expectedGeoFromCategory(category: string | null): string {
  if (!category) return "";
  const c = category.toLowerCase();
  if (c.startsWith("branschfond") || c.startsWith("ränte") || c.startsWith("pengamark")) return "skip";
  if (c.includes("blandfond") || c.includes("allokering")) return "skip";
  return geoFromCategory(category);
}

// ── Läs in Avanza-data ────────────────────────────────────────────────────────

const raw = JSON.parse(
  readFileSync(join(process.cwd(), "data/avanza-funds.json"), "utf-8")
) as { funds: { name: string; isin: string; category: string | null; category_group: string | null }[] };

type Mismatch = {
  isin: string;
  name: string;
  category: string;
  categoryGeo: string;
  nameFocus: string;
};

const mismatches: Mismatch[] = [];
const skipped: number[] = [];

for (const f of raw.funds) {
  const expectedGeo = expectedGeoFromCategory(f.category);

  // Hoppa över kategorier utan geografisk signal
  if (expectedGeo === "skip" || expectedGeo === "") {
    skipped.push(1);
    continue;
  }

  // Vad säger den nya produktionslogiken (kategori primärt, namn fallback)?
  const actualGeo = geographicFocus(f.category, f.name);

  const differs = actualGeo !== "" && actualGeo !== expectedGeo;

  if (differs) {
    mismatches.push({
      isin: f.isin,
      name: f.name,
      category: f.category ?? "",
      categoryGeo: expectedGeo,
      nameFocus: actualGeo,
    });
  }
}

// ── Rapport ───────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(100)}`);
console.log(`GEOGRAFISK MISSMATCH – geographicFocus(name) vs Avanza-kategori`);
console.log(`${"═".repeat(100)}`);
console.log(`Totalt analyserade: ${raw.funds.length - skipped.length} fonder | Missmatchningar: ${mismatches.length}\n`);

// Gruppera per kategori för bättre överblick
const byCategory = new Map<string, Mismatch[]>();
for (const m of mismatches) {
  const key = `${m.category}  (kategori→${m.categoryGeo})`;
  if (!byCategory.has(key)) byCategory.set(key, []);
  byCategory.get(key)!.push(m);
}

for (const [catKey, items] of [...byCategory.entries()].sort()) {
  console.log(`\n▶ ${catKey}`);
  for (const m of items) {
    console.log(`  [${m.nameFocus.padEnd(12)}] ${m.isin}  ${m.name}`);
  }
}

console.log(`\n${"─".repeat(100)}`);
console.log(`\nFörklaring av kolumner:`);
console.log(`  [nameFocus]  = vad geographicFocus() läser av från fondnamnet`);
console.log(`  kategori→X   = vad Avanzas kategori säger att geografin borde vara`);
console.log(`\nDessa fonder riskerar att hamna i fel peer-grupp vid fondbytesförslag.\n`);
