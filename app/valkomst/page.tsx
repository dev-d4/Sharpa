import { Suspense } from "react";
import OnboardingClient from "./OnboardingClient";

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <OnboardingClient />
    </Suspense>
  );
}
