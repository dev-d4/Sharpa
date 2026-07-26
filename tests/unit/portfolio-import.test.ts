/**
 * Testar filimporten av innehav (lib/portfolio-import.ts):
 *
 * 1. Talparsning i svenskt format
 * 2. CSV-parsning (separatordetektering + citattecken)
 * 3. Avanza-export — kolumnigenkänning, typfiltrering, ISIN, flera konton
 * 4. Nordnet-export — tab-separerad, "Värde SEK"
 * 5. Viktberäkning som alltid summerar till 100 %
 * 6. Felfall
 */

import { describe, expect, it } from "vitest";
import {
  ImportError,
  MAX_HOLDINGS,
  parseDelimitedText,
  parseSwedishNumber,
  rowsToHoldings,
  toWeights,
} from "@/lib/portfolio-import";

// ── 1. Talparsning ────────────────────────────────────────────────────────────

describe("parseSwedishNumber", () => {
  it("läser svenskt decimalkomma", () => {
    expect(parseSwedishNumber("17355,20")).toBe(17355.2);
  });

  it("hanterar mellanslag och hårt mellanslag som tusentalsavgränsare", () => {
    expect(parseSwedishNumber("85 471,23")).toBe(85471.23);
    expect(parseSwedishNumber("85 471,23")).toBe(85471.23);
  });

  it("hanterar punkt som tusentalsavgränsare när komma är decimaltecken", () => {
    expect(parseSwedishNumber("1.234.567,89")).toBe(1234567.89);
  });

  it("hanterar engelskt format", () => {
    expect(parseSwedishNumber("1,234,567.89")).toBe(1234567.89);
    expect(parseSwedishNumber("42.5")).toBe(42.5);
  });

  it("plockar bort valuta och procenttecken", () => {
    expect(parseSwedishNumber("12 345 kr")).toBe(12345);
    expect(parseSwedishNumber("8,4 %")).toBe(8.4);
  });

  it("släpper igenom tal oförändrade (Excel ger nummer)", () => {
    expect(parseSwedishNumber(85471.23)).toBe(85471.23);
  });

  it("returnerar null för tomt och skräp", () => {
    expect(parseSwedishNumber("")).toBeNull();
    expect(parseSwedishNumber(null)).toBeNull();
    expect(parseSwedishNumber("—")).toBeNull();
  });
});

// ── 2. CSV-parsning ───────────────────────────────────────────────────────────

describe("parseDelimitedText", () => {
  it("upptäcker semikolon", () => {
    const rows = parseDelimitedText("Namn;Marknadsvärde\nAvanza Zero;85471,23");
    expect(rows).toEqual([["Namn", "Marknadsvärde"], ["Avanza Zero", "85471,23"]]);
  });

  it("upptäcker tab", () => {
    const rows = parseDelimitedText("Namn\tVärde SEK\nAvanza Zero\t85471,23");
    expect(rows[1]).toEqual(["Avanza Zero", "85471,23"]);
  });

  it("respekterar citattecken runt fält som innehåller separatorn", () => {
    const rows = parseDelimitedText('Namn;Marknadsvärde\n"Fond A; klass B";100');
    expect(rows[1]).toEqual(["Fond A; klass B", "100"]);
  });

  it("hanterar BOM, CRLF och tomma rader", () => {
    const rows = parseDelimitedText("﻿Namn;Marknadsvärde\r\nA;1\r\n\r\nB;2\r\n");
    expect(rows).toEqual([["Namn", "Marknadsvärde"], ["A", "1"], ["B", "2"]]);
  });
});

// ── 3. Avanza-export ──────────────────────────────────────────────────────────

const AVANZA_CSV = [
  "Kontonummer;Namn;Kortnamn;Volym;Marknadsvärde;GAV (SEK);GAV;Valuta;Land;ISIN;Marknad;Typ",
  "9551-4326545;Volvo B;VOLV B;68;24126,00;249,33;249,33;SEK;SE;SE0000115446;XSTO;STOCK",
  "9555-9613365;Valour Bitcoin (BTC) Zero SEK;VALOUR;670;41580,20;48,95;48,95;SEK;SE;CH0585378661;XSAT;CERTIFICATE",
  "9558-9983454;Avanza Zero;Avanza Zero;156,3603;60000,00;337,38;337,38;SEK;SE;SE0001718388;FUND;FUND",
  "9558-9983454;Avanza Global;Avanza Global;154,0006;30000,00;160,46;160,46;SEK;SE;SE0011527613;FUND;FUND",
  "9558-9983454;L&G ROBO Global Robotics;IROB;32;10000,00;282,72;26,22;EUR;DE;IE00BMW3QX54;XETR;EXCHANGE_TRADED_FUND",
].join("\n");

