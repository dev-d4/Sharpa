"use client";

import { RefObject, useEffect, useId } from "react";

export const MOBILE_BOTTOM_OVERLAY_EVENT = "sharpa:mobile-bottom-overlay";

type MobileBottomOverlayDetail = {
  id: string;
  height: number;
};

export function publishMobileBottomOverlay(id: string, height: number) {
  window.dispatchEvent(
    new CustomEvent<MobileBottomOverlayDetail>(MOBILE_BOTTOM_OVERLAY_EVENT, {
      detail: { id, height: Math.max(0, height) },
    })
  );
}

export function useMobileBottomOverlay<T extends HTMLElement>(
  active: boolean,
  ref: RefObject<T | null>,
  idPrefix: string
) {
  const reactId = useId();
  const overlayId = `${idPrefix}-${reactId}`;

  useEffect(() => {
    if (!active) {
      publishMobileBottomOverlay(overlayId, 0);
      return;
    }

    function publishHeight() {
      const height = ref.current?.getBoundingClientRect().height ?? 0;
      publishMobileBottomOverlay(overlayId, height);
    }

    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    if (ref.current) observer.observe(ref.current);
    window.addEventListener("resize", publishHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", publishHeight);
      publishMobileBottomOverlay(overlayId, 0);
    };
  }, [active, overlayId, ref]);
}
