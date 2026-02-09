

# Fix: Render Icons Inside Terrain Markers

## Problem

The expense obstacle blocks and income circles are rendered as empty shapes. The code references `bill.icon` (line 686) but never renders it inside the marker. Similarly, income markers have no Wallet icon inside the circle.

## What the Screenshot Shows vs. What's Expected

Currently: Empty gray rounded rectangles with amount labels below them. Icons appear to be tiny unreadable shapes.

Expected: Each marker block should have a clearly visible Lucide icon centered inside (Home for rent, Zap for electricity, ShoppingCart for groceries, etc.), with the amount label below.

## Solution

### File: `src/components/terrain/TerrainPath.tsx`

### Change 1: Add `foreignObject` for expense icons (lines 696-718)

Inside each expense obstacle `<g>`, after the `<rect>`, add a `<foreignObject>` element that renders the Lucide icon component centered within the block.

```typescript
<g key={`obs-${i}`}>
  <rect ... />
  <foreignObject
    x={markerX - size.w / 2}
    y={markerY}
    width={size.w}
    height={size.h}
  >
    <div className="w-full h-full flex items-center justify-center">
      <Icon size={size.icon} className="text-white/50" />
    </div>
  </foreignObject>
  <text ...>€{bill.amount}</text>
</g>
```

### Change 2: Add `foreignObject` for income icons (lines 734-754)

Inside each income marker `<g>`, after the `<circle>`, add a `<foreignObject>` that renders the Wallet icon centered within the circle.

```typescript
<g key={`inc-${i}`}>
  <circle ... />
  <foreignObject
    x={markerX - r}
    y={cy - r}
    width={r * 2}
    height={r * 2}
  >
    <div className="w-full h-full flex items-center justify-center">
      <Wallet size={14} className="text-green-400/50" />
    </div>
  </foreignObject>
  <text ...>€{inc.amount.toLocaleString()}</text>
</g>
```

### Change 3: Render ALL bills per day, not just first

Currently `p.bills[0]` is used (line 685), so only the first bill per day renders. When multiple bills land on the same day (like Phone + Salary on Mar 1), each should get its own marker. Loop over `p.bills` with the stagger system handling vertical offsets.

### Change 4: Ensure amount labels don't overlap markers

When a marker is staggered upward, its amount label should appear directly below the marker (not at a fixed terrain position). The label y-position should be `markerY + size.h + size.font + 2` which it already does, but verify this works correctly with stagger offsets.

## Implementation Order

1. Add `foreignObject` with icon inside expense blocks
2. Add `foreignObject` with icon inside income circles
3. Loop over all bills per day (not just index 0)
4. Verify stagger offsets apply to label positions correctly

## Files Changed
- `src/components/terrain/TerrainPath.tsx` only
