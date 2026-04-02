import { Suspense } from "react";
import AnalyzeClient from "./AnalyzeClient";

export const dynamic = "force-static";

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AnalyzeClient />
    </Suspense>
  );
}
