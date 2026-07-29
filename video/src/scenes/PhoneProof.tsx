import React from "react";
import { Stage } from "../primitives/Stage";
import { MaskReveal } from "../primitives/MaskReveal";
import { PhoneFrame } from "../primitives/PhoneFrame";
import { COLOR } from "../theme";
import { BODY, HEADING } from "../lib/fonts";

type Props = {
  screencast?: string;
  screencastStartFrom?: number;
  headline?: string;
  sub?: string;
};

/**
 * Den enda scenen som är skärminspelning. Den ligger mitt i videon för att
 * fungera som bevis: animationerna gör påståendet, inspelningen visar att
 * siffrorna kommer ur ett riktigt verktyg. Flytta den inte först eller sist.
 */
export const PhoneProof: React.FC<Props> = ({
  screencast,
  screencastStartFrom = 0,
  headline = "Så här ser det ut",
  sub = "Sök en fond — eller analysera hela portföljen.",
}) => (
  <Stage>
    <div
      style={{
        fontFamily: HEADING,
        fontSize: 46,
        fontWeight: 700,
        color: COLOR.ink,
        lineHeight: 1.2,
      }}
    >
      <MaskReveal delay={0}>{headline}</MaskReveal>
    </div>
    <div
      style={{
        fontFamily: BODY,
        fontSize: 29,
        fontWeight: 500,
        color: COLOR.ink2,
        marginTop: 12,
        marginBottom: 36,
      }}
    >
      <MaskReveal delay={6}>{sub}</MaskReveal>
    </div>

    <div style={{ display: "flex", justifyContent: "center" }}>
      <PhoneFrame src={screencast} delay={8} width={430} startFrom={screencastStartFrom} />
    </div>
  </Stage>
);
