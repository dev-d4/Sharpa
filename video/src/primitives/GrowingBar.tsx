import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLOR, SAFE_WIDTH } from "../theme";
import { BODY, HEADING } from "../lib/fonts";
import { formatPercent } from "../lib/format";

type Props = {
  label: string;
  /** Avgift i procent. */
  value: number;
  /** Skalans maxvärde, delas mellan alla staplar i gruppen. */
  max: number;
  color: string;
  delay?: number;
  /** Lyfter fram den billiga raden. */
  emphasis?: boolean;
};

const TRACK_WIDTH = SAFE_WIDTH - 260;
const BAR_HEIGHT = 26;

/**
 * Horisontell stapel som växer från noll. Tunn mark, 4px rundade dataändar
 * ankrade i baslinjen, värdet direktetiketterat i slutet.
 */
export const GrowingBar: React.FC<Props> = ({
  label,
  value,
  max,
  color,
  delay = 0,
  emphasis = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const grow = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 90, mass: 0.9 },
    durationInFrames: 26,
  });
  const opacity = interpolate(frame, [delay, delay + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const width = (value / max) * TRACK_WIDTH * grow;

  return (
    <div style={{ opacity, marginBottom: 34 }}>
      <div
        style={{
          fontFamily: BODY,
          fontSize: 30,
          fontWeight: emphasis ? 600 : 500,
          color: emphasis ? COLOR.ink : COLOR.ink2,
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: TRACK_WIDTH,
            height: BAR_HEIGHT,
            background: COLOR.lineSoft,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width,
              height: "100%",
              background: color,
              borderTopRightRadius: 4,
              borderBottomRightRadius: 4,
            }}
          />
        </div>
        <span
          style={{
            fontFamily: HEADING,
            fontSize: 34,
            fontWeight: 800,
            color: emphasis ? color : COLOR.ink,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {formatPercent(value * grow)}
        </span>
      </div>
    </div>
  );
};
