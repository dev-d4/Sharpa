"use client";

import dynamic from "next/dynamic";

const AnalyzeClient = dynamic(() => import("./AnalyzeClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  ),
});

export default function AnalyzeWrapper() {
  return <AnalyzeClient />;
}
