import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { Stage } from "../primitives/Stage";
import { MaskReveal } from "../primitives/MaskReveal";
import { COLOR, ON_DARK } from "../theme";
import { BODY, HEADING } from "../lib/fonts";
import { HOLDINGS } from "../data/portfolio.generated";

/**
 * 0–4 s. Frågan, inget annat. Publiken avgör inom någon sekund, och det enda
 * som håller kvar dem är att frågan gäller dem själva.
 */
export const Hook: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <Stage background={COLOR.ink}>
      <div
        style={{
          fontFamily: BODY,
          fontSize: 32,
          fontWeight: 500,
          color: ON_DARK.muted,
          marginBottom: 18,
        }}
      >
        <MaskReveal delay={0}>{HOLDINGS.length} fonder hos banken.</MaskReveal>
      </div>

      <div
        style={{
          fontFamily: HEADING,
          fontSize: 88,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          lineHeight: 1.08,
          color: COLOR.white,
        }}
      >
        <MaskReveal delay={8}>Hur bra är</MaskReveal>
        <MaskReveal delay={15}>din portfölj</MaskReveal>
        <MaskReveal delay={22}>egentligen?</MaskReveal>
      </div>

      <div
        style={{
          marginTop: 40,
          fontFamily: BODY,
          fontSize: 30,
          fontWeight: 500,
          color: ON_DARK.accent,
          opacity: interpolate(frame, [50, 62], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Klistra in den. Få svar direkt.
      </div>
    </Stage>
  );
};
