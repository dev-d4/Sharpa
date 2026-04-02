"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function Prefetch({ hrefs }: { hrefs: string[] }) {
  const router = useRouter();

  useEffect(() => {
    hrefs.forEach((href) => router.prefetch(href));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
