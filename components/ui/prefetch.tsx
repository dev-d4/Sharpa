"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function Prefetch({ href }: { href: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      if (!cancelled) router.prefetch(href, { onInvalidate: poll } as Parameters<typeof router.prefetch>[1]);
    };
    poll();
    return () => { cancelled = true; };
  }, [href, router]);

  return null;
}
