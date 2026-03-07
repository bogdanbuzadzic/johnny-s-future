

# Fix Terrain Chart: Visible Markers + Color-Coded Date Axis

## Problem
The terrain chart code has markers and tooltips implemented, but they don't match the reference design (screenshot 1). Two main issues:

1. **X-axis dates are all gray/white** — income days should be GREEN, expense days should be RED, with small icon emojis next to the date number
2. **Markers are too faint** — even at 0.35 opacity they blend into the purple background. Need higher contrast and bolder styling

## Changes to `src/components/terrain/TerrainPath.tsx`

### Change 1: Color-coded date axis with icons

Replace the date axis section (lines 1234-1291). For each date point:
- If `p.income > 0` (salary day): show date in **green** (`#22C55E`), append `↑` arrow, show label like `"1st ↑"`
- If `p.bills.length > 0` (expense day): show date in **red** (`#F87171`), append a small icon indicator matching the bill type (🏠 for rent, ⚡ for utilities, 🚗 for car)
- If `p.isToday`: keep `"Today"` label in white
- All other days: gray (`rgba(255,255,255,0.15)`)

```text
Date axis examples:
  28    1st ↑    3 🏠    5 ⚡    7    10    14    15 🚗    ...    Today    ...    28    1st ↑
 gray   GREEN    RED     RED    gray  gray  gray   RED          white          gray   GREEN
```

The tick mark color should also match: green tick for income days, red tick for expense days.

### Change 2: Boost marker visibility

Increase expense marker opacity and add a subtle glow/shadow:
- Expense `<rect>`: `fill="rgba(239,68,68,0.55)"` and `stroke="rgba(239,68,68,0.8)"` (up from 0.35/0.6)
- Income `<circle>`: `fill="rgba(52,199,89,0.5)"` and `stroke="rgba(52,199,89,0.8)"` (up from 0.35/0.6)
- Icon inside expense: `className="text-white"` (full white, not 80%)
- Icon inside income (Wallet): `color: 'rgba(74,222,128,1)'` (full opacity)
- Amount labels below expense markers: `fill="rgba(255,255,255,0.75)"` (up from 0.55)
- Salary amount label above income markers: `fill="rgba(52,199,89,0.9)"` (up from 0.7)

### Change 3: Salary label styling

The `€2,500` label above income markers should use a green background pill (like screenshot 1) instead of plain text:
- Render as a `<foreignObject>` with a small green-bg rounded pill: `background: rgba(34,197,94,0.2)`, `border: 1px solid rgba(34,197,94,0.4)`, `color: #22C55E`, `padding: 2px 8px`, `borderRadius: 6px`, `fontSize: 11px`, `fontWeight: 700`

### Summary of visual targets
- Income markers: bold green circles with wallet icon, green pill label showing amount
- Expense markers: bold red/amber rounded squares with white icons (Home, Zap, Car), white amount label below
- Date axis: green text + arrow for income days, red text + icon for expense days, gray for normal days
- All markers clearly visible against the purple gradient background

