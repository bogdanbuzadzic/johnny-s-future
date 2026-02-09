

# Johnny's Path - Visual Fixes

## Overview

Five targeted rendering fixes to the terrain visualization. No rebuilds -- only modifying `src/components/terrain/TerrainPath.tsx`.

---

## Fix 1: Overlapping Icons + Scaled Sizes

**Problem:** Markers on consecutive days (e.g., Rent Feb 28, Phone Mar 1, Salary Mar 1) overlap. All obstacle blocks are similar sizes regardless of amount.

**Solution:**

Add a `getMarkerSize` helper that returns dimensions based on amount:
- Under 50: 16x16 block, 10px icon, 9px label
- 50-200: 22x22 block, 12px icon, 9px label
- 200+: 28x28 block, 14px icon, 10px label

Add a stagger calculation pass before rendering markers. Collect all markers (bills + income) sorted by dayIndex. When two markers are within 2 day widths (88px), offset the second up by 32px, a third by 64px. The dotted connector line extends from the offset marker down to the actual terrain surface point.

**Changes (lines ~549-617):** Rewrite expense obstacle and income marker rendering to use computed sizes and stagger offsets.

---

## Fix 2: Anchor Markers to Terrain Surface

**Problem:** Small expense markers float above the terrain surface line instead of sitting on it.

**Solution:**

Add a `getTerrainYAtDay` helper that returns the surface Y for a given day index by looking up the point's balance and mapping it through `mapY`. For expense obstacles, the marker bottom edge should sit at the terrain surface Y of the *previous* day's balance (top of the cliff). For income markers, the bottom edge sits at the previous day's balance Y (bottom of the rise).

Replace the current y-position calculations:
- Expense: `y = mapY(points[i-1].balance)` -- bottom of block sits here
- Income: `cy = mapY(points[i-1].balance)` -- bottom of circle sits here

The key fix is ensuring the marker's bottom edge (not center) aligns with the surface, accounting for the marker's height.

---

## Fix 3: Smooth V-Valleys into U-Valleys

**Problem:** Rent (day 28, -450) immediately followed by Salary (day ~29, +2400) creates a sharp V-spike.

**Solution:**

Modify `buildTerrainPath` and `buildSurfacePath`. When a transaction day is detected:
- Instead of going horizontal then dropping vertically (`L midX prevY, L x y`), use cubic bezier curves that spread the transition over at least 1.5 day widths (66px)
- For drops: ease-in curve (starts slow, accelerates into the valley)
- For rises: ease-out curve (fast start, gentle landing)

Implementation: when `hasTransaction`, compute control points that spread horizontally:
```
// Drop (expense): ease-in
const dropStartX = prevX + DAY_WIDTH * 0.2;
const dropEndX = x + DAY_WIDTH * 0.3;
path += ` C ${dropStartX} ${prevY} ${dropEndX} ${y} ${x} ${y}`;

// Rise (income): ease-out  
const riseStartX = prevX + DAY_WIDTH * 0.2;
const riseEndX = x - DAY_WIDTH * 0.2;
path += ` C ${riseStartX} ${prevY} ${riseEndX} ${y} ${x} ${y}`;
```

When consecutive transaction days create a valley (drop then immediate rise), extend the bezier horizontally so the minimum point spans ~1.5 day widths on each side.

---

## Fix 4: Green Income Tint as Slope Highlight

**Problem:** The green tint is rendered as a solid rectangle covering the full height between pre/post income balance levels.

**Solution:**

Replace the `<rect>` (lines 487-504) with a filled `<path>` that traces:
1. Start at the pre-income terrain surface point (bottom of the rise)
2. Follow the terrain surface curve upward to the post-income height
3. Drop straight down to the pre-income Y level
4. Close the path

This creates a triangular/wedge shape that only highlights the "gained" area on the slope, not a full rectangle. Fill with `#34C759` at 12% opacity.

---

## Fix 5: Redesigned Playground Toolbar

**Problem:** Current toolbar uses tiny pills that are hard to see.

**Solution:**

Replace the toolbar section (lines 886-938) with a new layout:

- Three buttons in a row with `gap-2`, full width
- **Income button** (~42% width): 48px tall, rounded-xl, `bg-white/10` with green tint, green ArrowUp (18px) + "Income" 14px. When selected: `border border-green/30`
- **Expense button** (~42% width): Same but pink tint, pink ArrowDown (18px) + "Expense" 14px. When selected: `border border-pink/30`. Selected by default
- **Done button** (~16% width): Same height, `bg-white/10`, "Done" 14px white/60

Below the buttons: helper text centered, "Tap anywhere on the terrain to add expense/income" in 12px white/25, updating based on `selectedTool`.

The dashed playground border (line 426) changes from `white/10` to `white/15` for better visibility.

---

## Technical Details

### New Helpers

```typescript
function getMarkerSize(amount: number) {
  if (amount < 50) return { w: 16, h: 16, icon: 10, font: 9 };
  if (amount < 200) return { w: 22, h: 22, icon: 12, font: 9 };
  return { w: 28, h: 28, icon: 14, font: 10 };
}

function computeStaggerOffsets(markers: { dayIndex: number }[]): Map<number, number> {
  // Sort by dayIndex, assign vertical offset when within 2 days of each other
  // Returns map of dayIndex -> yOffset (0, 32, 64...)
}
```

### Files Changed
- `src/components/terrain/TerrainPath.tsx` only

### Implementation Order
1. Add helper functions (getMarkerSize, computeStaggerOffsets)
2. Fix marker y-positioning (anchor to surface)
3. Fix path construction for U-valleys
4. Fix green tint to use path instead of rect
5. Redesign playground toolbar

