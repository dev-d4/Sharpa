import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SelectionId =
  | "global" | "sweden" | "usa" | "europe" | "nordic" | "emerging" | "asia"
  | "japan" | "china" | "india" | "latam"
  | "tech" | "health" | "real-estate" | "energy" | "finance" | "consumer" | "industry"
  | "growth" | "value" | "smallcap";

type Answers = {
  platform:      "avanza" | "nordnet" | "both";
  goal:          "pension" | "wealth" | "specific" | "preserve";
  horizon:       "short" | "medium" | "long" | "verylong";
  reaction:      "sell" | "wait" | "buy";
  selections:    SelectionId[];
  priorities:    Record<string, number> | null;
  management:    "passive" | "mixed" | "active";
  equityOverride: number | null;
};

type FundRow = {
  isin:                   string;
  name:                   string;
  category:               string | null;
  category_group:         string | null;
  equity_style_box:       string | null;
  sharpe_3yr:             number | null;
  return_1yr:             number | null;
  return_3yr:             number | null;
  ongoing_cost_actual:    number | null;
  ongoing_cost_estimated: number | null;
  investment_type:        string | null;
};

// ── Risk scoring ──────────────────────────────────────────────────────────────

const RISK_LABELS: Record<number, string> = {
  1: "Försiktig", 2: "Defensiv", 3: "Balanserad", 4: "Tillväxt", 5: "Offensiv",
};

const EQUITY_PCT: Record<number, number> = {
  1: 20, 2: 40, 3: 60, 4: 80, 5: 100,
};

function computeRiskScore(a: Answers): number {
  let score = 3;
  if (a.horizon === "short")         score -= 1;
  else if (a.horizon === "long")     score += 1;
  else if (a.horizon === "verylong") score += 2;
  if (a.reaction === "sell")         score -= 1;
  else if (a.reaction === "buy")     score += 1;
  if (a.goal === "preserve")         score -= 2;
  else if (a.goal === "specific")    score -= 1;
  else if (a.goal === "pension")     score += 1;
  return Math.max(1, Math.min(5, score));
}

// ── Selection → fund category mapping ────────────────────────────────────────

const SELECTION_FILTER: Record<SelectionId, (f: FundRow) => boolean> = {
  global:        (f) => !!(f.category?.startsWith("Global")),
  sweden:        (f) => !!(f.category?.startsWith("Sverige")),
  usa:           (f) => !!(f.category?.startsWith("USA")),
  europe:        (f) => !!(f.category?.startsWith("Europa")),
  nordic:        (f) => !!(f.category?.startsWith("Norden")),
  emerging:      (f) => !!(f.category?.startsWith("Tillväxtmarknader") || f.category?.startsWith("Emerging")),
  asia:          (f) => !!(f.category?.startsWith("Asien") || f.category?.startsWith("Japan") || f.category?.startsWith("Kina") || f.category?.startsWith("Indien")),
  tech:          (f) => { const c = f.category?.toLowerCase() ?? ""; return c.includes("teknik") || c.includes("tech") || c.includes("teknologi"); },
  health:        (f) => { const c = f.category?.toLowerCase() ?? ""; return c.includes("hälsa") || c.includes("bioteknik") || c.includes("läkemedel") || c.includes("medicin") || c.includes("biotech"); },
  "real-estate": (f) => !!(f.category?.toLowerCase().includes("fastighet")),
  energy:        (f) => { const c = f.category?.toLowerCase() ?? ""; return c.includes("energi") || c.includes("råvaror"); },
  finance:       (f) => { const c = f.category?.toLowerCase() ?? ""; return c.includes("finans") || c.includes("bank"); },
  consumer:      (f) => { const c = f.category?.toLowerCase() ?? ""; return c.includes("konsument") || c.includes("dagligvaror") || c.includes("sällanköp"); },
  industry:      (f) => !!(f.category?.toLowerCase().includes("industri")),
  japan:         (f) => !!(f.category?.toLowerCase().includes("japan")),
  china:         (f) => { const c = f.category?.toLowerCase() ?? ""; return c.includes("kina") || c.includes("china") || c.includes("greater china"); },
  india:         (f) => { const c = f.category?.toLowerCase() ?? ""; return c.includes("indien") || c.includes("india"); },
  latam:         (f) => { const c = f.category?.toLowerCase() ?? ""; return c.includes("latin") || c.includes("latinamerika"); },
  growth:        (f) => !!(f.equity_style_box?.toLowerCase().includes("growth")),
  value:         (f) => !!(f.equity_style_box?.toLowerCase().includes("value")),
  smallcap:      (f) => !!(f.equity_style_box?.toLowerCase().includes("small")),
};

