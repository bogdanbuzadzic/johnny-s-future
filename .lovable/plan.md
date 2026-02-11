

# My Money - Block Sizing & Layout Fix

## What This Does

Transforms the spending blocks from a full-width vertical list into a 2D Tetris-like grid where each block's area is proportional to its budget. Adds colored accent stripes for stronger visual identity.

## Changes (only `MyMoneyScreen.tsx`)

### 1. Replace Vertical List with CSS Grid

Replace the `flex flex-col` block container (line 948) with a CSS Grid layout:

```
display: grid
grid-template-columns: repeat(auto-fill, minmax(80px, 1fr))
grid-auto-rows: minmax(60px, auto)
gap: 6px
padding: 8px
```

### 2. Size Tier Calculation

For each category, compute `colSpan` and `rowSpan` based on `sizeRatio = cat.monthlyBudget / flexBudget`:

| sizeRatio | colSpan | rowSpan | Visual |
|-----------|---------|---------|--------|
| > 0.25 | 3 | 2 | Huge block |
| > 0.15 | 2 | 2 | Large block |
| > 0.08 | 2 | 1 | Medium block |
| <= 0.08 | 1 | 1 | Small block |

Each block gets `grid-column: span X` and `grid-row: span Y`. The `height` calculation is removed -- blocks fill their grid cells naturally via `height: 100%`.

The expanded block overrides to `grid-column: 1 / -1` (full width) with a fixed height of `280px`, pushing other blocks down.

### 3. Accent Stripe

Each block gets a 4px wide vertical stripe on the LEFT edge:
- Rendered as a `position: absolute; left: 0; top: 0; bottom: 0; width: 4px` div
- Background: tint color at 50% opacity
- Border-radius: `16px 0 0 16px` (matches block's left corners)

Block border updated to `1.5px solid` at tint 25%.

### 4. Adaptive Block Content

Content layout adapts based on size tier:

**Large (colSpan >= 2, rowSpan >= 2):**
- Top-left: icon (18px) + name (14px)
- Top-right: spent (16px bold)
- Below spent: "of EUR[budget]" (11px white/35)
- Center: horizontal progress bar (full width - 24px, 4px tall, tint fill)

**Medium (colSpan 2, rowSpan 1):**
- Single row: icon (16px) + name (13px) + spent (14px bold)
- Second row: "of EUR[budget]" + short progress bar

**Small (colSpan 1, rowSpan 1):**
- Icon (16px) centered
- Spent (14px bold) centered
- "/EUR[budget]" (10px white/30)
- No name text (icon + accent color identify it)
- No progress bar (fill IS the progress)

### 5. Updated Color Map

Add `Gift: '#FFD700'` to `tintMap` (was `#FF6B9D`, now gold for distinction). All other tints unchanged. Background tint lowered to 20% (from 25-30%) so accent stripe pops more.

Block background gradient updated: `linear-gradient(135deg, tint@20%, rgba(255,255,255,0.06))`.

### 6. Fill, Ghost Fill, Expand -- Unchanged Logic

- Fill still rises from bottom with same color logic
- Ghost fill (Can I Afford) renders identically, just adapts to the block's grid size
- Expand: the block animates to `grid-column: 1 / -1` and height 280px. Other blocks reflow. On collapse, returns to original span/size.
- Slider, save/cancel, transactions list -- all unchanged
- Dimming other blocks during afford -- unchanged

### 7. Johnny Placement

Johnny renders after the grid (below all blocks, inside the main area). Same size-tier logic based on `spaceRatio`. The grid's natural flow leaves empty space at the bottom for Johnny when blocks don't fill the container.

### 8. Sorting

Blocks are sorted by budget descending (already the case via `sortedCategories`). In a grid, largest blocks appear first (top-left), smallest fill remaining gaps.

## Technical Notes

- The `blockHeight()` function is removed. Block heights are determined by grid row spans and `grid-auto-rows: minmax(60px, auto)`.
- Each block's `motion.div` gets `style={{ gridColumn: 'span X', gridRow: 'span Y', height: '100%' }}` with expansion overriding to `gridColumn: '1 / -1', height: 280`.
- The accent stripe is a simple absolute-positioned div inside each block -- no SVG needed.
- Content adaptation uses a `sizeTier` variable computed from `sizeRatio`, driving conditional rendering within the same block component.
- Only `MyMoneyScreen.tsx` is modified.

