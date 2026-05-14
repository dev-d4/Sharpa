/**
 * Testar kategoriseringspipelinen end-to-end:
 *
 * 1. refineCategory   – namnbaserad override (refresh-scriptet + runtime lib/nordnet.ts)
 * 2. NN_CATEGORY_TO_AVANZA – alla Morningstar-kategorier producerar svenska kategorier
 * 3. Full pipeline    – råkategori + fondnamn → slutkategori i databasen
 * 4. geoFromCategory  – geografisk signal från kategori (används för peer-matching)
 * 5. Avanza-data      – alla befintliga Avanza-kategorier ger korrekt geo-signal
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { geoFromCategory } from "@/lib/analysis";

// ── Hjälpfunktioner (speglar refresh-funds.mjs och lib/nordnet.ts) ─────────────

// Morningstar → Avanza-kategori (SINGLE SOURCE OF TRUTH för tester)
// Hålls identisk med NN_CATEGORY_TO_AVANZA i lib/nordnet.ts och scripts/refresh-funds.mjs
const NN_CATEGORY_TO_AVANZA: Record<string, string> = {
  "Global Equity Large Cap":                  "Global, Mix bolag",
  "Global Equity Mid/Small Cap":              "Global, Små/medelstora bolag",
  "Global Emerging Markets Equity":           "Tillväxtmarknader",
  "Europe Equity Large Cap":                  "Europa, Mix bolag",
  "Europe Equity Mid/Small Cap":              "Europa, Småbolag",
  "Europe Emerging Markets Equity":           "Östeuropa ex Ryssland",
  "US Equity Large Cap Blend":                "USA, Mix bolag",
  "US Equity Large Cap Growth":               "USA, Tillväxtbolag",
  "US Equity Large Cap Value":                "USA, Värdebolag",
  "US Equity Small Cap":                      "USA, Småbolag",
  "US Equity Mid Cap":                        "USA, Medelstora bolag",
  "Asia ex-Japan Equity":                     "Asien ex Japan",
  "Asia Equity":                              "Asien & Australien ex Japan",
  "Japan Equity":                             "Japan, Mix bolag",
  "Greater China Equity":                     "Kina & närliggande",
  "India Equity":                             "Indien",
  "Latin America Equity":                     "Latinamerika",
  "Africa Equity":                            "Afrika och Mellanöstern",
  "UK Equity Large Cap":                      "Storbritannien",
  "Korea Equity":                             "Övriga aktiefonder",
  "Thailand Equity":                          "Övriga aktiefonder",
  "Australia & New Zealand Equity":           "Övriga aktiefonder",
  "Equity Miscellaneous":                     "Övriga aktiefonder",
  "Technology Sector Equity":                 "Branschfond, Ny teknik",
  "Healthcare Sector Equity":                 "Branschfond, Bioteknik",
  "Real Estate Sector Equity":                "Branschfond, Fastighetsbolag övriga",
  "Energy Sector Equity":                     "Branschfond, Energi",
  "Natural Resources Sector Equity":          "Branschfond, Råvaror",
  "Infrastructure Sector Equity":             "Branschfond, Infrastruktur",
  "Precious Metals Sector Equity":            "Branschfond, Ädelmetaller",
  "Consumer Goods & Services Sector Equity":  "Branschfond, Konsument",
  "Industrials Sector Equity":                "Branschfond, Industrimaterial",
  "Financials Sector Equity":                 "Branschfond, Finans",
  "Communications Sector Equity":             "Branschfond, Kommunikation",
  "Europe Fixed Income":                      "Ränte - euro obligationer",
  "Global Fixed Income":                      "Ränte - övriga obligationer",
  "Emerging Markets Fixed Income":            "Ränte - tillväxtmarknader, Obligationer",
  "US Fixed Income":                          "Ränte - övriga obligationer",
  "Asia Fixed Income":                        "Ränte - övriga obligationer",
  "Fixed Income Miscellaneous":               "Ränte - övriga obligationer",
  "Moderate Allocation":                      "Blandfond - SEK, Balanserad",
  "Flexible Allocation":                      "Blandfond - SEK, Flexibel",
  "Aggressive Allocation":                    "Blandfond - SEK, Aggressiv",
  "Cautious Allocation":                      "Blandfond - SEK, Försiktig",
  "Allocation Miscellaneous":                 "Blandfond - SEK, Flexibel",
  "Target Date":                              "Blandfond - SEK, Balanserad",
  "Long/Short Equity":                        "Lång/kort, Övriga",
  "Global Macro":                             "Hedgefond, Global makro, Övriga",
  "Market Neutral":                           "Hedgefond, Marknadsneutral, Övriga",
  "Multialternative":                         "Hedgefond, Multi-strategi, Övriga",
  "Alternative Miscellaneous":                "Hedgefond, Övriga",
  "Options Trading":                          "Hedgefond, Övriga",
  "Euro Money Market":                        "Penningmarknadsfond",
  "US Money Market":                          "Penningmarknadsfond",
  "Money Market Miscellaneous":               "Penningmarknadsfond",
  "Norway Equity":                            "Norge",
  "Norwegian Equity":                         "Norge",
  "Sverige (Norge)":                          "Norge",
  "Sweden Equity":                            "Sverige",
  "Swedish Equity":                           "Sverige",
  "Sverige":                                  "Sverige",
  "Denmark Equity":                           "Danmark",
  "Sverige (Danmark)":                        "Danmark",
  "Finnish Equity":                           "Finland",
  "Sverige (Finland)":                        "Finland",
  "Nordic Equity":                            "Norden",
  "Scandinavia Equity":                       "Norden",
};

function refineCategory(mappedCategory: string | null, fundName: string): string | null {
  if (!mappedCategory || !fundName) return mappedCategory;
  const n = fundName.toLowerCase();
  if (/sverig|sweden|swedish|svenska/.test(n))  return "Sverige";
  if (/\bnorg|norway|norwegian|norsk/.test(n))  return "Norge";
  if (/\bdanm|denmark|danish|dansk/.test(n))    return "Danmark";
  if (/\bfinlan|finska|suomi/.test(n))          return "Finland";
  if (/nordic|norden|skandin/.test(n))          return "Norden";
  if (/\bkina\b|china|chinese/.test(n))         return "Kina & närliggande";
  if (/indien|india\b/.test(n))                 return "Indien";
  if (/japan|japanese/.test(n))                 return "Japan, Mix bolag";
  if (/\bbrasil|\bbrazil/.test(n))              return "Brasilien";
  return mappedCategory;
}

function pipeline(rawCategory: string | null, fundName: string): string | null {
  const mapped = rawCategory ? (NN_CATEGORY_TO_AVANZA[rawCategory] ?? rawCategory) : null;
  return refineCategory(mapped, fundName);
}

// ── 1. refineCategory ─────────────────────────────────────────────────────────

describe("refineCategory – namnbaserad override", () => {
  it("Sverige-fonder får kategori Sverige", () => {
    expect(refineCategory("Europa, Mix bolag", "Nordnet Sverige Index")).toBe("Sverige");
    expect(refineCategory("Europa, Mix bolag", "Länsförsäkringar Sverige")).toBe("Sverige");
    expect(refineCategory("Europa, Mix bolag", "Swedish Large Cap Fund")).toBe("Sverige");
  });

  it("Norge-fonder får kategori Norge", () => {
    expect(refineCategory("Europa, Mix bolag", "Nordnet Norge Index")).toBe("Norge");
    expect(refineCategory("Europa, Mix bolag", "DNB Norway Equity")).toBe("Norge");
  });

  it("Danmark-fonder får kategori Danmark", () => {
    expect(refineCategory("Europa, Mix bolag", "Nordnet Danmark Index")).toBe("Danmark");
    expect(refineCategory("Europa, Mix bolag", "Danske Aktier A")).toBe("Danmark");
  });

  it("Finland-fonder får kategori Finland", () => {
    expect(refineCategory("Europa, Mix bolag", "Nordnet Finland Index")).toBe("Finland");
    expect(refineCategory("Europa, Mix bolag", "OP Finland Fund")).toBe("Finland");
  });

  it("Norden-fonder får kategori Norden", () => {
    expect(refineCategory("Europa, Mix bolag", "Nordnet Norden Index")).toBe("Norden");
    expect(refineCategory("Global, Mix bolag", "Carnegie Nordic Large Cap")).toBe("Norden");
  });

  it("Japan-fonder får kategori Japan, Mix bolag", () => {
    expect(refineCategory("Asien & Australien ex Japan", "Fidelity Japan Growth")).toBe("Japan, Mix bolag");
  });

  it("Kina-fonder får kategori Kina & närliggande", () => {
    expect(refineCategory("Tillväxtmarknader", "Nordnet Kina Index")).toBe("Kina & närliggande");
    expect(refineCategory("Tillväxtmarknader", "Matthews China Fund")).toBe("Kina & närliggande");
  });

  it("Indien-fonder får kategori Indien", () => {
    expect(refineCategory("Tillväxtmarknader", "Franklin India Fund")).toBe("Indien");
  });

  it("Brasilien-fonder får kategori Brasilien", () => {
    expect(refineCategory("Latinamerika", "BNP Brazil Fund")).toBe("Brasilien");
  });

  it("returnerar oförändrad kategori när inget namn matchar", () => {
    expect(refineCategory("Global, Mix bolag", "Fidelity World Growth")).toBe("Global, Mix bolag");
    expect(refineCategory("USA, Mix bolag", "Vanguard S&P 500")).toBe("USA, Mix bolag");
  });

  it("returnerar null om kategori är null", () => {
    expect(refineCategory(null, "Nordnet Sverige Index")).toBeNull();
  });

  it("inga falska positiver – 'Standard Chartered' utlöser inte Danmark", () => {
    expect(refineCategory("Asien & Australien ex Japan", "Standard Chartered Asia Fund")).not.toBe("Danmark");
  });

  it("'Scandinavian' utan nordiska nyckelord ger ingen override", () => {
    // "Scandinavian" innehåller inte 'nordic', 'norden' eller 'skandin' → ingen träff
    expect(refineCategory("Europa, Mix bolag", "Scandinavian Equity")).toBe("Europa, Mix bolag");
  });
});

// ── 2. NN_CATEGORY_TO_AVANZA – alla värden är svenska kategorier ───────────────

describe("NN_CATEGORY_TO_AVANZA – mapping-integritet", () => {
  const ENGLISH_PATTERNS = /\b(equity|fund|large|small|mid|cap|allocation|market|fixed income|emerging|blend|growth|value|sector|global macro|neutral|alternative|miscellaneous)\b/i;

  it("inga Morningstar-engelska strängar finns kvar som värden", () => {
    const englishValues = Object.entries(NN_CATEGORY_TO_AVANZA)
      .filter(([, v]) => ENGLISH_PATTERNS.test(v));
    expect(englishValues, `Dessa värden ser engelska ut: ${englishValues.map(([k, v]) => `${k} → ${v}`).join(", ")}`).toHaveLength(0);
  });

  it("alla nycklar är icke-tomma strängar", () => {
    for (const key of Object.keys(NN_CATEGORY_TO_AVANZA)) {
      expect(key.trim().length).toBeGreaterThan(0);
    }
  });

  it("alla värden är icke-tomma strängar", () => {
    for (const val of Object.values(NN_CATEGORY_TO_AVANZA)) {
      expect(val.trim().length).toBeGreaterThan(0);
    }
  });

  it("nordiska länder mappas till korrekta svenska kategorier", () => {
    expect(NN_CATEGORY_TO_AVANZA["Sweden Equity"]).toBe("Sverige");
    expect(NN_CATEGORY_TO_AVANZA["Swedish Equity"]).toBe("Sverige");
    expect(NN_CATEGORY_TO_AVANZA["Norway Equity"]).toBe("Norge");
    expect(NN_CATEGORY_TO_AVANZA["Norwegian Equity"]).toBe("Norge");
    expect(NN_CATEGORY_TO_AVANZA["Denmark Equity"]).toBe("Danmark");
    expect(NN_CATEGORY_TO_AVANZA["Finnish Equity"]).toBe("Finland");
    expect(NN_CATEGORY_TO_AVANZA["Nordic Equity"]).toBe("Norden");
  });

  it("globala kategorier mappas korrekt", () => {
    expect(NN_CATEGORY_TO_AVANZA["Global Equity Large Cap"]).toBe("Global, Mix bolag");
    expect(NN_CATEGORY_TO_AVANZA["Global Emerging Markets Equity"]).toBe("Tillväxtmarknader");
    expect(NN_CATEGORY_TO_AVANZA["US Equity Large Cap Blend"]).toBe("USA, Mix bolag");
    expect(NN_CATEGORY_TO_AVANZA["Asia ex-Japan Equity"]).toBe("Asien ex Japan");
  });
});

// ── 3. Full pipeline: råkategori + namn → slutkategori i DB ──────────────────

describe("Full pipeline – Morningstar-kategori + fondnamn → DB-kategori", () => {
  const cases: [string, string, string][] = [
    // [råkategori från Nordnet, fondnamn, förväntad DB-kategori]
    ["Europe Equity Large Cap",  "Nordnet Sverige Index",        "Sverige"],
    ["Europe Equity Large Cap",  "Nordnet Norge Index",          "Norge"],
    ["Europe Equity Large Cap",  "Nordnet Danmark Index",        "Danmark"],
    ["Europe Equity Large Cap",  "Nordnet Finland Index",        "Finland"],
    ["Europe Equity Large Cap",  "Nordnet Europa Index",         "Europa, Mix bolag"],
    ["Global Equity Large Cap",  "Nordnet Global Index",         "Global, Mix bolag"],
    ["Global Equity Large Cap",  "Nordnet Norden Index",         "Norden"],
    ["Asia Equity",              "Nordnet Japan Index",          "Japan, Mix bolag"],
    ["Greater China Equity",     "Nordnet Kina Index",           "Kina & närliggande"],
    ["India Equity",             "Nordnet Indien Index",         "Indien"],
    ["US Equity Large Cap Blend","Nordnet USA Index",            "USA, Mix bolag"],
    ["Global Equity Large Cap",  "Fidelity World Opportunities", "Global, Mix bolag"],
    ["Sweden Equity",            "SEB Sverige Aktier",           "Sverige"],
    ["Technology Sector Equity", "Nordnet Teknik Index",         "Branschfond, Ny teknik"],
    ["Moderate Allocation",      "Livförsäkring Balanserad",     "Blandfond - SEK, Balanserad"],
    // Okänd Morningstar-kategori → bevaras som-är (bättre än null)
    ["Ny okänd Morningstar Cat", "Unknown Fund XYZ",             "Ny okänd Morningstar Cat"],
  ];

  it.each(cases)('"%s" + "%s" → "%s"', (raw, name, expected) => {
    expect(pipeline(raw, name)).toBe(expected);
  });

  it("null råkategori ger null oavsett namn", () => {
    expect(pipeline(null, "Nordnet Sverige Index")).toBeNull();
  });
});

// ── 4. geoFromCategory – geografisk signal från DB-kategori ──────────────────

describe("geoFromCategory – geografisk peer-matching", () => {
  const cases: [string, string][] = [
    // [DB-kategori, förväntad geo-signal]
    ["Sverige",                           "sweden"],
    ["Sverige, Små-/medelstora bolag",    "sweden"],
    ["Global & Sverige",                  "global"],
    ["Global, Mix bolag",                 "global"],
    ["Global, Tillväxtbolag",             "global"],
    ["USA, Mix bolag",                    "usa"],
    ["USA, Småbolag",                     "usa"],
    ["Europa, Mix bolag",                 "europe"],
    ["Östeuropa ex Ryssland",             "europe"],
    ["Norden",                            "nordic"],
    ["Norge",                             "norway"],
    ["Danmark",                           "denmark"],
    ["Finland",                           "finland"],
    ["Tillväxtmarknader",                 "emerging"],
    ["Tillväxtmarknader ex Kina",         "emerging"],
    ["Asien ex Japan",                    "asia-ex-japan"],
    ["Asien & Australien ex Japan",       "asia"],
    ["Japan, Mix bolag",                  "japan"],
    ["Japan, Värdebolag",                 "japan"],
    ["Kina & närliggande",                "china"],
    ["Indien",                            "india"],
    ["Latinamerika",                      "latam"],
    ["Brasilien",                         "latam"],
    // Sektorfonder – ingen geo (ska inte filtrera peers geografiskt)
    ["Branschfond, Ny teknik",            ""],
    ["Branschfond, Energi",               ""],
    ["Ränte - SEK obligationer",          ""],
    ["Penningmarknadsfond",               ""],
    // Blandfonder – ingen geo
    ["Blandfond - SEK, Balanserad",       ""],
    // Okänd kategori – ingen geo
    ["Okänd kategori xyz",                ""],
  ];

  it.each(cases)('"%s" → geo "%s"', (category, expectedGeo) => {
    expect(geoFromCategory(category)).toBe(expectedGeo);
  });

  it("null ger tom sträng", () => {
    expect(geoFromCategory(null)).toBe("");
  });
});

// ── 5. Avanza-data – kontroll av alla befintliga kategorier ──────────────────

describe("Avanza-fonddatabasen – kategorisanity", () => {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), "data/avanza-funds.json"), "utf-8"),
  ) as { funds: { isin: string; name: string; category: string | null }[] };

  it("innehåller inga Morningstar-engelska kategoristrängar", () => {
    // "Private Equity" är vedertagen term på svenska och undantas
    const ENGLISH = /\b(equity|large cap|small cap|mid cap|allocation|fixed income|money market|sector|emerging)\b/i;
    const offenders = raw.funds
      .filter((f) => f.category && ENGLISH.test(f.category) && !f.category.includes("Private Equity"))
      .map((f) => `${f.isin}: ${f.category}`);
    expect(offenders, `Engelska kategorier hittades:\n${offenders.join("\n")}`).toHaveLength(0);
  });

  it("alla kategorier med geografisk signal ger korrekt geo via geoFromCategory", () => {
    const GEO_CATEGORIES: Record<string, string> = {
      "Sverige": "sweden",
      "Global, Mix bolag": "global",
      "USA, Mix bolag": "usa",
      "Europa, Mix bolag": "europe",
      "Norden": "nordic",
      "Norge": "norway",
      "Japan, Mix bolag": "japan",
      "Kina & närliggande": "china",
      "Indien": "india",
      "Tillväxtmarknader": "emerging",
      "Asien ex Japan": "asia-ex-japan",
    };

    for (const [cat, expectedGeo] of Object.entries(GEO_CATEGORIES)) {
      const fundsWithCat = raw.funds.filter((f) => f.category === cat);
      if (fundsWithCat.length === 0) continue; // kategori kanske inte finns i snapshot
      expect(geoFromCategory(cat), `Kategori "${cat}" gav fel geo`).toBe(expectedGeo);
    }
  });
});
