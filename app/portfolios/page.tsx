import { Suspense } from "react";
import PortfoliosClient from "./PortfoliosClient";

export const dynamic = "force-static";

export default function PortfoliosPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    }>
      <PortfoliosClient />
    </Suspense>
  );
}
