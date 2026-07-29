import React from "react";
import { Stage } from "../primitives/Stage";
import { Card } from "../primitives/Card";
import { SectionLabel } from "../primitives/SectionLabel";
import { MaskReveal } from "../primitives/MaskReveal";
import { Metric } from "../primitives/Metric";
import { StackedBar } from "../primitives/StackedBar";
import { COLOR, CHART_PALETTE } from "../theme";
import { HEADING } from "../lib/fonts";
import { formatPercent } from "../lib/format";
import { CURRENT, ALLOCATION } from "../data/portfolio.generated";

const pct1 = (n: number) => `${n.toFixed(1).replace(".", ",")} %`;
const dec2 = (n: number) => n.toFixed(2).replace(".", ",");

/**
 * 18–25 s. Nyckeltalsrutnätet och fördelningen — 2×2 precis som analyssidan,
 * följt av tillgångsslagsstapeln.
 */
export const KeyMetrics: React.FC = () => (
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
      <MaskReveal delay={0}>Alla nyckeltal på ett ställe</MaskReveal>
    </div>

    <Card delay={8} padding={40}>
      <SectionLabel>Nyckeltal</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: 36,
          rowGap: 34,
        }}
      >
        <Metric
          label="Snittavgift"
          value={CURRENT.avgCost}
          format={formatPercent}
          sub="per år"
          delay={20}
          valueColor={COLOR.warn}
        />
        <Metric
          label="Avkastning 1 år"
          value={CURRENT.return1yr}
          format={pct1}
          sub="senaste 12 mån"
          delay={28}
        />
        <Metric
          label="Avkastning 3 år"
          value={CURRENT.return3yr}
          format={pct1}
          sub="totalt"
          delay={36}
        />
        <Metric
          label="Sharpe 3 år"
          value={CURRENT.sharpe}
          format={dec2}
          sub="riskjusterad"
          delay={44}
        />
      </div>

      <div style={{ marginTop: 38, paddingTop: 32, borderTop: `2px solid ${COLOR.lineSoft}` }}>
        <SectionLabel>Fördelning</SectionLabel>
        <StackedBar
          delay={56}
          segments={ALLOCATION.map((a, i) => ({
            label: a.label,
            weight: a.weight,
            color: CHART_PALETTE[i],
          }))}
        />
      </div>
    </Card>
  </Stage>
);
