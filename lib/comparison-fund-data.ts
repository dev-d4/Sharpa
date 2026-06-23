import type { HoldingItem } from "./morningstar-api";
import type { TWRData } from "./twr-mock-data";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FundRecord = {
  name: string;
  isin: string;
  category: "Aktiefond" | "Räntefond" | "Blandfond";
  management: "Index" | "Aktiv";
  ter: number; // TER in % per year
  returns: {
    m1: number; // 1-month return in %
    m3: number; // 3-month return in %
    m6: number; // 6-month return in %
    y1: number; // 1-year return in %
    y3: number; // 3-year cumulative return in %
    y5: number; // 5-year cumulative return in %
  };
  volatility_y1: number; // 1-year annualized volatility in %
  sharpe_y1: number;
  sharpe_y3: number;
};

export type ExistingFund = {
  fundName: string;
  weight: number; // 0–100
};

export type PortfolioMetrics = {
  ter: number;
  custodyFee: number;
  totalFee: number;
  returns: {
    m1: number | null;
    m3: number | null;
    m6: number | null;
    y1: number | null;
    y3: number | null;
    y5: number | null;
  };
  volatility_y1: number | null;
  sharpe_y1: number | null;
  sharpe_y3: number | null;
};

// ── Mock fund database ────────────────────────────────────────────────────────

