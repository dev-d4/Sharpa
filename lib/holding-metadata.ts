export type HoldingMeta = {
  fund_type:  "Räntefond" | "Aktiefond" | "Blandfond" | "Kassa";
  management: "Index" | "Aktiv" | "-";
  fee:        number; // annual % e.g. 0.15
};

const META: Record<string, HoldingMeta> = {
  SE0011414606: { fund_type: "Räntefond", management: "Aktiv",  fee: 0.15 },
  SE0002152140: { fund_type: "Räntefond", management: "Aktiv",  fee: 0.10 },
  SE0001338674: { fund_type: "Räntefond", management: "Aktiv",  fee: 0.50 },
  SE0013877263: { fund_type: "Räntefond", management: "Aktiv",  fee: 0.65 },
  SE0005188836: { fund_type: "Aktiefond", management: "Index",  fee: 0.20 },
  LU1133292463: { fund_type: "Aktiefond", management: "Aktiv",  fee: 1.40 },
  SE0002593673: { fund_type: "Aktiefond", management: "Index",  fee: 0.25 },
  SE0013109519: { fund_type: "Aktiefond", management: "Aktiv",  fee: 0.40 },
  SE0008613939: { fund_type: "Aktiefond", management: "Aktiv",  fee: 0.20 },
  SE0004392025: { fund_type: "Aktiefond", management: "Aktiv",  fee: 1.50 },
  FI4000598966: { fund_type: "Räntefond", management: "Aktiv",  fee: 0.75 },
  SE0000429789: { fund_type: "Aktiefond", management: "Aktiv",  fee: 1.40 },
  SE0001838004: { fund_type: "Aktiefond", management: "Aktiv",  fee: 1.40 },
  SEK_CASH:     { fund_type: "Kassa",     management: "-",      fee: 0.00 },
};

export function getHoldingMeta(isin: string, name?: string): HoldingMeta | null {
  if (META[isin]) return META[isin];
  if (name === "SEK_CASH" || name?.endsWith("_CASH")) return META["SEK_CASH"];
  return null;
}
