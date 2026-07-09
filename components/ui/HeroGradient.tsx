"use client";

import { useEffect, useRef } from "react";

// Animerat gradient-lager bakom heron. Kloten och den statiska botten-toningen
// ligger i CSS (globals.css). Här sköts bara skroll-uttoningen: hela lagret
// tonar från opacity 1 vid toppen till 0 när man skrollat förbi heron.
export default function HeroGradient() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const section = layer.parentElement; // hero-sektionen (position: relative)
    let ticking = false;

    const update = () => {
      ticking = false;
      const heroHeight = section?.offsetHeight ?? window.innerHeight;
      const progress = Math.min(Math.max(window.scrollY / heroHeight, 0), 1);
      layer.style.opacity = String(1 - progress);
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{
        maskImage: "linear-gradient(to bottom, #000 55%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, #000 55%, transparent 100%)",
      }}
    >
      <span className="hero-blob hero-blob-1" />
      <span className="hero-blob hero-blob-2" />
      <span className="hero-blob hero-blob-3" />
      <span className="hero-blob hero-blob-4" />
    </div>
  );
}