export const MOCK_FUNDS: FundRecord[] = [
  // ── Robur (Swedbank) ──────────────────────────────────────────────────────
  {
    name: "Robur Globalfond MEGA",
    isin: "SE0000850508",
    category: "Aktiefond",
    management: "Aktiv",
    ter: 1.45,
    returns: { m1: 1.1, m3: 3.2, m6: 5.8, y1: 9.8, y3: 27.4, y5: 61.2 },
    volatility_y1: 12.8,
    sharpe_y1: 0.58,
    sharpe_y3: 0.52,
  },
  {
    name: "Robur Europafond MEGA",
    isin: "SE0000850474",
    category: "Aktiefond",
    management: "Aktiv",
    ter: 1.40,
    returns: { m1: 2.1, m3: 5.8, m6: 9.2, y1: 11.4, y3: 29.8, y5: 54.6 },
    volatility_y1: 13.5,
    sharpe_y1: 0.66,
    sharpe_y3: 0.56,
  },
  {
    name: "Robur Sverige MEGA",
    isin: "SE0000812647",
    category: "Aktiefond",
    management: "Aktiv",
    ter: 1.30,
    returns: { m1: 0.7, m3: 1.9, m6: 3.8, y1: 7.2, y3: 22.4, y5: 48.8 },
    volatility_y1: 13.1,
    sharpe_y1: 0.36,
    sharpe_y3: 0.32,
  },
  {
    name: "Robur Räntefond MEGA",
    isin: "SE0001166562",
    category: "Räntefond",
    management: "Aktiv",
    ter: 0.60,
    returns: { m1: 0.3, m3: 0.8, m6: 1.6, y1: 3.2, y3: 7.8, y5: 12.4 },
    volatility_y1: 2.8,
    sharpe_y1: 0.25,
    sharpe_y3: 0.18,
  },
  // ── SEB ───────────────────────────────────────────────────────────────────
  {
    name: "SEB Global Indexfond",
    isin: "SE0002388904",
    category: "Aktiefond",
    management: "Index",
    ter: 0.35,
    returns: { m1: 1.6, m3: 4.3, m6: 7.8, y1: 13.8, y3: 36.2, y5: 79.8 },
    volatility_y1: 13.9,
    sharpe_y1: 0.81,
    sharpe_y3: 0.68,
  },
  {
    name: "SEB Sverige Expandfond",
    isin: "SE0000432563",
    category: "Aktiefond",
    management: "Aktiv",
    ter: 1.30,
    returns: { m1: 0.9, m3: 2.4, m6: 4.8, y1: 8.2, y3: 24.1, y5: 52.8 },
    volatility_y1: 11.4,
    sharpe_y1: 0.49,
    sharpe_y3: 0.44,
  },
  {
    name: "SEB Obligationsfond SEK",
    isin: "SE0000432589",
    category: "Räntefond",
    management: "Aktiv",
    ter: 0.55,
    returns: { m1: 0.4, m3: 1.1, m6: 2.1, y1: 4.1, y3: 9.8, y5: 15.2 },
    volatility_y1: 3.2,
    sharpe_y1: 0.51,
    sharpe_y3: 0.42,
  },
  // ── Nordea ────────────────────────────────────────────────────────────────
  {
    name: "Nordea Global Aktiv",
    isin: "SE0004793647",
    category: "Aktiefond",
    management: "Aktiv",
    ter: 1.50,
    returns: { m1: 0.8, m3: 2.1, m6: 4.2, y1: 7.8, y3: 22.4, y5: 48.6 },
    volatility_y1: 12.1,
    sharpe_y1: 0.44,
    sharpe_y3: 0.38,
  },
  {
    name: "Nordea Räntefond Kort",
    isin: "SE0001162017",
    category: "Räntefond",
    management: "Aktiv",
    ter: 0.45,
    returns: { m1: 0.3, m3: 0.9, m6: 1.8, y1: 3.6, y3: 8.4, y5: 13.8 },
    volatility_y1: 2.4,
    sharpe_y1: 0.46,
    sharpe_y3: 0.38,
  },
  // ── Handelsbanken ─────────────────────────────────────────────────────────
  {
    name: "Handelsbanken Global Index Criteria",
    isin: "SE0000433925",
    category: "Aktiefond",
    management: "Index",
    ter: 0.40,
    returns: { m1: 1.4, m3: 3.8, m6: 7.1, y1: 12.4, y3: 33.8, y5: 75.2 },
    volatility_y1: 13.4,
    sharpe_y1: 0.74,
    sharpe_y3: 0.62,
  },
  {
    name: "Handelsbanken Aktiv 50",
    isin: "SE0005190624",
    category: "Blandfond",
    management: "Aktiv",
    ter: 1.20,
    returns: { m1: 0.9, m3: 2.6, m6: 4.8, y1: 8.4, y3: 22.8, y5: 46.4 },
    volatility_y1: 8.2,
    sharpe_y1: 0.72,
    sharpe_y3: 0.64,
  },
  // ── SPP ───────────────────────────────────────────────────────────────────
  {
    name: "SPP Global Topp 100",
    isin: "SE0003949751",
    category: "Aktiefond",
    management: "Index",
    ter: 0.25,
    returns: { m1: 2.1, m3: 5.8, m6: 10.2, y1: 18.4, y3: 48.2, y5: 104.8 },
    volatility_y1: 16.2,
    sharpe_y1: 0.98,
    sharpe_y3: 0.82,
  },
  {
    name: "SPP Obligationsfond",
    isin: "SE0000671544",
    category: "Räntefond",
    management: "Aktiv",
    ter: 0.50,
    returns: { m1: 0.5, m3: 1.4, m6: 2.8, y1: 5.2, y3: 11.8, y5: 18.4 },
    volatility_y1: 4.2,
    sharpe_y1: 0.64,
    sharpe_y3: 0.54,
  },
  // ── AMF ───────────────────────────────────────────────────────────────────
  {
    name: "AMF Aktiefond Global",
    isin: "SE0001512271",
    category: "Aktiefond",
    management: "Aktiv",
    ter: 0.40,
    returns: { m1: 1.4, m3: 3.9, m6: 7.2, y1: 12.8, y3: 34.2, y5: 76.4 },
    volatility_y1: 13.6,
    sharpe_y1: 0.76,
    sharpe_y3: 0.63,
  },
  {
    name: "AMF Aktiefond Sverige",
    isin: "SE0001512263",
    category: "Aktiefond",
    management: "Aktiv",
    ter: 0.30,
    returns: { m1: 0.8, m3: 2.4, m6: 4.8, y1: 9.2, y3: 26.8, y5: 58.4 },
    volatility_y1: 12.4,
    sharpe_y1: 0.54,
    sharpe_y3: 0.48,
  },
  {
    name: "AMF Räntefond Mix",
    isin: "SE0001512255",
    category: "Räntefond",
    management: "Aktiv",
    ter: 0.25,
    returns: { m1: 0.4, m3: 1.2, m6: 2.4, y1: 4.8, y3: 11.2, y5: 17.8 },
    volatility_y1: 3.8,
    sharpe_y1: 0.60,
    sharpe_y3: 0.52,
  },
  // ── Länsförsäkringar ──────────────────────────────────────────────────────
  {
    name: "Länsförsäkringar Global Index",
    isin: "SE0005188836",
    category: "Aktiefond",
    management: "Index",
    ter: 0.20,
    returns: { m1: 1.5, m3: 4.1, m6: 7.4, y1: 13.2, y3: 35.1, y5: 78.4 },
    volatility_y1: 13.8,
    sharpe_y1: 0.77,
    sharpe_y3: 0.65,
  },
  {
    name: "Länsförsäkringar Tillväxtmarknad Index",
    isin: "SE0009922556",
    category: "Aktiefond",
    management: "Index",
    ter: 0.35,
    returns: { m1: 1.2, m3: 3.1, m6: 5.4, y1: 8.8, y3: 24.4, y5: 51.2 },
    volatility_y1: 14.8,
    sharpe_y1: 0.43,
    sharpe_y3: 0.38,
  },
  {
    name: "Länsförsäkringar Obligation",
    isin: "SE0002186702",
    category: "Räntefond",
    management: "Aktiv",
    ter: 0.40,
    returns: { m1: 0.5, m3: 1.5, m6: 3.0, y1: 5.8, y3: 13.2, y5: 20.8 },
    volatility_y1: 4.8,
    sharpe_y1: 0.69,
    sharpe_y3: 0.58,
  },
  // ── Didner & Gerge ────────────────────────────────────────────────────────
  {
    name: "Didner & Gerge Aktiefond",
    isin: "SE0002242736",
    category: "Aktiefond",
    management: "Aktiv",
    ter: 1.42,
    returns: { m1: 0.7, m3: 2.8, m6: 5.2, y1: 9.4, y3: 28.8, y5: 64.2 },
    volatility_y1: 13.2,
    sharpe_y1: 0.52,
    sharpe_y3: 0.56,
  },
  {
    name: "Didner & Gerge Ränta",
    isin: "SE0007534169",
    category: "Räntefond",
    management: "Aktiv",
    ter: 0.50,
    returns: { m1: 0.4, m3: 1.3, m6: 2.6, y1: 5.1, y3: 12.1, y5: 19.4 },
    volatility_y1: 4.1,
    sharpe_y1: 0.63,
    sharpe_y3: 0.54,
  },
  // ── Carnegie ──────────────────────────────────────────────────────────────
  {
    name: "Carnegie Total",
    isin: "SE0003429867",
    category: "Blandfond",
    management: "Aktiv",
    ter: 1.35,
    returns: { m1: 0.8, m3: 2.2, m6: 4.4, y1: 8.1, y3: 23.2, y5: 48.8 },
    volatility_y1: 8.8,
    sharpe_y1: 0.64,
    sharpe_y3: 0.58,
  },
  // ── Avanza ────────────────────────────────────────────────────────────────
  {
    name: "Avanza Zero",
    isin: "SE0000738836",
    category: "Aktiefond",
    management: "Index",
    ter: 0.00,
    returns: { m1: 1.8, m3: 4.9, m6: 8.2, y1: 14.8, y3: 38.2, y5: 82.1 },
    volatility_y1: 14.2,
    sharpe_y1: 0.87,
    sharpe_y3: 0.73,
  },
  // ── Övrigt / Fristående ───────────────────────────────────────────────────
  {
    name: "Penser Global",
    isin: "SE0006758823",
    category: "Aktiefond",
    management: "Aktiv",
    ter: 1.50,
    returns: { m1: 1.0, m3: 2.8, m6: 5.4, y1: 9.8, y3: 27.2, y5: 58.4 },
    volatility_y1: 12.8,
    sharpe_y1: 0.57,
    sharpe_y3: 0.50,
  },
  {
    name: "Aktiv Portfölj Global",
    isin: "SE0014731834",
    category: "Blandfond",
    management: "Aktiv",
    ter: 1.25,
    returns: { m1: 0.9, m3: 2.6, m6: 5.0, y1: 9.2, y3: 25.8, y5: 54.4 },
    volatility_y1: 9.2,
    sharpe_y1: 0.72,
    sharpe_y3: 0.62,
  },
  {
    name: "Aktiv Portfölj Obligationer",
    isin: "SE0014731842",
    category: "Räntefond",
    management: "Aktiv",
    ter: 0.80,
    returns: { m1: 0.4, m3: 1.2, m6: 2.5, y1: 4.8, y3: 11.4, y5: 18.2 },
    volatility_y1: 3.9,
    sharpe_y1: 0.59,
    sharpe_y3: 0.50,
  },
  {
    name: "Aktiv Portfölj Sverige",
    isin: "SE0014731850",
    category: "Aktiefond",
    management: "Aktiv",
    ter: 1.40,
    returns: { m1: 0.6, m3: 1.8, m6: 3.5, y1: 7.0, y3: 20.8, y5: 44.2 },
    volatility_y1: 12.9,
    sharpe_y1: 0.35,
    sharpe_y3: 0.30,
  },
];

