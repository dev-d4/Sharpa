import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { COLOR, SERIES, SAFE_WIDTH } from "../theme";
import { BODY } from "../lib/fonts";
import { formatKr } from "../lib/format";
import { CAPITAL, YEARS } from "../lib/fee";

type Props = {
  expensiveSeries: number[];
  cheapSeries: number[];
  delay?: number;
  height?: number;
};

// Höger padding är en ränna reserverad åt slutetiketterna. Ligger de inne i
// plotytan skär de kurvan — den stiger genom exakt den yta texten vill ha.
const PAD = { top: 40, right: 236, bottom: 76, left: 8 };
const LABEL_GAP = 20;

/**
 * Två kurvor som ritas ut från samma punkt och glider ifrån varandra; gapet
 * mellan dem fylls och etiketteras. Hela pitchen i en bild.
 *
 * Y-axeln börjar vid insatt kapital, inte vid noll, och det står uttryckligen på
 * baslinjen — annars vore det en trunkerad axel som överdriver skillnaden.
 */
export const DivergenceChart: React.FC<Props> = ({
  expensiveSeries,
  cheapSeries,
  delay = 0,
  height = 620,
}) => {
  const frame = useCurrentFrame();
  const width = SAFE_WIDTH;
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  const min = CAPITAL;
  const max = cheapSeries[YEARS] * 1.03;

  const x = (year: number) => PAD.left + (year / YEARS) * plotW;
  const y = (value: number) => PAD.top + plotH - ((value - min) / (max - min)) * plotH;

  const toPath = (s: number[]) =>
    s.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");

  // Ytan mellan kurvorna: billig kurva framåt, dyr kurva bakåt.
  const gapPath = [
    cheapSeries.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" "),
    [...expensiveSeries].reverse().map((v, i) => `L ${x(YEARS - i).toFixed(2)} ${y(v).toFixed(2)}`).join(" "),
    "Z",
  ].join(" ");

  const draw = interpolate(frame, [delay, delay + 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const fill = interpolate(frame, [delay + 34, delay + 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const labels = interpolate(frame, [delay + 52, delay + 64], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const gridValues = [min, min + (max - min) / 2, max];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Recessivt raster */}
      {gridValues.map((v, i) => (
        <line
          key={i}
          x1={PAD.left}
          x2={PAD.left + plotW}
          y1={y(v)}
          y2={y(v)}
          stroke={i === 0 ? COLOR.line : COLOR.lineSoft}
          strokeWidth={i === 0 ? 2 : 1}
        />
      ))}

      <clipPath id="gap-clip">
        <rect x={PAD.left} y={0} width={plotW * fill} height={height} />
      </clipPath>
      <path d={gapPath} fill={SERIES.cheap} opacity={0.13} clipPath="url(#gap-clip)" />

      {/* Kurvor. pathLength=1 gör strokeDashoffset till ren procentandel. */}
      <path
        d={toPath(expensiveSeries)}
        fill="none"
        stroke={SERIES.expensive}
        strokeWidth={5}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
      <path
        d={toPath(cheapSeries)}
        fill="none"
        stroke={SERIES.cheap}
        strokeWidth={5}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />

      {/* Slutpunkter med 2px ring mot ytan så de aldrig smälter in i kurvan */}
      {draw > 0.98 && (
        <>
          <circle cx={x(YEARS)} cy={y(cheapSeries[YEARS])} r={9} fill={SERIES.cheap} stroke={COLOR.canvas} strokeWidth={2} />
          <circle cx={x(YEARS)} cy={y(expensiveSeries[YEARS])} r={9} fill={SERIES.expensive} stroke={COLOR.canvas} strokeWidth={2} />
        </>
      )}

      {/* Direktetiketter — identiteten sitter i texten, inte bara i färgen */}
      <g opacity={labels} fontFamily={BODY} fontSize={30} fontWeight={600}>
        <text
          x={x(YEARS) + LABEL_GAP}
          y={y(cheapSeries[YEARS]) - 4}
          fill={COLOR.ink}
        >
          {formatKr(cheapSeries[YEARS])}
        </text>
        <text
          x={x(YEARS) + LABEL_GAP}
          y={y(cheapSeries[YEARS]) + 28}
          fill={COLOR.ink3}
          fontSize={24}
          fontWeight={500}
        >
          0,15 % avgift
        </text>
        <text
          x={x(YEARS) + LABEL_GAP}
          y={y(expensiveSeries[YEARS]) - 4}
          fill={COLOR.ink}
        >
          {formatKr(expensiveSeries[YEARS])}
        </text>
        <text
          x={x(YEARS) + LABEL_GAP}
          y={y(expensiveSeries[YEARS]) + 28}
          fill={COLOR.ink3}
          fontSize={24}
          fontWeight={500}
        >
          din fond
        </text>
      </g>

      {/* Baslinjen är insatt kapital, uttryckligen märkt */}
      <text
        x={PAD.left}
        y={y(min) + 38}
        fontFamily={BODY}
        fontSize={22}
        fontWeight={500}
        fill={COLOR.ink3}
      >
        Insatt kapital {formatKr(CAPITAL)}
      </text>
      <text
        x={PAD.left + plotW}
        y={y(min) + 38}
        textAnchor="end"
        fontFamily={BODY}
        fontSize={22}
        fontWeight={500}
        fill={COLOR.ink3}
      >
        efter {YEARS} år
      </text>
    </svg>
  );
};
