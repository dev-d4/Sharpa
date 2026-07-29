import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Stage } from "../primitives/Stage";
import { MaskReveal } from "../primitives/MaskReveal";
import { COLOR, ON_DARK } from "../theme";
import { BODY, HEADING } from "../lib/fonts";
import { formatPercent } from "../lib/format";

type Props = { name: string; fee: number; category: string };

/**
 * 0,0–1,5 s. Hooken. Fondnamnet först, sedan slår avgiften in stort.
 * Ingenting annat får ligga här — publiken avgör inom 1,5 sekunder.
 */
export const FundIntro: React.FC<Props> = ({ name, fee, category }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slam = spring({
    frame: frame - 14,
    fps,
    config: { damping: 14, stiffness: 190, mass: 0.6 },
    durationInFrames: 26,
  });
  const scale = interpolate(slam, [0, 1], [1.5, 1]);

  return (
    <Stage background={COLOR.ink}>
      <div style={{ fontFamily: BODY, fontSize: 34, fontWeight: 500, color: ON_DARK.muted }}>
        <MaskReveal delay={0}>{category}</MaskReveal>
      </div>

      <div
        style={{
          fontFamily: HEADING,
          fontSize: 62,
          fontWeight: 700,
          lineHeight: 1.12,
          color: COLOR.white,
          marginTop: 10,
        }}
      >
        <MaskReveal delay={3}>{name}</MaskReveal>
      </div>

      <div
        style={{
          marginTop: 64,
          fontFamily: HEADING,
          fontSize: 210,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          color: COLOR.white,
          fontVariantNumeric: "tabular-nums",
          transform: `scale(${scale})`,
          transformOrigin: "left center",
          opacity: slam > 0 ? 1 : 0,
        }}
      >
        {formatPercent(fee)}
      </div>
      <div
        style={{
          fontFamily: BODY,
          fontSize: 34,
          fontWeight: 500,
          color: ON_DARK.muted,
          marginTop: 8,
          opacity: interpolate(frame, [30, 40], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        i löpande avgift
      </div>
    </Stage>
  );
};
