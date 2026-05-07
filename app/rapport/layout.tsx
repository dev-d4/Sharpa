"use client";

import { useEffect } from "react";

export default function RapportLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add("rapport-mode");
    return () => document.body.classList.remove("rapport-mode");
  }, []);
  return <>{children}</>;
}
