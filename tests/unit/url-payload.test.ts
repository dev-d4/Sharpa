import { describe, expect, it } from "vitest";
import { encodePayload, decodePayload } from "@/lib/report-url";

// ── Helpers that mirror the production logic ──────────────────────────────────
// Kept inline so tests document the contract, not the implementation.

type Fund = { isin: string; weight: number };
type Payload = {
  custodian: string;
  funds: Fund[];
  amount?: number;
  client?: string;
  comment?: string;
};

function buildUrl(
  custodian: string,
  funds: { isin: string; weight: string }[],
  amount = "",
  client = "",
  comment = "",
): string {
  const valid = funds
    .filter((f) => f.isin.trim() && parseFloat(f.weight) > 0)
    .map((f) => ({ isin: f.isin.trim().toUpperCase(), weight: parseFloat(f.weight) }));
  if (!valid.length) return "";
  const payload: Record<string, unknown> = { custodian, funds: valid };
  if (parseFloat(amount) > 0) payload.amount = parseFloat(amount);
  if (client.trim()) payload.client = client.trim();
  if (comment.trim()) payload.comment = comment.trim();
  return `/rapport?p=${encodePayload(payload)}`;
}

function parseUrl(url: string): Payload | null {
  try {
    const p = new URL("http://x" + url).searchParams.get("p");
    if (!p) return null;
    const obj = decodePayload(p) as Record<string, unknown>;
    if (!obj?.custodian || !Array.isArray(obj.funds) || !obj.funds.length) return null;
    return {
      custodian: obj.custodian as string,
      funds: obj.funds as Fund[],
      amount: typeof obj.amount === "number" ? obj.amount : undefined,
      client: typeof obj.client === "string" ? obj.client : undefined,
      comment: typeof obj.comment === "string" ? obj.comment : undefined,
    };
  } catch {
    return null;
  }
}

// ── URL builder ───────────────────────────────────────────────────────────────

describe("buildUrl", () => {
  const fund = { isin: "SE0000813933", weight: "100" };

  it("returnerar tom sträng om inga giltiga fonder", () => {
    expect(buildUrl("avanza", [])).toBe("");
    expect(buildUrl("avanza", [{ isin: "", weight: "50" }])).toBe("");
    expect(buildUrl("avanza", [{ isin: "SE0000813933", weight: "0" }])).toBe("");
    expect(buildUrl("avanza", [{ isin: "SE0000813933", weight: "-10" }])).toBe("");
  });

  it("skapar URL med rätt prefix", () => {
    const url = buildUrl("avanza", [fund]);
    expect(url).toMatch(/^\/rapport\?p=/);
  });

  it("normaliserar ISIN till versaler", () => {
    const url = buildUrl("avanza", [{ isin: "se0000813933", weight: "100" }]);
    const parsed = parseUrl(url)!;
    expect(parsed.funds[0].isin).toBe("SE0000813933");
  });

  it("trimmar blanksteg från ISIN", () => {
    const url = buildUrl("avanza", [{ isin: "  SE0000813933  ", weight: "100" }]);
    const parsed = parseUrl(url)!;
    expect(parsed.funds[0].isin).toBe("SE0000813933");
  });

  it("inkluderar inte amount om värdet är 0 eller saknas", () => {
    const url = buildUrl("avanza", [fund], "0");
    expect(parseUrl(url)?.amount).toBeUndefined();
  });

  it("inkluderar amount när det är > 0", () => {
    const url = buildUrl("avanza", [fund], "850000");
    expect(parseUrl(url)?.amount).toBe(850000);
  });

  it("inkluderar inte client om tomt", () => {
    const url = buildUrl("avanza", [fund], "", "  ");
    expect(parseUrl(url)?.client).toBeUndefined();
  });

  it("inkluderar client och comment när ifyllda", () => {
    const url = buildUrl("avanza", [fund], "", "Anna Svensson", "Bra portfölj");
    const parsed = parseUrl(url)!;
    expect(parsed.client).toBe("Anna Svensson");
    expect(parsed.comment).toBe("Bra portfölj");
  });

  it("filtrerar bort fonder med 0-vikt, behåller de med vikt > 0", () => {
    const url = buildUrl("avanza", [
      { isin: "SE0000813933", weight: "60" },
      { isin: "SE0015382114", weight: "0" },
      { isin: "LU0496786574", weight: "40" },
    ]);
    const parsed = parseUrl(url)!;
    expect(parsed.funds).toHaveLength(2);
    expect(parsed.funds.map((f) => f.isin)).not.toContain("SE0015382114");
  });

  it("hanterar decimalvikter", () => {
    const url = buildUrl("avanza", [
      { isin: "SE0000813933", weight: "33.33" },
      { isin: "SE0015382114", weight: "66.67" },
    ]);
    const parsed = parseUrl(url)!;
    expect(parsed.funds[0].weight).toBeCloseTo(33.33);
    expect(parsed.funds[1].weight).toBeCloseTo(66.67);
  });
});

