import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { Stage } from "../primitives/Stage";
import { MaskReveal } from "../primitives/MaskReveal";
import { TickingNumber } from "../primitives/TickingNumber";
import { COLOR, ON_DARK } from "../theme";
import { BODY, HEADING } from "../lib/fonts";
import { formatKr } from "../lib/format";
import { CAPITAL, YEARS } from "../lib/fee";

type Props = { gap: number };

/**
 * 1,5–4,0 s. "Låter lite, va?" och sedan tickar beloppet upp.
 * Vändningen från procent till kronor är hela poängen med videon.
 */
export const FeeTicker: React.FC<Props> = ({ gap }) => {
  const frame = useCurrentFrame();

  return (
    <Stage background={COLOR.ink}>
      <div
        style={{
          fontFamily: HEADING,
          fontSize: 58,
          fontWeight: 700,
          color: COLOR.white,
          lineHeight: 1.15,
        }}
      >
        <MaskReveal delay={0}>Låter lite, va?</MaskReveal>
      </div>

      <div
        style={{
          marginTop: 56,
          fontFamily: BODY,
          fontSize: 32,
          fontWeight: 500,
          color: ON_DARK.muted,
          opacity: interpolate(frame, [16, 26], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {formatKr(CAPITAL)} i {YEARS} år kostar dig
      </div>

      <TickingNumber
        value={gap}
        delay={26}
        durationInFrames={40}
        format={formatKr}
        style={{
          display: "block",
          marginTop: 12,
          fontFamily: HEADING,
          fontSize: 118,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
          color: ON_DARK.neg,
        }}
      />

      <div
        style={{
          marginTop: 20,
          fontFamily: BODY,
          fontSize: 30,
          fontWeight: 500,
          color: ON_DARK.muted,
          opacity: interpolate(frame, [62, 72], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        jämfört med en avgift på 0,15 %
      </div>
    </Stage>
  );
};
