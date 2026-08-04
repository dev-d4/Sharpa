// Vitest kör i jsdom-miljö, där paketet `server-only` löser upp till sin
// klientvariant och kastar direkt vid import. Servermoduler som importerar det
// (t.ex. lib/email/resend.ts) går därför inte att testa utan den här stubben.
// Aliasas i vitest.config.ts. Skyddet i produktionsbygget påverkas inte.
export {};
