/**
 * Filimport av innehav (Avanza, Nordnet och generiska exporter).
 *
 * Stödda format: .csv / .txt (semikolon, tab eller komma) samt .xlsx.
 * Parsningen är avsiktligt tolerant — vi letar efter kolumner på namn, inte på
 * position, så att en omsorterad eller nedbantad export fortfarande fungerar.
 *
 * Kravspecifikationen för filen finns i docs/filimport.md och speglas av
 * COLUMN_REQUIREMENTS nedan (som visas i importguiden).
 */

// ── Publika typer ─────────────────────────────────────────────────────────────

export type HoldingType = "fund" | "etf" | "stock" | "certificate" | "other";

export interface ParsedHolding {
  name: string;
  isin: string | null;
  account: string | null;
  type: HoldingType;
  /** Marknadsvärde i SEK, eller andel i procent när filen saknar värdekolumn. */
  value: number;
}

export interface ParsedFile {
  /** Fondliknande rader, aggregerade per ISIN och sorterade efter värde. */
  holdings: ParsedHolding[];
  /** Rader som filtrerats bort för att de inte är fonder (aktier, ETF:er, certifikat). */
  skipped: ParsedHolding[];
  /** Om värdena är belopp eller redan färdiga procentandelar. */
  valueKind: "amount" | "weight";
  /** Antal innehav som klipptes bort av MAX_HOLDINGS-taket. */
  truncated: number;
}

export type ImportErrorCode =
  | "unsupported-format" // filändelsen stöds inte
  | "empty" // filen är tom eller saknar datarader
  | "no-columns" // hittade inte namn- och/eller värdekolumn
  | "no-rows" // inga rader med giltigt värde
  | "only-non-funds"; // filen innehöll bara aktier/ETF:er/certifikat

export class ImportError extends Error {
  code: ImportErrorCode;
  /** Kolumnrubrikerna vi faktiskt hittade — används i felmeddelandet. */
  headers?: string[];
  constructor(code: ImportErrorCode, message: string, headers?: string[]) {
    super(message);
    this.name = "ImportError";
    this.code = code;
    this.headers = headers;
  }
}

/** Fler innehav än så importeras inte — analysen blir oläsbar och API-anropen många. */
export const MAX_HOLDINGS = 50;

/** Filändelser som filväljaren och parsern accepterar. */
export const ACCEPTED_EXTENSIONS = [".csv", ".txt", ".xlsx"] as const;
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");

// ── Kolumnkrav (visas i UI och dokumenteras i docs/filimport.md) ───────────────

export const COLUMN_REQUIREMENTS = {
  required: [
    {
      label: "Namn",
      aliases: ["Namn", "Name", "Värdepapper", "Instrument", "Fond", "Innehav"],
      note: "Fondens namn.",
    },
    {
      label: "Marknadsvärde",
      aliases: ["Marknadsvärde", "Värde (SEK)", "Värde SEK", "Marknadsvärde SEK", "Andel (%)"],
      note: "Värdet i kronor — eller en färdig procentandel om du hellre anger det.",
    },
  ],
  optional: [
    { label: "ISIN", aliases: ["ISIN"], note: "Ger exakt matchning i stället för namnsökning." },
    { label: "Typ", aliases: ["Typ", "Type"], note: "Används för att sortera bort aktier, ETF:er och certifikat." },
    { label: "Kontonummer", aliases: ["Kontonummer", "Konto", "Depå"], note: "Visas bara som information." },
  ],
} as const;

// ── Kolumnigenkänning ─────────────────────────────────────────────────────────

const NAME_HEADERS = ["namn", "name", "värdepapper", "vardepapper", "instrument", "fond", "innehav", "fondnamn"];
const ISIN_HEADERS = ["isin", "isin-kod", "isinkod", "isin code"];
const TYPE_HEADERS = ["typ", "type", "instrumenttyp", "värdepapperstyp"];
const ACCOUNT_HEADERS = ["kontonummer", "konto", "depå", "depa", "konto-id", "account"];

/** Kolumner som ser ut som värden men aldrig är marknadsvärde. */
const VALUE_BLOCKLIST = ["gav", "inköp", "inkop", "anskaffning", "belån", "belan", "kurs", "utveckling", "avkastning"];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/^["']|["']$/g, "").replace(/\s+/g, " ");
}

