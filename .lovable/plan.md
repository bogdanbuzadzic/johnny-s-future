

# Fix: Income Markers Clipping & X-Axis Date Color-Coding

## Problems
1. **€2,500 pills clipping above chart** — `mapY()` returns values too close to 0 (top) leaving no room for the -36px offset pill
2. **X-axis dates not color-coded** — The current logic maps `pointIdx` but doesn't accurately match the actual salary/bill days being displayed

## Solution

### File: `src/components/sheets/TodayDrawer.tsx`

**Change 1: Increase top padding in mapY to prevent clipping (line ~441)**
Current: `chartHeight - 10 - norm * (chartHeight - 30)` → top padding only 20px  
New: Add more headroom for markers: `chartHeight - 10 - norm * (chartHeight - 60)` → 50px top padding

**Change 2: Clamp salary pill Y position to stay within SVG bounds (lines 921-923)**
Add `Math.max(20, ...)` to the Y position to ensure pills don't go above the SVG viewport:
```tsx
y={Math.max(20, mapY(terrainPoints[idx].balance) - 36)}
// And for the text:
y={Math.max(32, mapY(terrainPoints[idx].balance) - 24)}
```

**Change 3: Fix X-axis label mapping to correctly identify salary/bill days (lines 1051-1064)**
The current `pointIdx` calculation doesn't correctly find matching days. Replace with a direct lookup that stores salary/bill info in the xLabels array:

```tsx
// In xLabels useMemo (around line 596-622), add isSalary/isBill to each label object
// Then in the render, use those stored flags instead of recalculating
```

Alternatively, store flags during xLabels creation and use them directly in rendering.

## Technical Details
- Increase top padding from 20px to 50px in mapY calculation
- Clamp pill Y positions with `Math.max(20, y - 36)` 
- Fix X-axis by including `isSalary` and `isBill` flags in the xLabels array during creation