describe("Avanza-export", () => {
  const parsed = rowsToHoldings(parseDelimitedText(AVANZA_CSV));

  it("väljer Marknadsvärde — inte GAV (SEK)", () => {
    expect(parsed.valueKind).toBe("amount");
    expect(parsed.holdings.find((h) => h.name === "Avanza Zero")?.value).toBe(60000);
  });

  it("plockar ut ISIN och konto", () => {
    const zero = parsed.holdings.find((h) => h.name === "Avanza Zero");
    expect(zero?.isin).toBe("SE0001718388");
    expect(zero?.account).toBe("9558-9983454");
  });

  it("sorterar bort aktier, certifikat och ETF:er (finns inte i fondregistret)", () => {
    expect(parsed.holdings.map((h) => h.name)).toEqual(["Avanza Zero", "Avanza Global"]);
    expect(parsed.skipped.map((h) => h.type).sort()).toEqual(["certificate", "etf", "stock"]);
  });

  it("räknar om vikterna på de kvarvarande fonderna", () => {
    expect(toWeights(parsed.holdings)).toEqual([66.7, 33.3]);
  });

  it("slår ihop samma fond på flera konton", () => {
    const csv = [
      "Kontonummer;Namn;Marknadsvärde;ISIN;Typ",
      "1111-1;Avanza Zero;60000,00;SE0001718388;FUND",
      "2222-2;Avanza Zero;40000,00;SE0001718388;FUND",
    ].join("\n");
    const p = rowsToHoldings(parseDelimitedText(csv));
    expect(p.holdings).toHaveLength(1);
    expect(p.holdings[0].value).toBe(100000);
    expect(p.holdings[0].account).toBeNull(); // olika konton → ingen entydig depå
  });
});

// ── 4. Nordnet-export ─────────────────────────────────────────────────────────

describe("Nordnet-export", () => {
  it("läser tab-separerad fil med kolumnen Värde SEK", () => {
    const tsv = [
      "Namn\tAntal\tKurs\tVärde SEK\tAvkastning",
      "Länsförsäkringar Global Index\t73,04\t287,50\t42904,96\t12,3",
      "Spiltan Aktiefond Investmentbolag\t78,38\t305,56\t57095,04\t8,1",
    ].join("\n");
    const p = rowsToHoldings(parseDelimitedText(tsv));
    expect(p.holdings.map((h) => h.value)).toEqual([57095.04, 42904.96]);
    expect(p.holdings.every((h) => h.isin === null)).toBe(true);
    expect(p.skipped).toHaveLength(0); // ingen Typ-kolumn → allt antas vara fonder
  });
});

// ── 5. Vikter och andelskolumn ────────────────────────────────────────────────

describe("vikter", () => {
  it("normaliserar en färdig andelskolumn till 100 %", () => {
    const csv = ["Namn;Andel (%)", "Fond A;30", "Fond B;30", "Fond C;30"].join("\n");
    const p = rowsToHoldings(parseDelimitedText(csv));
    expect(p.valueKind).toBe("weight");
    const w = toWeights(p.holdings);
    expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(100, 5);
  });

  it("lägger avrundningsresten på det största innehavet", () => {
    const csv = ["Namn;Marknadsvärde", "A;1", "B;1", "C;1"].join("\n");
    const w = toWeights(rowsToHoldings(parseDelimitedText(csv)).holdings);
    expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(100, 5);
  });

  it("klipper listan vid MAX_HOLDINGS och behåller de största", () => {
    const rows = ["Namn;Marknadsvärde"];
    for (let i = 0; i < MAX_HOLDINGS + 5; i++) rows.push(`Fond ${i};${i + 1}`);
    const p = rowsToHoldings(parseDelimitedText(rows.join("\n")));
    expect(p.holdings).toHaveLength(MAX_HOLDINGS);
    expect(p.truncated).toBe(5);
    expect(p.holdings[0].name).toBe(`Fond ${MAX_HOLDINGS + 4}`);
  });
});

// ── 6. Felfall ────────────────────────────────────────────────────────────────

describe("felhantering", () => {
  it("kastar no-columns när värdekolumn saknas", () => {
    try {
      rowsToHoldings(parseDelimitedText("Namn;Kortnamn\nAvanza Zero;AZERO"));
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ImportError);
      expect((e as ImportError).code).toBe("no-columns");
      expect((e as ImportError).headers).toContain("namn");
    }
  });

  it("väljer inte GAV eller inköpsvärde som värdekolumn", () => {
    expect(() =>
      rowsToHoldings(parseDelimitedText("Namn;GAV (SEK);Inköpsvärde SEK\nA;10,00;100,00"))
    ).toThrowError(/värdekolumn/);
  });

  it("kastar empty för fil utan datarader", () => {
    expect(() => rowsToHoldings(parseDelimitedText("Namn;Marknadsvärde"))).toThrowError(ImportError);
  });

  it("kastar no-rows när alla värden är 0 eller ogiltiga", () => {
    try {
      rowsToHoldings(parseDelimitedText("Namn;Marknadsvärde\nA;0\nB;-"));
      expect.unreachable();
    } catch (e) {
      expect((e as ImportError).code).toBe("no-rows");
    }
  });

  it("kastar only-non-funds för en depå utan fonder", () => {
    const csv = [
      "Namn;Marknadsvärde;Typ",
      "Volvo B;24126,00;STOCK",
      "iShares MSCI Poland UCITS ETF;15779,40;EXCHANGE_TRADED_FUND",
    ].join("\n");
    try {
      rowsToHoldings(parseDelimitedText(csv));
      expect.unreachable();
    } catch (e) {
      expect((e as ImportError).code).toBe("only-non-funds");
    }
  });

  it("ignorerar ogiltiga ISIN-koder", () => {
    const csv = ["Namn;Marknadsvärde;ISIN", "Fond A;100;INVALID"].join("\n");
    expect(rowsToHoldings(parseDelimitedText(csv)).holdings[0].isin).toBeNull();
  });
});
