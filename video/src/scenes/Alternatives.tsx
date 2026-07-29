import React from "react";
import { Stage } from "../primitives/Stage";
import { MaskReveal } from "../primitives/MaskReveal";
import { GrowingBar } from "../primitives/GrowingBar";
import { COLOR, SERIES } from "../theme";
import { HEADING } from "../lib/fonts";

type Props = {
  name: string;
  fee: number;
  categoryAverageFee: number;
  category: string;
  alternativeName: string;
  alternativeFee: number;
};

/**
 * 11,5–15,0 s. Tre staplar: fondens avgift, kategorisnittet, ett billigare
 * alternativ. Vi jämför avgifter — vi rekommenderar inte köp eller sälj.
 */
export const Alternatives: React.FC<Props> = ({
  name,
  fee,
  categoryAverageFee,
  category,
  alternativeName,
  alternativeFee,
}) => {
  const max = Math.max(fee, categoryAverageFee, alternativeFee) * 1.1;

  return (
    <Stage>
      <div
        style={{
          fontFamily: HEADING,
          fontSize: 46,
          fontWeight: 700,
          color: COLOR.ink,
          lineHeight: 1.2,
          marginBottom: 52,
        }}
      >
        <MaskReveal delay={0}>Avgift i {category}</MaskReveal>
      </div>

      <GrowingBar label={name} value={fee} max={max} color={SERIES.expensive} delay={10} />
      <GrowingBar
        label="Snitt i kategorin"
        value={categoryAverageFee}
        max={max}
        color={COLOR.ink4}
        delay={22}
      />
      <GrowingBar
        label={alternativeName}
        value={alternativeFee}
        max={max}
        color={SERIES.cheap}
        delay={34}
        emphasis
      />
    </Stage>
  );
};
