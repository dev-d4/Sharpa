import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signerad, tidsbegränsad avregistreringstoken.
 *
 * Länken i notismejlet får inte innehålla ett oskyddat user-id — då kan vem som
 * helst som gissar ett UUID stänga av bevakningen för någon annan. Token är
 * i stället `<base64url(payload)>.<hmac>` där payload innehåller user-id,
 * scope och utgångstid, och HMAC:en beräknas med LINK_SECRET.
 *
 * Samma hemlighet som lib/link-signing.ts, men en egen kontext-sträng i
 * signaturen så att en token från det ena flödet aldrig kan återanvändas i det
 * andra.
 */

const CONTEXT = "unsubscribe-v1";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 dagar — mejl läses sent

export type UnsubscribeScope = "portfolio-alerts";

type Payload = {
  /** user id */
  u: string;
  /** scope */
  s: UnsubscribeScope;
  /** expires at, unix seconds */
  e: number;
};

function secret(): string {
  const s = process.env.LINK_SECRET;
  if (!s) throw new Error("LINK_SECRET är inte satt i miljövariablerna");
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(encodedPayload: string): string {
  return b64url(
    createHmac("sha256", secret()).update(`${CONTEXT}.${encodedPayload}`).digest()
  );
}

export function createUnsubscribeToken(
  userId: string,
  scope: UnsubscribeScope = "portfolio-alerts",
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): string {
  const payload: Payload = {
    u: userId,
    s: scope,
    e: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${encoded}.${sign(encoded)}`;
}

export type VerifiedUnsubscribe =
  | { ok: true; userId: string; scope: UnsubscribeScope }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" };

export function verifyUnsubscribeToken(token: string | null | undefined): VerifiedUnsubscribe {
  if (!token || typeof token !== "string") return { ok: false, reason: "malformed" };

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed" };
  const [encoded, providedSig] = parts;

  // Signaturen verifieras före payloaden parsas, så att manipulerad JSON aldrig
  // ens tolkas.
  let expected: string;
  try {
    expected = sign(encoded);
  } catch {
    return { ok: false, reason: "bad-signature" };
  }

  const a = Buffer.from(providedSig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad-signature" };
  }

  let payload: Payload;
  try {
    payload = JSON.parse(fromB64url(encoded).toString("utf8")) as Payload;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (typeof payload?.u !== "string" || !payload.u) return { ok: false, reason: "malformed" };
  if (payload.s !== "portfolio-alerts") return { ok: false, reason: "malformed" };
  if (typeof payload.e !== "number" || !Number.isFinite(payload.e)) {
    return { ok: false, reason: "malformed" };
  }
  if (Math.floor(Date.now() / 1000) > payload.e) return { ok: false, reason: "expired" };

  return { ok: true, userId: payload.u, scope: payload.s };
}
