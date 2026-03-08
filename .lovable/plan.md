
# Fix: Render Green Income Markers on ALL Salary Days

## Problem
The terrain chart only shows a green income marker on the **first** salary spike because:
- `salaryIdx = terrainPoints.findIndex(...)` returns only the first match (line 629)
- The salary marker rendering (lines 900-913) only uses this single index
- The second upward slope (2nd month's 1st) has no green marker

Per the reference image, EVERY salary spike (upward-sloping line) should have a bold green circle with `€2,500` pill label.

## Solution

### Change 1: Find ALL salary indices instead of just the first
**Line ~629** — Replace:
```ts
const salaryIdx = terrainPoints.findIndex((p, i) => i > 0 && p.isSalaryDay);
```
With:
```ts
const salaryIndices = terrainPoints
  .map((p, i) => ({ p, i }))
  .filter(({ p, i }) => i > 0 && p.isSalaryDay)
  .map(({ i }) => i);
```

### Change 2: Render income markers for EACH salary day
**Lines 900-913** — Replace the single salary marker with a loop:
```tsx
{(timeRange === '1M' || timeRange === '3M') && salaryIndices.map((idx) => (
  <g key={`salary-${idx}`}>
    {/* Green circle marker */}
    <circle
      cx={mapX(idx)}
      cy={mapY(terrainPoints[idx].balance)}
      r={14}
      fill="rgba(34,197,94,0.25)"
      stroke="#22C55E"
      strokeWidth={2}
    />
    <text
      x={mapX(idx)}
      y={mapY(terrainPoints[idx].balance) + 4}
      textAnchor="middle" fill="#22C55E" fontSize={12} fontWeight={700}>
      $
    </text>
    {/* Amount pill above */}
    <rect
      x={mapX(idx) - 28} y={mapY(terrainPoints[idx].balance) - 32}
      width={56} height={16} rx={4}
      fill="rgba(34,197,94,0.2)"
    />
    <text
      x={mapX(idx)} y={mapY(terrainPoints[idx].balance) - 21}
      textAnchor="middle" fill="#22C55E" fontSize={10} fontWeight={600}>
      €{computed.monthlyIncome.toLocaleString()}
    </text>
  </g>
))}
```

### Change 3: Skip bill markers on salary days (income takes precedence)
**Lines 916-933** — Add condition to not render red expense squares on days where salary occurs:
```tsx
if (!p.bill || p.isPast || p.isSalaryDay) return null;
```

## Result
- Every upward-sloping salary spike gets a bold green circle with `$` icon and `€2,500` label
- Red expense squares only appear on declining sections
- X-axis labels will continue to show date numbers (existing behavior)
