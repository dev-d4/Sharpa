import { useState } from "react";
import { createPortal } from "react-dom";

export type StyleboxItem = { name: string; code: string; percentage: number };

const ROWS = ["Large", "Mid", "Small"] as const;
const COLS = ["Value", "Core", "Growth"] as const;

const ROW_SV = { Large: "Stor", Mid: "Medel", Small: "Liten" } as const;
const COL_SV = { Value: "Värde", Core: "Kärna", Growth: "Tillväxt" } as const;

const CELL = 76;
const GAP  = 5;

export default function StyleBox({ data, heatColors }: { data: StyleboxItem[]; heatColors?: string[] }) {
  const maxPct = Math.max(...data.map(d => d.percentage), 0.01);
  const [tooltip, setTooltip] = useState<{ label: string; pct: number; x: number; y: number } | null>(null);

  return (
    <div className="inline-block select-none">
      {/* Column headers */}
      <div className="grid grid-cols-4 mb-2" style={{ gap: GAP }}>
        <div />
        {COLS.map(col => (
          <div
            key={col}
            className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center"
            style={{ width: CELL }}
          >
            {COL_SV[col]}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      {ROWS.map((row, ri) => (
        <div
          key={row}
          className="grid grid-cols-4 items-center"
          style={{ gap: GAP, marginBottom: ri < ROWS.length - 1 ? GAP : 0 }}
        >
          <div
            className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right pr-2"
            style={{ width: 48 }}
          >
            {ROW_SV[row]}
          </div>
          {COLS.map(col => {
            const label = `${row} ${col}`;
            const cell  = data.find(d => d.name === label);
            const pct   = cell?.percentage ?? 0;
            const ratio = pct / maxPct;

            let bgColor: string;
            let textLight: boolean;

            if (heatColors && heatColors.length >= 2) {
              const idx = pct === 0 ? 0 : Math.min(heatColors.length - 1, Math.floor(ratio * (heatColors.length - 1)) + 1);
              bgColor   = heatColors[idx];
              textLight = idx >= Math.ceil(heatColors.length * 0.6);
            } else {
              const alpha = 0.05 + ratio * 0.90;
              bgColor     = `rgba(37, 99, 235, ${alpha})`;
              textLight   = ratio > 0.5;
            }

            return (
              <div
                key={col}
                title={undefined}
                onMouseMove={e => pct > 0 && setTooltip({ label: `${ROW_SV[row]} ${COL_SV[col]}`, pct, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setTooltip(null)}
                className="flex flex-col items-center justify-center transition-opacity duration-150 cursor-default"
                style={{
                  width:           CELL,
                  height:          CELL,
                  backgroundColor: bgColor,
                  borderRadius:    6,
                }}
              >
                {pct > 0 && (
                  <>
                    <span
                      className="text-[15px] font-semibold leading-none tabular-nums"
                      style={{ color: textLight ? "#ffffff" : "#1e3a8a" }}
                    >
                      {pct}
                    </span>
                    <span
                      className="text-[9px] font-medium leading-none mt-0.5"
                      style={{ color: textLight ? "rgba(255,255,255,0.65)" : "rgba(30,58,138,0.55)" }}
                    >
                      %
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4">
        <div
          className="h-1.5"
          style={{
            width:      84,
            background: heatColors && heatColors.length >= 2
              ? `linear-gradient(to right, ${heatColors[0]}, ${heatColors[heatColors.length - 1]})`
              : "linear-gradient(to right, rgba(37,99,235,0.05), rgba(37,99,235,0.95))",
            borderRadius: 2,
          }}
        />
        <span className="text-[9px] text-slate-400">Lägre → Högre vikt</span>
      </div>

      {/* Tooltip */}
      {tooltip && typeof document !== "undefined" && createPortal(
        <div
          className="fixed z-[9999] text-xs px-2.5 py-1.5 rounded-md shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            left:            tooltip.x + 14,
            top:             tooltip.y - 38,
            backgroundColor: "rgba(15,23,42,0.90)",
            color:           "#fff",
          }}
        >
          <span style={{ fontWeight: 400 }}>{tooltip.label}</span>
          <span style={{ marginLeft: 8, fontWeight: 600 }}>{tooltip.pct}%</span>
        </div>,
        document.body
      )}
    </div>
  );
}
