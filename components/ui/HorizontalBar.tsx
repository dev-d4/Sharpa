export type BarItem = { name: string; percentage: number };

const COLORS = [
  "#3B82F6", "#F59E0B", "#10B981", "#8B5CF6",
  "#F43F5E", "#06B6D4", "#94A3B8", "#EF4444",
  "#84CC16", "#EC4899",
];

export default function HorizontalBar({
  items,
  colorIndex = 0,
  maxItems,
}: {
  items:       BarItem[];
  colorIndex?: number;
  maxItems?:   number;
}) {
  const visible = maxItems ? items.slice(0, maxItems) : items;
  const max     = Math.max(...visible.map(i => i.percentage), 0.01);
  const color   = COLORS[colorIndex % COLORS.length];

  return (
    <div className="space-y-3">
      {visible.map((item, idx) => (
        <div key={item.name} className="flex items-center gap-3 min-w-0">
          <span
            className="text-xs font-medium text-slate-600 truncate shrink-0"
            style={{ width: "10rem" }}
            title={item.name}
          >
            {item.name}
          </span>
          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width:           `${(item.percentage / max) * 100}%`,
                backgroundColor: color,
                opacity:         Math.max(0.4, 1 - idx * 0.035),
                transition:      "width 0.5s ease",
              }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700 shrink-0 w-12 text-right tabular-nums">
            {item.percentage.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}
