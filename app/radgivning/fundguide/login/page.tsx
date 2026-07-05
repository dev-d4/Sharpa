import { redirect } from "next/navigation";
import LoginClient from "./LoginClient";
import { ENTERPRISE_FEATURES_ENABLED } from "@/lib/features";

export default function LoginPage() {
  // Sidan har två roller: enterprise-login OCH sajtens lösenordsgrind (proxy.ts
  // skickar hit alla besökare när INTEGRATION_PASSWORD är satt). Den får därför
  // aldrig redirecta till "/" när grinden är aktiv — det skapar en oändlig loop.
  const gateActive = Boolean(process.env.INTEGRATION_PASSWORD);
  if (!gateActive && !ENTERPRISE_FEATURES_ENABLED) redirect("/");
  return <LoginClient />;
}
