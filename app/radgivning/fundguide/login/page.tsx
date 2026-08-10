import { redirect } from "next/navigation";
import { ENTERPRISE_FEATURES_ENABLED } from "@/lib/features";

export default function LoginPage() {
  redirect(ENTERPRISE_FEATURES_ENABLED ? "/radgivning/fundguide" : "/");
}
