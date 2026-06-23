import { redirect } from "next/navigation";
import LoginClient from "./LoginClient";
import { ENTERPRISE_FEATURES_ENABLED } from "@/lib/features";

export default function LoginPage() {
  if (!ENTERPRISE_FEATURES_ENABLED) redirect("/");
  return <LoginClient />;
}
