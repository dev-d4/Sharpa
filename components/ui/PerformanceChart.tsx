"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { TWRData } from "@/lib/twr-mock-data";

type Range = "3M" | "6M" | "1Y" | "3Y" | "Sedan start";

const ALL_RANGES: Range[] = ["3M", "6M", "1Y", "3Y", "Sedan start"];

const RANGE_LABEL: Record<Range, string> = {
  "3M":          "3 mån",
  "6M":          "6 mån",
  "1Y":          "1 år",
  "3Y":          "3 år",
  "Sedan start": "Sedan start",
};

const SE_MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${parseInt(d)} ${SE_MONTHS[parseInt(m) - 1]} ${y}`;
}

function rangeStartDate(range: Range, lastDate: string): string {
  const d = new Date(lastDate);
  if (range === "3M") d.setMonth(d.getMonth() - 3);
  else if (range === "6M") d.setMonth(d.getMonth() - 6);
  else if (range === "1Y") d.setFullYear(d.getFullYear() - 1);
  else if (range === "3Y") d.setFullYear(d.getFullYear() - 3);
  else return "0000-00-00";
  return d.toISOString().slice(0, 10);
}

function buildCumulativeSeries(timeSeries: TWRData["timeSeries"]) {
  let cum = 1;
  return timeSeries.map(pt => {
    cum *= (1 + pt.twr);
    return { date: pt.date, value: (cum - 1) * 100 };
  });
}

type RangeResult = { series: { date: string; value: number }[]; totalReturn: number };

function computeRangeSeries(
  cumSeries: { date: string; value: number }[],
  range: Range,
): RangeResult | null {
  if (cumSeries.length === 0) return null;

  const lastDate  = cumSeries[cumSeries.length - 1].date;
  const firstDate = cumSeries[0].date;

  if (range !== "Sedan start") {
    const cutoff     = rangeStartDate(range, lastDate);
    const cutoffDate = new Date(cutoff);
    const firstDt    = new Date(firstDate);
    const diffDays   = (firstDt.getTime() - cutoffDate.getTime()) / 86_400_000;
    if (diffDays > 35) return null;

    const startIdx  = Math.max(0, cumSeries.findIndex(pt => pt.date >= cutoff));
    const baseCum   = startIdx > 0 ? cumSeries[startIdx - 1].value : 0;
    const baseFactor = 1 + baseCum / 100;
    const series    = cumSeries.slice(startIdx).map(pt => ({
      date:  pt.date,
      value: ((1 + pt.value / 100) / baseFactor - 1) * 100,
    }));
    return { series, totalReturn: series[series.length - 1]?.value ?? 0 };
  }

  // Sedan start — all data, already starts at 0
  return {
    series:      cumSeries,
    totalReturn: cumSeries[cumSeries.length - 1]?.value ?? 0,
  };
}

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX  = (prev.x + curr.x) / 2;
    d += ` C ${cpX} ${prev.y} ${cpX} ${curr.y} ${curr.x} ${curr.y}`;
  }
  return d;
}

export default function PerformanceChart({ data }: { data: TWRData }) {
  const [range,  setRange]  = useState<Range>("Sedan start");
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const svgRef       = useRef<SVGSVGElement>(null);
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(800);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver(entries => {
      setContainerW(entries[0].contentRect.width);
    });
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  const compact = containerW < 380;

  function changeRange(r: Range) {
    setRange(r);
    setHovIdx(null);
  }

  const cumSeries = useMemo(() => buildCumulativeSeries(data.timeSeries), [data]);

  const rangeData = useMemo(() => {
    const out: Partial<Record<Range, RangeResult>> = {};
    for (const r of ALL_RANGES) {
      const d = computeRangeSeries(cumSeries, r);
      if (d) out[r] = d;
    }
    return out;
  }, [cumSeries]);

  const availableRanges = ALL_RANGES.filter(r => rangeData[r] != null);

  const effectiveRange = rangeData[range]
    ? range
    : (availableRanges[availableRanges.length - 1] ?? "Sedan start");

  const filtered = rangeData[effectiveRange]?.series ?? [];

  const W = 800, H = 240;
  const PAD = compact
    ? { top: 8, right: 8, bottom: 8, left: 8 }
    : { top: 16, right: 16, bottom: 32, left: 52 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const minV   = filtered.length > 0 ? Math.min(...filtered.map(p => p.value)) : 0;
  const maxV   = filtered.length > 0 ? Math.max(...filtered.map(p => p.value)) : 1;
  const rangeV = maxV - minV || 0.01;
  const padV   = rangeV * 0.12;
  const yMin   = minV - padV;
  const yMax   = maxV + padV;

  const toX = (i: number) =>
    PAD.left + (filtered.length > 1 ? (i / (filtered.length - 1)) * innerW : innerW / 2);
  const toY = (v: number) =>
    PAD.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const svgPoints = filtered.map((pt, i) => ({ x: toX(i), y: toY(pt.value) }));
  const linePath  = buildPath(svgPoints);
  const areaPath  = linePath
    + ` L ${svgPoints[svgPoints.length - 1]?.x ?? 0} ${PAD.top + innerH}`
    + ` L ${svgPoints[0]?.x ?? 0} ${PAD.top + innerH} Z`;

  const yTicks = useMemo(() => {
    const step =
      rangeV > 20 ? 5  :
      rangeV > 8  ? 2  :
      rangeV > 3  ? 1  :
      rangeV > 1  ? 0.5 :
                    0.2;
    const out: number[] = [];
    let v = Math.ceil((yMin / step) - 0.001) * step;
    while (v <= yMax + step * 0.01) {
      out.push(parseFloat(v.toFixed(2)));
      v += step;
    }
    return out.slice(0, 8);
  }, [yMin, yMax, rangeV]);

  const xLabels = (() => {
    if (filtered.length === 0) return [];
    const first = new Date(filtered[0].date);
    const last  = new Date(filtered[filtered.length - 1].date);
    const diffM =
      (last.getFullYear() - first.getFullYear()) * 12 +
      (last.getMonth() - first.getMonth());

    const interval =
      diffM <= 3  ? 1  :
      diffM <= 9  ? 2  :
      diffM <= 18 ? 3  :
      diffM <= 36 ? 6  :
                    12;

    const seen = new Set<string>();
    const out: { x: number; label: string }[] = [];

    filtered.forEach((pt, i) => {
      const [y, m] = pt.date.split("-");
      const mn  = parseInt(m);
      const key = `${y}-${m}`;
      if (seen.has(key)) return;
      if ((mn - 1) % interval !== 0) return;

      seen.add(key);
      out.push({ x: toX(i), label: `${y}-${m}` });
    });

    // Drop a label when the next one is too close (keeps the later/cleaner tick)
    const MIN_GAP = 70;
    return out.filter((lbl, i) => {
      const next = out[i + 1];
      return !next || next.x - lbl.x >= MIN_GAP;
    });
  })();

  const finalReturn     = filtered[filtered.length - 1]?.value ?? 0;
  const isPositive      = finalReturn >= 0;

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || filtered.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x    = ((e.clientX - rect.left) / rect.width) * W;
    const relX = x - PAD.left;
    const frac = Math.max(0, Math.min(1, relX / innerW));
    setHovIdx(Math.round(frac * (filtered.length - 1)));
  }

  const hovPt    = hovIdx !== null ? filtered[hovIdx]  : null;
  const hovSvg   = hovIdx !== null ? svgPoints[hovIdx] : null;
  const dispVal  = hovPt?.value ?? finalReturn;
  const dispPos  = dispVal >= 0;

  return (
    <div ref={wrapperRef} className="select-none">

      {/* Period pills — always visible, each shows return */}
      <div className="flex flex-wrap gap-2 mb-6">
        {availableRanges.map(r => {
          const rd     = rangeData[r];
          if (!rd) return null;
          const ret    = rd.totalReturn;
          const retPos = ret >= 0;
          const active = effectiveRange === r;
          return (
            <button
              key={r}
              onClick={() => changeRange(r)}
              className="flex flex-col items-start px-4 py-2.5 rounded-md transition-all text-left"
              style={active
                ? { background: "#274C77", color: "#fff" }
                : { background: "#F3F4F2" }}
            >
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.08em] leading-none mb-1.5"
                style={{ color: active ? "rgba(255,255,255,0.65)" : "#8D95A3" }}
              >
                {RANGE_LABEL[r]}
              </span>
              <span
                className="text-sm font-semibold tabular-nums leading-none"
                style={{ color: active ? "#fff" : retPos ? "#274C77" : "#d9534f" }}
              >
                {retPos ? "+" : ""}{ret.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Hover / summary value */}
      <div className="mb-5 min-h-[52px]">
        {hovPt && (
          <p className="text-[11px] font-medium text-[#8D95A3] uppercase tracking-[0.1em] mb-1.5">
            {formatDate(hovPt.date)}
          </p>
        )}
        <p
          className="text-3xl font-semibold tabular-nums leading-none"
          style={{ color: dispPos ? "#274C77" : "#d9534f" }}
        >
          {dispPos ? "+" : ""}{dispVal.toFixed(2)}%
        </p>
      </div>

      {/* Chart — fully responsive via aspect-ratio */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full block"
        style={{ aspectRatio: `${W} / ${H}` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovIdx(null)}
      >
        <defs>
          <linearGradient id="perf-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={isPositive ? "#274C77" : "#d9534f"} stopOpacity="0.12" />
            <stop offset="100%" stopColor={isPositive ? "#274C77" : "#d9534f"} stopOpacity="0" />
          </linearGradient>
          <clipPath id="perf-clip">
            <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} />
          </clipPath>
        </defs>

        {/* Zero line */}
        {yMin < 0 && yMax > 0 && (
          <line
            x1={PAD.left} y1={toY(0)}
            x2={PAD.left + innerW} y2={toY(0)}
            stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 3"
          />
        )}

        {/* Y-axis grid + labels */}
        {yTicks.map(tick => (
          <g key={tick}>
            <line
              x1={PAD.left} y1={toY(tick)}
              x2={PAD.left + innerW} y2={toY(tick)}
              stroke="#F0F2F5" strokeWidth="1"
            />
            {!compact && (
              <text
                x={PAD.left - 6} y={toY(tick)}
                textAnchor="end" dominantBaseline="middle"
                fontSize="9" fill="#8D95A3"
              >
                {tick >= 0 ? `+${tick}%` : `${tick}%`}
              </text>
            )}
          </g>
        ))}

        {/* Area + line */}
        {svgPoints.length > 1 && (
          <>
            <path d={areaPath} fill="url(#perf-grad)" clipPath="url(#perf-clip)" />
            <path
              d={linePath}
              fill="none"
              stroke={isPositive ? "#274C77" : "#d9534f"}
              strokeWidth="1.8"
              clipPath="url(#perf-clip)"
            />
          </>
        )}

        {/* X-axis labels */}
        {!compact && xLabels.map((lbl, i) => (
          <text
            key={i}
            x={lbl.x}
            y={H - 4}
            textAnchor="middle"
            fontSize="9"
            fill="#8D95A3"
          >
            {lbl.label}
          </text>
        ))}

        {/* Hover crosshair */}
        {hovSvg && hovPt && (
          <>
            <line
              x1={hovSvg.x} y1={PAD.top}
              x2={hovSvg.x} y2={PAD.top + innerH}
              stroke="#274C77" strokeWidth="1" strokeDasharray="3 3" opacity="0.4"
            />
            <circle
              cx={hovSvg.x} cy={hovSvg.y} r="4"
              fill="#274C77" stroke="#fff" strokeWidth="2"
            />
          </>
        )}
      </svg>
    </div>
  );
}
