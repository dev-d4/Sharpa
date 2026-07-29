import React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { COLOR } from "../theme";
import { BODY } from "../lib/fonts";

export type Segment = { label: string; weight: number; color: string };

/**
 * Staplad andelsstapel med prickförklaring under — samma uppbyggnad som
 * "Tillgångsslag" och "Förvaltningsstil" på analyssidan.
 */
export const StackedBar: React.FC<{ segments: Segment[]; delay?: number }> = ({
  segments,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grow = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 80, mass: 1 },
    durationInFrames: 28,
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          height: 14,
          borderRadius: 999,
          overflow: "hidden",
          background: COLOR.lineSoft,
          // 2 px mellanrum mellan segmenten så de aldrig smälter ihop
          gap: 2,
        }}
      >
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ width: `${s.weight * grow}%`, background: s.color }}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 28px", marginTop: 18 }}>
        {segments.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span
              style={{ width: 14, height: 14, borderRadius: 999, background: s.color, flexShrink: 0 }}
            />
            <span style={{ fontFamily: BODY, fontSize: 23, color: COLOR.ink2 }}>{s.label}</span>
            <span
              style={{
                fontFamily: BODY,
                fontSize: 23,
                fontWeight: 700,
                color: COLOR.ink,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {Math.round(s.weight)} %
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
