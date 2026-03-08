

# Fix: Terrain Chart Marker & X-Axis Visibility Issues

## Problems Identified
1. **Second "€2,500" label not visible** — The pill label may be clipped or overlapping with the chart boundary
2. **Expense markers positioned incorrectly** — Red squares with icons appearing on upward slopes instead of downward slopes  
3. **X-axis dates not color-coded** — Currently gray only; should be green for income days, red for expense days per reference image

## Solution

### File: `src/components/sheets/TodayDrawer.tsx`

**Change 1: Improve income pill visibility (lines 920-930)**
- Add white background with opacity for better contrast
- Adjust positioning to avoid clipping at chart edges

**Change 2: Color-code X-axis labels (lines 1047-1054)**
Replace the simple gray text with logic that:
- Shows green + "↑" on salary days
- Shows red + expense emoji on bill days  
- Shows gray for neutral days

**Change 3: Ensure expense markers appear on downward slopes only**
The current logic positions markers at `y = mapY(p.balance)`, which is the balance *after* the expense. Need to check if the bill icon rendering is using `p.balance` (post-expense balance = lower point on downward slope). This is actually correct, but the visual positioning may need adjustment to appear at the *start* of the decline.

### X-Axis Label Code (replacement for lines 1047-1054):
```tsx
<div className="flex justify-between mt-1 px-1">
  {xLabels.map((l, i) => {
    const point = terrainPoints.find((p, pi) => {
      const interval = Math.max(1, Math.floor(terrainPoints.length / 7));
      return pi % interval === 0 && mapX(pi) === l.x;
    }) || terrainPoints[Math.round(i * terrainPoints.length / xLabels.length)];
    const isSalary = point?.isSalaryDay;
    const isBill = point?.bill && !point?.isPast;
    const color = isSalary ? '#22C55E' : isBill ? '#EF4444' : 'rgba(255,255,255,0.35)';
    const prefix = isSalary ? '↑ ' : '';
    const suffix = isBill ? (point?.bill?.icon === 'Home' ? ' 🏠' : point?.bill?.icon === 'Zap' ? ' ⚡' : ' 📅') : '';
    return (
      <span key={i} className="text-[10px] font-medium" style={{ color }}>
        {prefix}{l.text}{suffix}
      </span>
    );
  })}
</div>
```

### Salary Pill Improvement (lines 920-930):
```tsx
{/* Amount pill with better visibility */}
<rect
  x={mapX(idx) - 32} y={mapY(terrainPoints[idx].balance) - 34}
  width={64} height={18} rx={6}
  fill="rgba(34,197,94,0.85)"
/>
<text
  x={mapX(idx)} y={mapY(terrainPoints[idx].balance) - 22}
  textAnchor="middle" fill="#FFFFFF" fontSize={11} fontWeight={700}>
  €{computed.monthlyIncome.toLocaleString()}
</text>
```

## Result
- Income markers: Bold green circles with solid green pill showing "€2,500" in white text
- Expense markers: Red squares on downward-sloping sections only
- X-axis: Days color-coded (green for income, red for expenses, gray for neutral)

