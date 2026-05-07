import { Suspense } from "react";
import ReportClient from "./ReportClient";

export const dynamic = "force-static";

function Spinner() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );
}

export default function RapportPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ReportClient />
    </Suspense>
  );
}
