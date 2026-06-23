import IntegrationClient from "./IntegrationClient";
import { ENTERPRISE_FEATURES_ENABLED } from "@/lib/features";

export const metadata = {
  title: "Integration – Portföljanalys för rådgivningsplattformar",
  description: "Bygg in interaktiva portföljrapporter i ert rådgivningssystem med en enda URL-parameter.",
};

export default function IntegrationPage() {
  if (!ENTERPRISE_FEATURES_ENABLED) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-slate-500 text-sm">Den här funktionen är inte tillgänglig.</p>
        </div>
      </div>
    );
  }
  return <IntegrationClient />;
}