function findValueColumn(headers: string[], nameIdx: number): { index: number; kind: "amount" | "weight" } | null {
  const candidates = headers.map((h, i) => ({ h, i })).filter(({ h, i }) => i !== nameIdx && h && !VALUE_BLOCKLIST.some((b) => h.includes(b)));

  // Prioritetsordning: marknadsvärde → värde+sek → värde → andel/vikt
  const matchers: { test: (h: string) => boolean; kind: "amount" | "weight" }[] = [
    { test: (h) => h.includes("marknadsvärde") || h.includes("marknadsvarde"), kind: "amount" },
    { test: (h) => h.includes("värde") && h.includes("sek"), kind: "amount" },
    { test: (h) => h === "värde" || h === "varde" || h === "value" || h === "belopp", kind: "amount" },
    { test: (h) => h.startsWith("andel") || h.startsWith("vikt") || h.startsWith("weight"), kind: "weight" },
  ];

  for (const m of matchers) {
    const hit = candidates.find(({ h }) => m.test(h));
    if (hit) return { index: hit.i, kind: m.kind };
  }
  return null;
}

// ── Typkolumn → HoldingType ───────────────────────────────────────────────────

const TYPE_MAP: Record<string, HoldingType> = {
  fund: "fund",
  fond: "fund",
  mutual_fund: "fund",
  exchange_traded_fund: "etf",
  etf: "etf",
  "börshandlad fond": "etf",
  stock: "stock",
  aktie: "stock",
  share: "stock",
  equity: "stock",
  certificate: "certificate",
  certifikat: "certificate",
  etp: "certificate",
  warrant: "certificate",
};

function classifyType(raw: string | null): HoldingType {
  if (!raw) return "fund"; // ingen typkolumn → anta att allt är fonder
  return TYPE_MAP[raw.trim().toLowerCase()] ?? "other";
}

/**
 * Bara fonder importeras. Aktier, certifikat och börshandlade fonder saknas i
 * fondregistret (avanza_fund_data / nordnet_fund_data innehåller inga ETF:er),
 * så de skulle ändå aldrig gå att matcha.
 */
function isImportable(type: HoldingType): boolean {
  return type === "fund" || type === "other";
}

// ── Talparsning (svenskt format) ──────────────────────────────────────────────

export function parseSwedishNumber(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (!raw) return null;

  // Ta bort blanksteg (inkl. hårt mellanslag), valutakoder och procenttecken
  let s = String(raw)
    .replace(/[\s  ]/g, "")
    .replace(/(kr|sek|%)/gi, "")
    .replace(/^["']|["']$/g, "");
  if (!s) return null;

  const negative = s.startsWith("-") || (s.startsWith("(") && s.endsWith(")"));
  s = s.replace(/[^0-9.,]/g, "");
  if (!s) return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // Sista skiljetecknet är decimaltecknet, det andra är tusentalsavgränsare
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (hasComma) {
    s = s.replace(/,/g, ".");
  }

  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}\d$/;

function normalizeIsin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase().replace(/[\s-]/g, "");
  return ISIN_RE.test(s) ? s : null;
}

// ── CSV-parsning ──────────────────────────────────────────────────────────────

function detectSeparator(headerLine: string): string {
  const counts = [";", "\t", ","].map((sep) => ({ sep, n: headerLine.split(sep).length - 1 }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].sep : ";";
}

/** Radsplittning som respekterar citattecken (fältvärden kan innehålla separatorn). */
export function parseDelimitedText(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const sep = detectSeparator(clean.split(/\r?\n/)[0] ?? "");

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === sep) { row.push(field); field = ""; continue; }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      continue;
    }
    field += c;
  }
  row.push(field);
  if (row.some((v) => v.trim())) rows.push(row);

  return rows.map((r) => r.map((v) => v.trim()));
}

/**
 * Avkodar filen som UTF-8, med fallback till Windows-1252 när resultatet
 * innehåller ersättningstecken (Avanza-exporter är ibland latin-kodade).
 */
export function decodeFileBytes(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(buffer);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(buffer);

  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!utf8.includes("�")) return utf8.replace(/^﻿/, "");
  try {
    return new TextDecoder("windows-1252").decode(buffer).replace(/^﻿/, "");
  } catch {
    return utf8.replace(/^﻿/, "");
  }
}

// ── Rader → innehav ───────────────────────────────────────────────────────────

