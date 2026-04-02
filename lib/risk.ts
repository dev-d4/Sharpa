export type RiskLevel = 1 | 2 | 3 | 4 | 5;

export const RISK_LABELS: Record<RiskLevel, string> = {
  1: "Försiktig",
  2: "Defensiv",
  3: "Balanserad",
  4: "Tillväxt",
  5: "Offensiv",
};

export const RISK_EQUITY: Record<RiskLevel, string> = {
  1: "~20% aktier",
  2: "~40% aktier",
  3: "~60% aktier",
  4: "~80% aktier",
  5: "~100% aktier",
};

export function calcRiskScore(q1: number, q2: number, q3: number, q4: number): RiskLevel {
  return Math.round((q1 + q2 + q3 + q4) / 4) as RiskLevel;
}

export function portfolioRiskLevel(categoryBreakdown: { label: string; weight: number }[]): RiskLevel {
  const equity = categoryBreakdown.find((c) => c.label === "Aktiefonder")?.weight ?? 0;
  const mixed = categoryBreakdown.find((c) => c.label === "Blandfonder")?.weight ?? 0;
  const equityPct = equity + mixed * 0.5;
  if (equityPct < 20) return 1;
  if (equityPct < 40) return 2;
  if (equityPct < 65) return 3;
  if (equityPct < 85) return 4;
  return 5;
}

export function riskMatch(portfolioLevel: RiskLevel, userLevel: RiskLevel): { label: string; color: "green" | "yellow" | "red" } {
  const diff = portfolioLevel - userLevel;
  if (diff === 0) return { label: "I linje med din profil", color: "green" };
  if (diff === 1) return { label: "Lite mer offensiv än din profil", color: "yellow" };
  if (diff === -1) return { label: "Lite mer defensiv än din profil", color: "yellow" };
  if (diff > 1) return { label: "Mer offensiv än din profil", color: "red" };
  return { label: "Mer defensiv än din profil", color: "red" };
}
