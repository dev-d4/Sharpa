import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Stage } from "../primitives/Stage";
import { Card } from "../primitives/Card";
import { SectionLabel } from "../primitives/SectionLabel";
import { MaskReveal } from "../primitives/MaskReveal";
import { COLOR } from "../theme";
import { BODY, HEADING } from "../lib/fonts";
import { formatPercent } from "../lib/format";
import { HOLDINGS } from "../data/portfolio.generated";

/** En innehavsrad: namn, kategori och vikt — som innehavslistan på analyssidan. */
const HoldingRow: React.FC<{
  name: string;
  category: string;
  weight: number;
  cost: number;
  delay: number;
  isLast: boolean;
}> = ({ name, category, weight, cost, delay, isLast }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 110, mass: 0.7 },
    durationInFrames: 20,
  });
  const opacity = interpolate(frame, [delay, delay + 7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 24,
        paddingTop: 20,
        paddingBottom: 20,
        borderBottom: isLast ? "none" : `2px solid ${COLOR.lineSoft}`,
        opacity,
        transform: `translateX(${(1 - enter) * 24}px)`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: BODY,
            fontSize: 28,
            fontWeight: 600,
            color: COLOR.ink,
            lineHeight: 1.25,
          }}
        >
          {name}
        </div>
        <div style={{ fontFamily: BODY, fontSize: 23, color: COLOR.ink3, marginTop: 5 }}>
          {category} · {formatPercent(cost)} avgift
        </div>
      </div>
      <div
        style={{
          fontFamily: HEADING,
          fontSize: 34,
          fontWeight: 800,
          color: COLOR.ink,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {weight} %
      </div>
    </div>
  );
};

/**
 * 4–11 s. Portföljen rad för rad. Riktiga fonder ur data/avanza-funds.json med
 * riktiga avgifter — det är hela poängen med att inte hitta på exempel.
 */
export const Holdings: React.FC = () => (
  <Stage>
    <div
      style={{
        fontFamily: HEADING,
        fontSize: 46,
        fontWeight: 700,
        color: COLOR.ink,
        lineHeight: 1.2,
        marginBottom: 30,
      }}
    >
      <MaskReveal delay={0}>En helt vanlig bankportfölj</MaskReveal>
    </div>

    <Card delay={8} padding={38}>
      <SectionLabel>Ditt innehav</SectionLabel>
      {HOLDINGS.map((h, i) => (
        <HoldingRow
          key={h.name}
          name={h.name}
          category={h.category}
          weight={h.weight}
          cost={h.cost}
          delay={20 + i * 11}
          isLast={i === HOLDINGS.length - 1}
        />
      ))}
    </Card>
  </Stage>
);
