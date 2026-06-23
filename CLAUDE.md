@AGENTS.md

## Portfolio Analysis Design System

The `/radgivning/portfolioanalysis/(dashboard)` page has its own premium design language — do NOT apply these styles to the rest of the site.

### Color palette (dashboard only)

```
Background:      #FAFAF8
Text primary:    #1E2430  (font-weight 500, not 700)
Text secondary:  #5B6472
Text muted:      #8D95A3
Accent:          #274C77
Accent hover:    #1F3D61
Borders:         #F6F7F9  (very light — use everywhere except nav)
```

Asset allocation colors (must match Swedish category names from API):
```
Aktier  →  #274C77   (deep blue)
Räntor  →  #6096BA   (medium blue)
Kassa   →  #D8C3A5   (warm tan)
Övrigt  →  #8B9D83   (sage green)
```

Chart palette (regions/sectors donut):
```
#274C77, #6096BA, #A3CEF1, #8B9D83, #D8C3A5, #B8A0C8, #5B6472, #87A8CF, #1F3D61, #4A7BA4, #C8D8E8, #8D95A3
```

StyleBox heatmap:
```
#F6F7F9 → #DCE5F0 → #B9CCE3 → #87A8CF → #5B82B7 → #274C77
```

### Critical: shared components

`DonutChart`, `StyleBox`, and `HorizontalBar` are used across the whole site. **Never change their default colors.** Pass dashboard colors via props:

- `DonutChart`: `palette={[...]}` and `legendValueColor="#274C77"`
- `StyleBox`: `heatColors={["#F6F7F9","#DCE5F0","#B9CCE3","#87A8CF","#5B82B7","#274C77"]}`

### Critical: API returns Swedish category names

The Morningstar Python API (`api-python/main.py`) maps Morningstar codes to Swedish:
- `"HS11C"` → `"Aktier"` (NOT "Equity")
- `"HS11F"` → `"Räntor"` (NOT "Bond")
- `"HS11B"` → `"Kassa"` (NOT "Cash")
- `"HS11I"` → `"Övrigt"` (NOT "Other")

All `find(a => a.category === ...)` and color/label lookups must use Swedish keys (keep English as fallback).

### Nav

Transparent white with blur: `rgba(255,255,255,0.75)`, `backdrop-blur(20px)`, border `#F0F2F5`. Height `h-16`.

### Typography rules

- Section headers: `text-sm font-semibold tracking-[0.08em] uppercase text-[#5B6472]`
- Percentage numbers: `text-[#274C77] font-semibold`
- Portfolio title: `font-medium` (500) via DM Serif, color `#1E2430` — no gradient
- Metadata labels: `text-[11px] font-medium text-[#8D95A3] uppercase tracking-[0.1em]`

### Layout

- Sections are full-width with `py-10 sm:py-12`, no card borders
- Hover effect: `hover:bg-[#F8F9FB] rounded-2xl`
- No white cards with black borders on sections
- `dashboard-mode` body class hides site header/footer (set in layout.tsx)