/** Gemensam kärna: tar råa celler (från CSV eller Excel) och plockar ut innehaven. */
export function rowsToHoldings(rawRows: (string | number | null)[][]): ParsedFile {
  const rows = rawRows.filter((r) => r.some((c) => c !== null && String(c).trim() !== ""));
  if (rows.length < 2) {
    throw new ImportError("empty", "Filen innehåller inga rader att importera.");
  }

  const headers = rows[0].map((c) => normalizeHeader(String(c ?? "")));
  const nameIdx = headers.findIndex((h) => NAME_HEADERS.includes(h));
  const value = nameIdx === -1 ? null : findValueColumn(headers, nameIdx);

  if (nameIdx === -1 || !value) {
    throw new ImportError(
      "no-columns",
      "Filen saknar en namnkolumn och/eller en värdekolumn.",
      headers.filter(Boolean),
    );
  }

  const isinIdx = headers.findIndex((h) => ISIN_HEADERS.includes(h));
  const typeIdx = headers.findIndex((h) => TYPE_HEADERS.includes(h));
  const accountIdx = headers.findIndex((h) => ACCOUNT_HEADERS.includes(h));

  const parsed: ParsedHolding[] = [];
  for (const row of rows.slice(1)) {
    const name = String(row[nameIdx] ?? "").trim();
    const amount = parseSwedishNumber(row[value.index] ?? null);
    if (!name || amount === null || amount <= 0) continue;

    parsed.push({
      name,
      isin: isinIdx === -1 ? null : normalizeIsin(String(row[isinIdx] ?? "")),
      account: accountIdx === -1 ? null : String(row[accountIdx] ?? "").trim() || null,
      type: classifyType(typeIdx === -1 ? null : String(row[typeIdx] ?? "")),
      value: amount,
    });
  }

  if (parsed.length === 0) {
    throw new ImportError("no-rows", "Hittade inga rader med ett giltigt värde.");
  }

  const keep = parsed.filter((h) => isImportable(h.type));
  const skipped = parsed.filter((h) => !isImportable(h.type));
  if (keep.length === 0) {
    throw new ImportError("only-non-funds", "Filen innehåller inga fonder att analysera — bara aktier, ETF:er eller certifikat.");
  }

  // Samma fond kan finnas på flera konton — slå ihop dem till ett innehav.
  const merged: ParsedHolding[] = [];
  const byKey = new Map<string, ParsedHolding>();
  for (const h of keep) {
    const key = h.isin ?? `name:${h.name.toLowerCase()}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.value += h.value;
      if (existing.account && h.account && existing.account !== h.account) existing.account = null;
    } else {
      const copy = { ...h };
      byKey.set(key, copy);
      merged.push(copy);
    }
  }

  merged.sort((a, b) => b.value - a.value);
  const truncated = Math.max(0, merged.length - MAX_HOLDINGS);

  return {
    holdings: merged.slice(0, MAX_HOLDINGS),
    skipped,
    valueKind: value.kind,
    truncated,
  };
}

/** Fördelar 100 % över innehaven, med avrundningsresten lagd på det största. */
export function toWeights(holdings: ParsedHolding[]): number[] {
  const total = holdings.reduce((s, h) => s + h.value, 0);
  if (total <= 0) return holdings.map(() => 0);
  const weights = holdings.map((h) => Math.round((h.value / total) * 1000) / 10);
  const diff = parseFloat((100 - weights.reduce((s, w) => s + w, 0)).toFixed(1));
  if (diff !== 0 && weights.length > 0) weights[0] = parseFloat((weights[0] + diff).toFixed(1));
  return weights;
}

// ── Filinläsning ──────────────────────────────────────────────────────────────

function extensionOf(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i === -1 ? "" : fileName.slice(i).toLowerCase();
}

/** Läser en uppladdad fil (CSV eller Excel) och returnerar innehaven. */
export async function parseHoldingsFile(file: File): Promise<ParsedFile> {
  const ext = extensionOf(file.name);

  if (ext === ".xlsx") {
    // Dynamisk import — Excel-parsern (~40 kB) ska inte ligga i huvudbundeln.
    const { readSheet } = await import("read-excel-file/browser");
    const sheet = await readSheet(file);
    return rowsToHoldings(sheet as (string | number | null)[][]);
  }

  if (ext === ".xls") {
    throw new ImportError(
      "unsupported-format",
      "Gamla .xls-filer stöds inte. Spara om filen som .xlsx eller .csv och försök igen.",
    );
  }

  if (ext && !ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number])) {
    throw new ImportError(
      "unsupported-format",
      `Filformatet ${ext} stöds inte. Ladda upp en CSV- eller Excel-fil (.xlsx).`,
    );
  }

  const text = decodeFileBytes(await file.arrayBuffer());
  return rowsToHoldings(parseDelimitedText(text));
}