// ── Roundtrip ─────────────────────────────────────────────────────────────────

describe("encode/decode roundtrip", () => {
  it("returnerar identisk payload efter encode+decode", () => {
    const payload: Payload = {
      custodian: "nordnet",
      funds: [
        { isin: "SE0000813933", weight: 70 },
        { isin: "SE0015382114", weight: 30 },
      ],
      amount: 1_250_000,
      client: "Test Kund",
      comment: "Kommentar",
    };
    const encoded = encodePayload(payload);
    expect(decodePayload(encoded)).toEqual(payload);
  });

  it("hanterar svenska tecken (Å Ä Ö) i kundnamn", () => {
    const payload: Payload = {
      custodian: "avanza",
      funds: [{ isin: "SE0000813933", weight: 100 }],
      client: "Björn Åkesson",
      comment: "Rådgivare: Örjan Ämne",
    };
    const encoded = encodePayload(payload);
    const decoded = decodePayload(encoded) as Payload;
    expect(decoded.client).toBe("Björn Åkesson");
    expect(decoded.comment).toBe("Rådgivare: Örjan Ämne");
  });

  it("hanterar emojis och specialtecken", () => {
    const payload: Payload = {
      custodian: "avanza",
      funds: [{ isin: "SE0000813933", weight: 100 }],
      comment: "Bra val! ✓ €500k mål",
    };
    const encoded = encodePayload(payload);
    expect((decodePayload(encoded) as Payload).comment).toBe("Bra val! ✓ €500k mål");
  });
});

// ── parseUrl felhantering ─────────────────────────────────────────────────────

describe("parseUrl felhantering", () => {
  it("returnerar null om p-parametern saknas", () => {
    expect(parseUrl("/rapport")).toBeNull();
    expect(parseUrl("/rapport?other=foo")).toBeNull();
  });

  it("returnerar null för ogiltig base64", () => {
    expect(parseUrl("/rapport?p=!!!notbase64!!!")).toBeNull();
  });

  it("returnerar null för giltig base64 men ogiltig JSON", () => {
    const bad = encodePayload("detta är inte ett objekt") as string;
    // decodePayload returns a string, parseUrl expects an object
    expect(parseUrl(`/rapport?p=${bad}`)).toBeNull();
  });

  it("returnerar null om custodian saknas", () => {
    const p = encodePayload({ funds: [{ isin: "SE0000813933", weight: 100 }] });
    expect(parseUrl(`/rapport?p=${p}`)).toBeNull();
  });

  it("returnerar null om funds är tom array", () => {
    const p = encodePayload({ custodian: "avanza", funds: [] });
    expect(parseUrl(`/rapport?p=${p}`)).toBeNull();
  });

  it("ignorerar okända extranycklar tyst", () => {
    const p = encodePayload({
      custodian: "avanza",
      funds: [{ isin: "SE0000813933", weight: 100 }],
      okäntFält: "ignoreras",
    });
    const parsed = parseUrl(`/rapport?p=${p}`);
    expect(parsed).not.toBeNull();
    expect(parsed?.custodian).toBe("avanza");
  });
});

// ── Custodian-värden ──────────────────────────────────────────────────────────

describe("custodian-värden", () => {
  it.each(["avanza", "nordnet", "övrigt"])("accepterar custodian '%s'", (custodian) => {
    const url = buildUrl(custodian, [{ isin: "SE0000813933", weight: "100" }]);
    expect(parseUrl(url)?.custodian).toBe(custodian);
  });
});

// ── Kundvylänk-parameter ──────────────────────────────────────────────────────

describe("kund=1 parameter", () => {
  it("kund-parametern syns i URL men påverkar inte p-payloaden", () => {
    const base = buildUrl("avanza", [{ isin: "SE0000813933", weight: "100" }]);
    const customerUrl = base + "&kund=1";
    const parsed = parseUrl(customerUrl);
    expect(parsed?.custodian).toBe("avanza");
    // kund-flaggan ska inte finnas i payload
    expect((parsed as Record<string, unknown>)?.kund).toBeUndefined();
  });
});
