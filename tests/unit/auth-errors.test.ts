import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/lib/auth-errors";

describe("authErrorMessage", () => {
  it("förklarar sändningsgränsen på svenska", () => {
    const message = authErrorMessage({ message: "email rate limit exceeded", status: 429 });
    expect(message).toContain("för många mejl");
    expect(message).not.toMatch(/rate limit/i);
  });

  it("känner igen gränsen även via felkoden", () => {
    expect(authErrorMessage({ code: "over_email_send_rate_limit" })).toContain("för många mejl");
  });

  it("säger exakt hur länge man ska vänta när Supabase anger det", () => {
    const message = authErrorMessage({
      code: "over_email_send_rate_limit",
      status: 429,
      message: "For security purposes, you can only request this after 47 seconds.",
    });
    expect(message).toContain("47 sekunder");
  });

  it("pekar ut felstavad adress", () => {
    expect(authErrorMessage({ message: "Unable to validate email address: invalid format" }))
      .toContain("stavningen");
  });

  it("faller tillbaka på ett neutralt meddelande utan engelsk teknikprosa", () => {
    const message = authErrorMessage({ message: "Database error querying schema" });
    expect(message).toContain("Försök igen");
    expect(message).not.toContain("Database");
  });

  it("klarar avsaknad av fel", () => {
    expect(authErrorMessage(null)).toBeTruthy();
    expect(authErrorMessage(undefined)).toBeTruthy();
  });
});