const SELECTION_RATIONALE: Record<SelectionId, string> = {
  global:        "Global aktieexponering",
  sweden:        "Exponering mot svenska marknaden",
  usa:           "Exponering mot den amerikanska marknaden",
  europe:        "Europeisk aktieexponering",
  nordic:        "Nordisk aktieexponering",
  emerging:      "Exponering mot tillväxtmarknader",
  asia:          "Asiatisk aktieexponering",
  tech:          "Teknik- och IT-sektor",
  health:        "Hälsovård och läkemedel",
  "real-estate": "Fastighetssektor",
  energy:        "Energi och råvaror",
  finance:       "Finans- och banksektorn",
  consumer:      "Konsumentvaror och detaljhandel",
  industry:      "Industri och tillverkning",
  japan:         "Japansk aktieexponering",
  china:         "Kinesisk aktieexponering",
  india:         "Indisk aktieexponering",
  latam:         "Latinamerikansk aktieexponering",
  growth:        "Tillväxtbolag",
  value:         "Värdeaktier",
  smallcap:      "Småbolag",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isPassive(f: FundRow): boolean {
  if (f.investment_type === "INDEX") return true;
  const n = f.name?.toLowerCase() ?? "";
  return n.includes("index") || n.includes("msci") || n.includes("s&p") || n.includes("etf");
}

function applyMgmt(funds: FundRow[], mgmt: string): FundRow[] {
  if (mgmt === "passive") return funds.filter(isPassive);
  if (mgmt === "active")  return funds.filter((f) => !isPassive(f));
  return funds;
}

function scoreF(f: FundRow): number {
  return (f.sharpe_3yr ?? 0) * 3
    + (f.return_3yr ?? 0) * 0.05
    + (f.return_1yr ?? 0) * 0.02
    - (f.ongoing_cost_actual ?? f.ongoing_cost_estimated ?? 0) * 1.5;
}

function pickBest(pool: FundRow[], exclude: string[] = []): FundRow | null {
  const eligible = pool.filter((f) => !exclude.includes(f.isin));
  if (!eligible.length) return null;
  return eligible.sort((a, b) => scoreF(b) - scoreF(a))[0];
}

function distributeWeights(total: number, count: number): number[] {
  if (count === 0) return [];
  const base      = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

function distributeByPriority(total: number, selections: SelectionId[], priorities: Record<string, number>): number[] {
  if (selections.length === 0) return [];
  const invPrios   = selections.map((id) => 1 / (priorities[id] ?? 1));
  const totalInv   = invPrios.reduce((s, v) => s + v, 0);
  const rawWeights = invPrios.map((inv) => (inv / totalInv) * total);
  const floored    = rawWeights.map((w) => Math.floor(w));
  const remainder  = total - floored.reduce((s, v) => s + v, 0);
  rawWeights
    .map((w, i) => ({ i, frac: w - floored[i] }))
    .sort((a, b) => b.frac - a.frac)
    .slice(0, remainder)
    .forEach(({ i }) => floored[i]++);
  return floored;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function fetchAllFunds(supabase: ReturnType<typeof createClient>, view: string, group: string | string[]): Promise<FundRow[]> {
  const PAGE = 1000;
  const cols = "isin, name, category, category_group, equity_style_box, sharpe_3yr, return_1yr, return_3yr, ongoing_cost_actual, ongoing_cost_estimated, investment_type";
  const all: FundRow[] = [];

  let base = supabase.from(view).select(cols).not("name", "is", null);
  base = Array.isArray(group)
    ? base.in("category_group", group)
    : base.eq("category_group", group);
  const ordered = base.order("isin");

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await ordered.range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as FundRow[]));
    if (data.length < PAGE) break;
  }
  return all;
}

// ── Reasoning builder ─────────────────────────────────────────────────────────

