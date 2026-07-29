import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { BODY } from "../lib/fonts";

type Props = {
  value: number;
  /** Bildruta (relativt scenen) där uppräkningen börjar. */
  delay?: number;
  durationInFrames?: number;
  format: (n: number) => string;
  style?: React.CSSProperties;
};

/**
 * Belopp som räknar upp från noll. Videons viktigaste rörelse — den bär
 * halva budskapet, så håll den snabb (drygt en sekund) och sluta hårt.
 */
export const TickingNumber: React.FC<Props> = ({
  value,
  delay = 0,
  durationInFrames = 38,
  format,
  style,
}) => {
  const frame = useCurrentFrame();
  const current = interpolate(frame, [delay, delay + durationInFrames], [0, value], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <span
      style={{
        fontFamily: BODY,
        fontVariantNumeric: "tabular-nums",
        fontFeatureSettings: '"tnum"',
        ...style,
      }}
    >
      {format(current)}
    </span>
  );
};