// ── Computation ───────────────────────────────────────────────────────────────

const RISK_FREE_RATE = 2.5; // % – approximation of Swedish short-term rate

export function computeExistingMetrics(
  funds: ExistingFund[],
  custodyFee: number,
): PortfolioMetrics | null {
  const valid = funds.filter(f => f.fundName && f.weight > 0);
  if (valid.length === 0) return null;

  const totalWeight = valid.reduce((s, f) => s + f.weight, 0);
  if (totalWeight === 0) return null;

  let ter = 0, m1 = 0, m3 = 0, m6 = 0, y1 = 0, y3 = 0, y5 = 0;
  let vol = 0, sh1 = 0, sh3 = 0;

  for (const f of valid) {
    const w = f.weight / totalWeight;
    const r = MOCK_FUNDS.find(d => d.name === f.fundName);
    if (!r) continue;
    ter += w * r.ter;
    m1  += w * r.returns.m1;
    m3  += w * r.returns.m3;
    m6  += w * r.returns.m6;
    y1  += w * r.returns.y1;
    y3  += w * r.returns.y3;
    y5  += w * r.returns.y5;
    vol += w * r.volatility_y1;
    sh1 += w * r.sharpe_y1;
    sh3 += w * r.sharpe_y3;
  }

  return {
    ter,
    custodyFee,
    totalFee: ter + custodyFee,
    returns: { m1, m3, m6, y1, y3, y5 },
    volatility_y1: vol,
    sharpe_y1: sh1,
    sharpe_y3: sh3,
  };
}

