import fs from "fs";
import path from "path";

/* Sajten grindas av proxy.ts när INTEGRATION_PASSWORD är satt. Testerna för
   själva grinden (integration-auth.spec.ts) rensar cookies i beforeEach och
   loggar in via UI:t — alla övriga tester får cookien via storageState så att
   de når sidorna direkt. */
export default async function globalSetup() {
  const pw = process.env.INTEGRATION_PASSWORD;
  const cookies = pw
    ? [{
        name: "integration_auth",
        value: pw,
        domain: "localhost",
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
      }]
    : [];
  const out = path.join("test-results", "storage-state.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ cookies, origins: [] }));
}
