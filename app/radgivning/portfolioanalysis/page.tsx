import { redirect } from "next/navigation";
import MorningstarLandingPage from "./MorningstarLandingPage";
import { ENTERPRISE_FEATURES_ENABLED } from "@/lib/features";

export const metadata = {
  title:       "Portföljanalys — Generera rådgivarlänk",
  description: "Dela interaktiva Morningstar-portföljanalyser med rådgivare via en enda länk.",
};

export default function PortfolioAnalysisLandingPage() {
  if (!ENTERPRISE_FEATURES_ENABLED) redirect("/");
  return <MorningstarLandingPage />;
}
