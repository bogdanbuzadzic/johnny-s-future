

# Fix: Position Markers Above Line & Improve X-Axis

## Problems (from screenshot)
1. **Income markers positioned at line** — Pills need to be clearly ABOVE the peak of the income spike
2. **Expense markers positioned poorly** — Red squares should be positioned ABOVE the downward line segment, not at the balance point
3. **X-axis dates cramped and unclear** — Need cleaner spacing and larger text

## Solution

### File: `src/components/sheets/TodayDrawer.tsx`

**Change 1: Position income markers ABOVE the line peak (~lines 924-950)**
- Move the green circle marker UP by subtracting from Y position
- Position the €2,500 pill further above the circle
```tsx
// Circle at y - 20 (above the line peak)
cy={mapY(terrainPoints[idx].balance) - 20}
// Pill at y - 55 (well above the circle)
y={Math.max(2, mapY(terrainPoints[idx].balance) - 55)}
```

**Change 2: Position expense markers ABOVE the line (~lines 960-971)**
- Move red squares UP by subtracting more from Y
```tsx
// Red square at y - 35 (above the downward slope)
<rect x={x - 11} y={y - 45} .../>
<foreignObject x={x - 11} y={y - 45} .../>
```

**Change 3: Improve X-axis labels (~lines 1067-1079)**
- Increase font size from 10px to 11px
- Remove emoji clutter, use cleaner colored dots or just colored text
- Add more spacing with wider justify
```tsx
<div className="flex justify-between mt-2 px-2">
  <span key={i} className="text-[11px] font-bold" style={{ color }}>
    {l.text}
  </span>
</div>
```

## Visual Result
- Green income circles and €2,500 pills float clearly above salary spikes
- Red expense squares float above the declining line segments
- X-axis shows clean, well-spaced date labels with green/red color coding

