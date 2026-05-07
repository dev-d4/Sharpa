import IntegrationClient from "./IntegrationClient";

export const metadata = {
  title: "Integration – Portföljanalys för rådgivningsplattformar",
  description: "Bygg in interaktiva portföljrapporter i ert rådgivningssystem med en enda URL-parameter.",
};

export default function IntegrationPage() {
  return <IntegrationClient />;
}
