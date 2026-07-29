import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { Stage } from "../primitives/Stage";
import { Card } from "../primitives/Card";
import { SectionLabel } from "../primitives/SectionLabel";
import { MaskReveal } from "../primitives/MaskReveal";
import { TickingNumber } from "../primitives/TickingNumber";
import { COLOR } from "../theme";
import { BODY, HEADING } from "../lib/fonts";
import { formatPercent } from "../lib/format";
import { CURRENT, ACTIVE_SHARE, HOLDINGS } from "../data/portfolio.generated";

/** Samma tröskel för betygsfärg som app/analyze/AnalyzeClient.tsx. */
const scoreColor = CURRENT.score >= 7.5 ? COLOR.pos : CURRENT.score >= 5 ? COLOR.warn : COLOR.neg;

const Bullet: React.FC<{ icon: string; text: string; color: string; delay: number }> = ({
  icon,
  text,
  color,
  delay,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        marginTop: 12,
        opacity,
        fontFamily: BODY,
        fontSize: 25,
        lineHeight: 1.4,
        color,
      }}
    >
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
};

/**
 * 11–18 s. Betygskortet — sidans mest igenkännbara yta. Siffran tickar upp,
 * sedan landar styrkor och förbättringsområden.
 */
export const ScoreCard: React.FC = () => (
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
      <MaskReveal delay={0}>Portföljen får ett betyg</MaskReveal>
    </div>

    <Card delay={8} padding={40}>
      <SectionLabel marginBottom={12}>Portföljbetyg</SectionLabel>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <TickingNumber
          value={CURRENT.score}
          delay={18}
          durationInFrames={34}
          format={(n) => n.toFixed(1).replace(".", ",")}
          style={{
            fontFamily: HEADING,
            fontSize: 130,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            color: scoreColor,
          }}
        />
        <span style={{ fontFamily: BODY, fontSize: 52, fontWeight: 300, color: COLOR.ink4 }}>
          /10
        </span>
        <span
          style={{
            marginLeft: 12,
            fontFamily: BODY,
            fontSize: 27,
            fontWeight: 600,
            color: scoreColor,
            background: COLOR.warnSoft,
            border: `2px solid ${COLOR.warn}40`,
            borderRadius: 12,
            padding: "8px 18px",
          }}
        >
          {CURRENT.label}
        </span>
      </div>

      <div
        style={{
          marginTop: 30,
          paddingTop: 28,
          borderTop: `2px solid ${COLOR.lineSoft}`,
        }}
      >
        <SectionLabel marginBottom={4}>Styrkor</SectionLabel>
        <Bullet
          icon="✓"
          color={COLOR.pos}
          delay={58}
          text={`Spridd över ${HOLDINGS.length} kategorier`}
        />

        <div style={{ marginTop: 26 }}>
          <SectionLabel marginBottom={4}>Förbättringsområden</SectionLabel>
          <Bullet
            icon="⚠"
            color={COLOR.warn}
            delay={70}
            text={`Hög snittavgift: ${formatPercent(CURRENT.avgCost)} per år`}
          />
          <Bullet
            icon="⚠"
            color={COLOR.warn}
            delay={80}
            text={`${ACTIVE_SHARE} % aktivt förvaltat`}
          />
        </div>
      </div>
    </Card>
  </Stage>
);
