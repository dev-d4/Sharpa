import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Stage } from "../primitives/Stage";
import { Card } from "../primitives/Card";
import { SectionLabel } from "../primitives/SectionLabel";
import { MaskReveal } from "../primitives/MaskReveal";
import { TickingNumber } from "../primitives/TickingNumber";
import { COLOR } from "../theme";
import { BODY, HEADING } from "../lib/fonts";
import { formatKr, formatPercent } from "../lib/format";
import {
  SWAPS,
  CURRENT,
  SUGGESTED,
  FEE_SAVING_PER_YEAR,
  ASSUMED_CAPITAL,
} from "../data/portfolio.generated";

/** Antal förslag som får plats i bild utan att typografin krymper. */
const VISIBLE = 2;

const FundLine: React.FC<{ label: string; name: string; cost: number; accent?: boolean }> = ({
  label,
  name,
  cost,
  accent = false,
}) => (
  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontFamily: BODY,
          fontSize: 19,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: COLOR.accent,
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: BODY, fontSize: 27, fontWeight: 600, color: COLOR.ink, lineHeight: 1.25 }}>
        {name}
      </div>
    </div>
    <div
      style={{
        fontFamily: BODY,
        fontSize: 29,
        fontWeight: 700,
        color: accent ? COLOR.accent : COLOR.ink2,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        paddingTop: 24,
      }}
    >
      {formatPercent(cost)}
    </div>
  </div>
);

const SwapBlock: React.FC<{
  currentName: string;
  suggestedName: string;
  currentCost: number;
  suggestedCost: number;
  delay: number;
  isLast: boolean;
}> = ({ currentName, suggestedName, currentCost, suggestedCost, delay, isLast }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 110, mass: 0.7 },
    durationInFrames: 20,
  });
  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        paddingTop: 22,
        paddingBottom: 22,
        borderBottom: isLast ? "none" : `2px solid ${COLOR.lineSoft}`,
        opacity,
        transform: `translateY(${(1 - enter) * 18}px)`,
      }}
    >
      <FundLine label="Nuvarande" name={currentName} cost={currentCost} />
      {/* Nedåtpil som på analyssidans mobilvy — vertikalt staplat, inte i kolumner */}
      <div style={{ display: "flex", justifyContent: "center", margin: "14px 0" }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: COLOR.section,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={COLOR.ink4} strokeWidth={2.5}>
            <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <FundLine label="Alternativ" name={suggestedName} cost={suggestedCost} accent />
    </div>
  );
};

/**
 * 25–32 s. Förbättringsförslagen. Vi jämför avgifter och nyckeltal — videon
 * säger aldrig köp eller sälj, för det vore investeringsrådgivning.
 */
export const Improvements: React.FC = () => {
  const frame = useCurrentFrame();
  const shown = SWAPS.slice(0, VISIBLE);
  const rest = SWAPS.length - shown.length;

  const summaryOpacity = interpolate(frame, [92, 104], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Stage>
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
        <MaskReveal delay={0}>Och vad du kan göra åt det</MaskReveal>
      </div>

      <Card delay={8} padding={36}>
        <SectionLabel marginBottom={2}>Förbättringsförslag</SectionLabel>
        {shown.map((s, i) => (
          <SwapBlock
            key={s.currentName}
            currentName={s.currentName}
            suggestedName={s.suggestedName}
            currentCost={s.currentCost}
            suggestedCost={s.suggestedCost}
            delay={22 + i * 16}
            isLast={i === shown.length - 1 && rest === 0}
          />
        ))}
        {rest > 0 && (
          <div
            style={{
              paddingTop: 20,
              borderTop: `2px solid ${COLOR.lineSoft}`,
              fontFamily: BODY,
              fontSize: 24,
              color: COLOR.ink3,
              opacity: interpolate(frame, [62, 72], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            + {rest} förslag till i analysen
          </div>
        )}
      </Card>

      <div
        style={{
          marginTop: 30,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          opacity: summaryOpacity,
        }}
      >
        <div>
          <SectionLabel marginBottom={8}>Betyg</SectionLabel>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span
              style={{
                fontFamily: HEADING,
                fontSize: 54,
                fontWeight: 800,
                color: COLOR.ink4,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {CURRENT.score.toFixed(1).replace(".", ",")}
            </span>
            <span style={{ fontFamily: BODY, fontSize: 34, color: COLOR.ink4 }}>→</span>
            <span
              style={{
                fontFamily: HEADING,
                fontSize: 54,
                fontWeight: 800,
                color: COLOR.pos,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {SUGGESTED.score.toFixed(1).replace(".", ",")}
            </span>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <SectionLabel marginBottom={8}>Lägre avgift</SectionLabel>
          <TickingNumber
            value={FEE_SAVING_PER_YEAR}
            delay={100}
            durationInFrames={30}
            format={formatKr}
            style={{
              display: "block",
              fontFamily: HEADING,
              fontSize: 54,
              fontWeight: 800,
              color: COLOR.pos,
            }}
          />
          <div style={{ fontFamily: BODY, fontSize: 21, color: COLOR.ink3, marginTop: 4 }}>
            per år vid {formatKr(ASSUMED_CAPITAL)}
          </div>
        </div>
      </div>
    </Stage>
  );
};
