"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

const PALETTE = [
  "#3B82F6", "#F59E0B", "#10B981", "#8B5CF6",
  "#F43F5E", "#06B6D4", "#94A3B8", "#F97316",
  "#84CC16", "#EC4899", "#14B8A6", "#A78BFA",
];

export type DonutSlice = { label: string; weight: number; color?: string };

export default function DonutChart({
  slices,
  centerLabel,
  centerSub,
  size = 120,
  thickness = 20,
  horizontal = false,
  showLegend = true,
  palette,
  legendValueColor,
  disableHover = false,
}: {
  slices:            DonutSlice[];
  centerLabel?:      string;
  centerSub?:        string;
  size?:             number;
  thickness?:        number;
  horizontal?:       boolean;
  showLegend?:       boolean;
  palette?:          string[];
  legendValueColor?: string;
  disableHover?:     boolean;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltip,    setTooltip]    = useState<{
    label: string; weight: number; clientX: number; clientY: number;
  } | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const r  = (size - thickness) / 2;

  function describeArc(startPct: number, endPct: number): string {
    const toRad = (pct: number) => ((pct / 100) * 360 - 90) * (Math.PI / 180);
    const x1 = cx + r * Math.cos(toRad(startPct));
    const y1 = cy + r * Math.sin(toRad(startPct));
    const x2 = cx + r * Math.cos(toRad(Math.min(endPct, 99.9999)));
    const y2 = cy + r * Math.sin(toRad(Math.min(endPct, 99.9999)));
    const largeArc = endPct - startPct > 50 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  function radialOffset(fromPct: number, toPct: number, px: number) {
    const midAngle = (((fromPct + toPct) / 2 / 100) * 360 - 90) * (Math.PI / 180);
    return { dx: px * Math.cos(midAngle), dy: px * Math.sin(midAngle) };
  }

  const sorted = [...slices].sort((a, b) => b.weight - a.weight);

  let cursor = 0;
  const segments = sorted.map((s, i) => {
    const from = cursor;
    const to   = cursor + s.weight;
    cursor     = to;
    const activePalette = palette ?? PALETTE;
    return { from, to, color: s.color ?? activePalette[i % activePalette.length], isFullCircle: s.weight >= 99.999 };
  });

  function onMove(e: React.MouseEvent, i: number) {
    if (disableHover) return;
    setHoveredIdx(i);
    setTooltip({ label: sorted[i].label, weight: sorted[i].weight, clientX: e.clientX, clientY: e.clientY });
  }

  function onLeave() {
    setHoveredIdx(null);
    setTooltip(null);
  }

  return (
    <div className={horizontal ? "flex items-center gap-6" : showLegend ? "flex flex-col items-center gap-4 w-full max-w-xs mx-auto" : "inline-flex"}>

      <div className="relative shrink-0" style={{ width: size, height: size }} onMouseLeave={onLeave}>
        <svg width={size} height={size} style={{ overflow: "visible" }}>
          {segments.map((seg, i) => {
            const hovered = hoveredIdx === i;
            const sw      = hovered && !seg.isFullCircle ? thickness + 4 : thickness;

            if (seg.isFullCircle) {
              return (
                <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                  style={{ stroke: seg.color, strokeWidth: sw, cursor: "default", transition: "stroke-width 0.1s ease" }}
                  onMouseMove={e => onMove(e, i)}
                />
              );
            }

            const { dx, dy } = hovered ? radialOffset(seg.from, seg.to, 5) : { dx: 0, dy: 0 };

            return (
              <path key={i}
                d={describeArc(seg.from, seg.to)}
                fill="none"
                strokeLinecap="butt"
                style={{
                  stroke:      seg.color,
                  strokeWidth: sw,
                  cursor:      "default",
                  transition:  "stroke-width 0.1s ease, transform 0.1s ease",
                  transform:   `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`,
                }}
                onMouseMove={e => onMove(e, i)}
              />
            );
          })}
        </svg>

        {(centerLabel || centerSub) && (() => {
          const innerHoleR = r - thickness / 2;
          const padX = Math.max(8, Math.floor((size - innerHoleR * 1.8) / 2));
          return (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingLeft: padX, paddingRight: padX }}>
              {centerLabel && (
                <p className="font-semibold text-slate-900 leading-tight w-full text-center truncate" style={{ fontSize: size * 0.13 }}>{centerLabel}</p>
              )}
              {centerSub && (
                <p className="text-slate-400 leading-tight w-full text-center truncate" style={{ fontSize: size * 0.09 }}>{centerSub}</p>
              )}
            </div>
          );
        })()}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className={`space-y-1.5 ${horizontal ? "min-w-0" : "w-full"}`}>
          {sorted.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2 min-w-0">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: segments[i].color }}
              />
              <span className="text-[13px] text-slate-500 truncate">{s.label}</span>
              <span
                className="text-[13px] font-semibold shrink-0 tabular-nums ml-auto pl-3"
                style={{ color: legendValueColor ?? "#1e293b" }}
              >
                {s.weight.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tooltip — rendered via portal to escape CSS-transform stacking contexts */}
      {tooltip && typeof document !== "undefined" && createPortal(
        <div
          className="fixed z-[9999] text-xs px-2.5 py-1.5 rounded-md shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            left:            tooltip.clientX + 14,
            top:             tooltip.clientY - 38,
            backgroundColor: "rgba(15,23,42,0.90)",
            color:           "#fff",
          }}
        >
          <span style={{ fontWeight: 400 }}>{tooltip.label}</span>
          <span style={{ marginLeft: 8, fontWeight: 600 }}>{tooltip.weight.toFixed(1)}%</span>
        </div>,
        document.body
      )}
    </div>
  );
}
