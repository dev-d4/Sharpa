import { Suspense } from "react";
import RiskResultClient from "./RiskResultClient";

export default function RiskResultPage() {
  return (
    <Suspense fallback={null}>
      <RiskResultClient />
    </Suspense>
  );
}
