import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Stage } from "../primitives/Stage";
import { MaskReveal } from "../primitives/MaskReveal";
import { COLOR, ON_DARK } from "../theme";
import { BODY, HEADING } from "../lib/fonts";

/** Samma märke som public/logo.svg. */
const Mark: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <rect width="64" height="64" rx="12" fill={COLOR.accent} />
    <path
      d="M20 40 L32 20 L44 40"
      stroke={COLOR.white}
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type Props = { headline?: string[] };

/**
 * Avslutningen. Kort CTA — uppmaningen ska inte tala i tio sekunder, men det
 * ska finnas luft nog att prata över den.
 */
export const Outro: React.FC<Props> = ({ headline = ["Analysera hela", "din portfölj."] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const markIn = spring({
    frame: frame - 4,
    fps,
    config: { damping: 200, stiffness: 100, mass: 0.8 },
    durationInFrames: 24,
  });

  return (
    <Stage background={COLOR.ink}>
      <div style={{ transform: `scale(${0.9 + markIn * 0.1})`, opacity: markIn, marginBottom: 40 }}>
        <Mark size={104} />
      </div>

      <div
        style={{
          fontFamily: HEADING,
          fontSize: 66,
          fontWeight: 800,
          color: COLOR.white,
          lineHeight: 1.14,
        }}
      >
        {headline.map((line, i) => (
          <MaskReveal key={line} delay={10 + i * 6}>
            {line}
          </MaskReveal>
        ))}
      </div>

      <div
        style={{
          marginTop: 26,
          fontFamily: BODY,
          fontSize: 32,
          fontWeight: 500,
          color: ON_DARK.muted,
          opacity: interpolate(frame, [30, 42], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Gratis. Ingen provision.
      </div>

      <div
        style={{
          marginTop: 22,
          fontFamily: BODY,
          fontSize: 34,
          fontWeight: 600,
          color: ON_DARK.accent,
          opacity: interpolate(frame, [44, 56], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        sharpa.se — länk i bio
      </div>
    </Stage>
  );
};