type Slot = { name: string; weight: number; sharpe_3yr: number | null; ongoing_cost: number | null; rationale: string };

function buildReasoning(
  a: Answers,
  riskScore: number,
  riskLabel: string,
  equityPct: number,
  bondPct: number,
  portfolio: Slot[]
): string[] {
  const lines: string[] = [];

  // 1. Risk derivation or manual override
  if (a.equityOverride != null) {
    const computed = EQUITY_PCT[riskScore];
    lines.push(
      `Du valde fördelningen manuellt till ${equityPct}% aktier och ${bondPct}% räntor.` +
      (equityPct !== computed
        ? ` Quizet beräknade ursprungligen ${computed}% aktier baserat på dina quizsvar.`
        : "")
    );
  } else {
    const horizonMap: Record<string, string> = {
      short:    "kort sparhorisont (under 3 år) drar ner risken",
      medium:   "mellanlång sparhorisont (3–7 år) ger neutral riskbedömning",
      long:     "lång sparhorisont (7–15 år) ökar risktolerans",
      verylong: "mycket lång sparhorisont (över 15 år) ger hög risktolerans",
    };
    const reactionMap: Record<string, string> = {
      sell: "du säljer vid nedgång — sänker risknivån",
      wait: "du avvaktar vid nedgång — neutral riskbedömning",
      buy:  "du köper mer vid nedgång — höjer risknivån",
    };
    const goalMap: Record<string, string> = {
      preserve: "kapitalbevaringsmål drar kraftigt ner risken",
      specific: "specifikt sparmål (t.ex. bostad) drar ner risken",
      wealth:   "förmögenhetsbyggande ger neutral riskbedömning",
      pension:  "pensionssparande höjer risktolerans",
    };
    lines.push(`Din risknivå är ${riskScore} av 5 (${riskLabel}), beräknad utifrån tre faktorer: ${horizonMap[a.horizon]}, ${reactionMap[a.reaction]}, och ${goalMap[a.goal]}.`);
  }

  // 2. Asset allocation context
  if (bondPct > 0) {
    lines.push(`Fördelningen ${equityPct}% aktier / ${bondPct}% räntor: räntedelen minskar portföljens svängningar och fungerar som stötdämpare vid börsnedgångar.`);
  } else {
    lines.push(`Hela portföljen investeras i aktier (${equityPct}%) för maximal tillväxtpotential — utan räntebuffert svänger portföljen mer vid marknadsrörelser.`);
  }

  // 3. Management style
  const mgmtExplain = a.management === "passive"
    ? "Enbart indexfonder valdes — dessa följer marknadsindex till lägsta möjliga avgift och slår historiskt de flesta aktivt förvaltade fonder över lång tid."
    : a.management === "active"
      ? "Enbart aktivt förvaltade fonder valdes — dessa har förvaltare som aktivt väljer aktier med målet att slå sitt jämförelseindex."
      : "En mix av index- och aktivt förvaltade fonder valdes för att kombinera låga avgifter med möjligheten till överavkastning.";
  lines.push(mgmtExplain);

  lines.push("Fonderna valdes baserat på riskjusterad avkastning (Sharpe-kvot, väger tyngst), historisk avkastning samt lägsta möjliga avgift.");

  // 4. Cost summary
  const withCost = portfolio.filter((f) => f.ongoing_cost !== null);
  if (withCost.length > 0) {
    const totalWeight  = withCost.reduce((s, f) => s + f.weight, 0);
    const weightedCost = withCost.reduce((s, f) => s + (f.ongoing_cost ?? 0) * f.weight, 0);
    const avgCost      = totalWeight > 0 ? weightedCost / totalWeight : 0;
    const sorted       = [...withCost].sort((a, b) => (b.ongoing_cost ?? 0) - (a.ongoing_cost ?? 0));
    const expensive    = sorted.filter((f) => (f.ongoing_cost ?? 0) > avgCost * 1.5 && (f.ongoing_cost ?? 0) > 0.2);
    let costLine = `Viktad genomsnittsavgift: ${avgCost.toFixed(2)}%/år.`;
    if (expensive.length > 0) {
      costLine += ` De dyraste fonderna är ${expensive.map((f) => `${f.name} (${f.ongoing_cost!.toFixed(2)}%/år)`).join(" och ")} — se över dessa i Analysera om du vill optimera avgifterna.`;
    } else {
      costLine += " Avgifterna är generellt låga i portföljen.";
    }
    lines.push(costLine);
  }

  return lines;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const answers: Answers = await req.json();
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "DB ej tillgänglig" }, { status: 500 });

    const view =
      answers.platform === "avanza"  ? "avanza_fund_data"  :
      answers.platform === "nordnet" ? "nordnet_fund_data" :
      "funds";

    const [equityFunds, fixedFunds] = await Promise.all([
      fetchAllFunds(supabase, view, "Equity"),
      fetchAllFunds(supabase, view, ["Fixed Income", "Money Market"]),
    ]);

    const riskScore  = computeRiskScore(answers);
    const equityPct  = answers.equityOverride ?? EQUITY_PCT[riskScore];
    const bondPct    = 100 - equityPct;
    const selections = answers.selections?.length ? answers.selections : ["global" as SelectionId];

    const prios         = answers.priorities ?? {};
    const equityWeights = Object.keys(prios).length > 0
      ? distributeByPriority(equityPct, selections, prios)
      : distributeWeights(equityPct, selections.length);

    type PortfolioSlot = { isin: string; name: string; weight: number; category: string; rationale: string; ongoing_cost: number | null; sharpe_3yr: number | null };
    const portfolio: PortfolioSlot[] = [];
    const usedIsins: string[] = [];

    for (let i = 0; i < selections.length; i++) {
      const selId  = selections[i];
      const weight = equityWeights[i];
      if (weight <= 0) continue;

      const pool = applyMgmt(equityFunds.filter(SELECTION_FILTER[selId]), answers.management);
      const best = pickBest(pool, usedIsins);

      if (best) {
        portfolio.push({
          isin:         best.isin,
          name:         best.name,
          weight,
          category:     best.category ?? "",
          rationale:    SELECTION_RATIONALE[selId],
          ongoing_cost: best.ongoing_cost_actual ?? best.ongoing_cost_estimated ?? null,
          sharpe_3yr:   best.sharpe_3yr,
        });
        usedIsins.push(best.isin);
      } else if (portfolio.length > 0) {
        portfolio[0].weight += weight;
      }
    }

    if (bondPct > 0) {
      const best = pickBest(fixedFunds, usedIsins);
      if (best) {
        portfolio.push({
          isin:         best.isin,
          name:         best.name,
          weight:       bondPct,
          category:     best.category ?? "Räntefond",
          rationale:    bondPct <= 20 ? "Stabiliserar portföljen" : "Lägre risk och volatilitet",
          ongoing_cost: best.ongoing_cost_actual ?? best.ongoing_cost_estimated ?? null,
          sharpe_3yr:   best.sharpe_3yr,
        });
      } else if (portfolio.length > 0) {
        portfolio[0].weight += bondPct;
      }
    }

    // Normalise weights to 100
    const total = portfolio.reduce((s, f) => s + f.weight, 0);
    if (total !== 100 && portfolio.length > 0) portfolio[0].weight += 100 - total;

    const computedLabel = RISK_LABELS[riskScore];
    const riskLabel = answers.equityOverride != null
      ? (equityPct <= 20 ? "Försiktig" : equityPct <= 40 ? "Defensiv" : equityPct <= 60 ? "Balanserad" : equityPct <= 80 ? "Tillväxt" : "Offensiv")
      : computedLabel;
    const mgmtLabel = answers.management === "passive" ? "indexfonder" : answers.management === "active" ? "aktivt förvaltade fonder" : "en mix av index och aktiva fonder";
    const selCount  = selections.length;
    const summary   = `En ${riskLabel.toLowerCase()} portfölj med ${equityPct}% aktier${bondPct > 0 ? ` och ${bondPct}% räntor` : ""}, byggd med ${mgmtLabel} fördelat över ${selCount} område${selCount > 1 ? "n" : ""}.`;

    const reasoning = buildReasoning(answers, riskScore, riskLabel, equityPct, bondPct, portfolio);

    return NextResponse.json({ portfolio, riskScore, riskLabel, equityPct, summary, reasoning });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
