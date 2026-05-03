const PALETTE = [
  "#3B82F6",
  "#F59E0B",
  "#10B981",
  "#8B5CF6",
  "#F43F5E",
  "#06B6D4",
  "#94A3B8",
];

export type DonutSlice = { label: string; weight: number };

export default function DonutChart({
  slices,
  centerLabel,
  centerSub,
  size = 120,
  thickness = 20,
  horizontal = false,
}: {
  slices:        DonutSlice[];
  centerLabel?:  string;
  centerSub?:    string;
  size?:         number;
  thickness?:    number;
  horizontal?:   boolean;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r  = (size - thickness) / 2;

  function describeArc(startPct: number, endPct: number): string {
    const toRad = (pct: number) =>
      ((pct / 100) * 360 - 90) * (Math.PI / 180);
    const x1 = cx + r * Math.cos(toRad(startPct));
    const y1 = cy + r * Math.sin(toRad(startPct));
    // Clamp end to avoid degenerate arc when pct reaches 100
    const x2 = cx + r * Math.cos(toRad(Math.min(endPct, 99.9999)));
    const y2 = cy + r * Math.sin(toRad(Math.min(endPct, 99.9999)));
    const largeArc = endPct - startPct > 50 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  const sorted = [...slices].sort((a, b) => b.weight - a.weight);

  let cursor = 0;
  const segments = sorted.map((s, i) => {
    const from = cursor;
    const to   = cursor + s.weight;
    cursor     = to;
    return {
      from,
      to,
      color:        PALETTE[i % PALETTE.length],
      isFullCircle: s.weight >= 99.999,
    };
  });

  return (
    <div className={horizontal ? "flex items-center gap-5" : "flex flex-col items-center gap-4 w-full max-w-xs mx-auto"}>
      {/* SVG ring — proper anti-aliasing, no conic-gradient seams */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {segments.map((seg, i) =>
            seg.isFullCircle ? (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
              />
            ) : (
              <path
                key={i}
                d={describeArc(seg.from, seg.to)}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeLinecap="butt"
              />
            )
          )}
        </svg>

        {(centerLabel || centerSub) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerLabel && (
              <p className="font-bold text-slate-900 leading-tight" style={{ fontSize: size * 0.13 }}>
                {centerLabel}
              </p>
            )}
            {centerSub && (
              <p className="text-slate-400 leading-tight" style={{ fontSize: size * 0.09 }}>
                {centerSub}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className={`space-y-1.5 ${horizontal ? "min-w-0" : "w-full"}`}>
        {sorted.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1.5 min-w-0">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
            />
            <span className="text-sm text-slate-600 truncate">{s.label}</span>
            <span className="text-sm font-semibold text-slate-900 shrink-0">{s.weight.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
