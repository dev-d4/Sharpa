import { createHmac, timingSafeEqual } from "crypto";

const VALIDITY_SECONDS = 30 * 24 * 60 * 60; // 30 dagar

function secret(): string {
  const s = process.env.LINK_SECRET;
  if (!s) throw new Error("LINK_SECRET är inte satt i miljövariablerna");
  return s;
}

function digest(advisorId: string, portfolioId: string, ts: string): string {
  return createHmac("sha256", secret())
    .update(`${advisorId}:${portfolioId}:${ts}`)
    .digest("hex");
}

export function signLink(
  advisorId: string,
  portfolioId: string,
): { ts: string; sig: string } {
  const ts = String(Math.floor(Date.now() / 1000));
  return { ts, sig: digest(advisorId, portfolioId, ts) };
}

export function verifyLink(
  advisorId: string,
  portfolioId: string,
  ts: string,
  sig: string,
): boolean {
  const issued = parseInt(ts, 10);
  if (!Number.isFinite(issued)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (issued > now + 60) return false;               // framtida tidsstämpel
  if (now - issued > VALIDITY_SECONDS) return false; // utgången

  const expected = digest(advisorId, portfolioId, ts);
  try {
    const aBuf = Buffer.from(sig,      "hex");
    const bBuf = Buffer.from(expected, "hex");
    if (aBuf.length !== bBuf.length || aBuf.length === 0) return false;
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}
