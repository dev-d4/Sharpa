import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createUnsubscribeToken, verifyUnsubscribeToken } from "@/lib/unsubscribe-token";

const USER = "11111111-2222-3333-4444-555555555555";
const original = process.env.LINK_SECRET;

beforeEach(() => { process.env.LINK_SECRET = "test-secret-abc123"; });
afterEach(() => {
  vi.useRealTimers();
  if (original === undefined) delete process.env.LINK_SECRET;
  else process.env.LINK_SECRET = original;
});

function decodePayload(token: string): Record<string, unknown> {
  const raw = Buffer.from(token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/"), "base64");
  return JSON.parse(raw.toString("utf8"));
}

describe("avregistreringstoken", () => {
  it("går att verifiera direkt efter att den skapats", () => {
    const result = verifyUnsubscribeToken(createUnsubscribeToken(USER));
    expect(result).toEqual({ ok: true, userId: USER, scope: "portfolio-alerts" });
  });

  it("innehåller inget oskyddat user-id i klartext i URL:en", () => {
    const token = createUnsubscribeToken(USER);
    // Nyttolasten är base64-kodad, och signaturen gör den omöjlig att byta ut.
    expect(token).not.toContain(USER);
    expect(token.split(".")).toHaveLength(2);
  });

  it("avvisar en token där user-id bytts ut", () => {
    const token = createUnsubscribeToken(USER);
    const payload = decodePayload(token);
    payload.u = "99999999-9999-9999-9999-999999999999";
    const forged = Buffer.from(JSON.stringify(payload), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Både med den gamla signaturen och helt utan.
    expect(verifyUnsubscribeToken(`${forged}.${token.split(".")[1]}`)).toEqual({
      ok: false,
      reason: "bad-signature",
    });
    expect(verifyUnsubscribeToken(`${forged}.deadbeef`).ok).toBe(false);
  });

  it("avvisar en token där utgångstiden flyttats fram", () => {
    const token = createUnsubscribeToken(USER, "portfolio-alerts", 1);
    const payload = decodePayload(token);
    payload.e = Math.floor(Date.now() / 1000) + 999999;
    const forged = Buffer.from(JSON.stringify(payload), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    expect(verifyUnsubscribeToken(`${forged}.${token.split(".")[1]}`).ok).toBe(false);
  });

  it("avvisar en token signerad med en annan hemlighet", () => {
    const token = createUnsubscribeToken(USER);
    process.env.LINK_SECRET = "en-helt-annan-hemlighet";
    expect(verifyUnsubscribeToken(token)).toEqual({ ok: false, reason: "bad-signature" });
  });

  it("avvisar utgången token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00Z"));
    const token = createUnsubscribeToken(USER, "portfolio-alerts", 60);
    vi.setSystemTime(new Date("2026-08-01T00:02:00Z"));
    expect(verifyUnsubscribeToken(token)).toEqual({ ok: false, reason: "expired" });
  });

  it("avvisar skräpindata", () => {
    for (const bad of [null, undefined, "", "abc", "a.b.c", ".", "abc."]) {
      expect(verifyUnsubscribeToken(bad as string).ok).toBe(false);
    }
  });

  it("avvisar en token för fel scope", () => {
    const token = createUnsubscribeToken(USER, "portfolio-alerts");
    const payload = decodePayload(token);
    expect(payload.s).toBe("portfolio-alerts");
    // En token med annan scope-sträng kan inte signeras utan hemligheten, så
    // manipulation fångas av signaturkontrollen.
    payload.s = "something-else";
    const forged = Buffer.from(JSON.stringify(payload), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(verifyUnsubscribeToken(`${forged}.${token.split(".")[1]}`).ok).toBe(false);
  });
});
