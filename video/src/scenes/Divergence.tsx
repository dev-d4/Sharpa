import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { Stage } from "../primitives/Stage";
import { MaskReveal } from "../primitives/MaskReveal";
import { DivergenceChart } from "../primitives/DivergenceChart";
import { COLOR, SERIES } from "../theme";
import { BODY, HEADING } from "../lib/fonts";
import { formatKr } from "../lib/format";

type Props = {
  expensiveSeries: number[];
  cheapSeries: number[];
  gap: number;
};

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <div style={{ width: 26, height: 6, borderRadius: 3, background: color }} />
    <span style={{ fontFamily: BODY, fontSize: 26, fontWeight: 500, color: COLOR.ink2 }}>
      {label}
    </span>
  </div>
);

/**
 * 4,0–8,0 s. Kurvorna ritas ut, gapet fylls, beloppet landar.
 * Ljus botten här — bytet från mörkt till ljust markerar att vi går från
 * påstående till underbyggnad.
 */
export const Divergence: React.FC<Props> = ({ expensiveSeries, cheapSeries, gap }) => {
  const frame = useCurrentFrame();

  return (
    <Stage justify="center">
      <div
        style={{
          fontFamily: HEADING,
          fontSize: 46,
          fontWeight: 700,
          color: COLOR.ink,
          lineHeight: 1.2,
          marginBottom: 26,
        }}
      >
        <MaskReveal delay={0}>Samma avkastning. Olika avgift.</MaskReveal>
      </div>

      <div
        style={{
          display: "flex",
          gap: 32,
          marginBottom: 8,
          opacity: interpolate(frame, [10, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <LegendItem color={SERIES.cheap} label="0,15 % avgift" />
        <LegendItem color={SERIES.expensive} label="Din fond" />
      </div>

      <DivergenceChart
        expensiveSeries={expensiveSeries}
        cheapSeries={cheapSeries}
        delay={14}
      />

      <div
        style={{
          marginTop: 18,
          display: "flex",
          alignItems: "baseline",
          gap: 16,
          opacity: interpolate(frame, [78, 90], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span
          style={{
            fontFamily: HEADING,
            fontSize: 74,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: COLOR.neg,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatKr(-gap)}
        </span>
        <span style={{ fontFamily: BODY, fontSize: 30, fontWeight: 500, color: COLOR.ink2 }}>
          till fondbolaget
        </span>
      </div>
    </Stage>
  );
};