export function computeTargetMetrics(
  twrData: TWRData | null,
  holdings: HoldingItem[],
  managedFee: number | null,
): PortfolioMetrics {
  // Weighted avg TER from holdings
  let ter = 0;
  let totalW = 0;
  for (const h of holdings) {
    if (h.fee != null && h.weight > 0) {
      ter    += h.weight * h.fee;
      totalW += h.weight;
    }
  }
  ter = totalW > 0 ? ter / totalW : 0;

  const custodyFee = managedFee ?? 0;

  if (!twrData || twrData.timeSeries.length === 0) {
    return {
      ter,
      custodyFee,
      totalFee: ter + custodyFee,
      returns: { m1: null, m3: null, m6: null, y1: null, y3: null, y5: null },
      volatility_y1: null,
      sharpe_y1: null,
      sharpe_y3: null,
    };
  }

  const ts = twrData.timeSeries;

  // Compound cumulative return over last N trading days (as percentage)
  function cumRet(nDays: number): number | null {
    const slice = ts.slice(-nDays);
    if (slice.length < Math.floor(nDays * 0.7)) return null; // need at least 70% of period
    let cum = 1;
    for (const p of slice) cum *= 1 + p.twr;
    return (cum - 1) * 100;
  }

  const returns = {
    m1: cumRet(21),
    m3: cumRet(63),
    m6: cumRet(126),
    y1: cumRet(252),
    y3: cumRet(756),
    y5: null, // not enough historical data
  };

  // Annualised volatility from daily returns
  const dailyR = ts.map(p => p.twr);
  const mean   = dailyR.reduce((s, r) => s + r, 0) / dailyR.length;
  const variance = dailyR.reduce((s, r) => s + (r - mean) ** 2, 0) / dailyR.length;
  const volatility_y1 = Math.sqrt(variance * 252) * 100;

  // Sharpe ratios
  const ann1y = returns.y1 ?? ((cumRet(ts.length) ?? 0) * (252 / ts.length));
  const sharpe_y1 = volatility_y1 > 0 ? (ann1y - RISK_FREE_RATE) / volatility_y1 : null;

  const ann3y = returns.y3;
  const sharpe_y3 = ann3y != null && volatility_y1 > 0
    ? (ann3y / 3 - RISK_FREE_RATE) / volatility_y1
    : null;

  return {
    ter,
    custodyFee,
    totalFee: ter + custodyFee,
    returns,
    volatility_y1,
    sharpe_y1,
    sharpe_y3,
  };
}
