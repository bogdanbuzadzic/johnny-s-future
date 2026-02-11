

# My Money Screen - Complete Rebuild

## Overview

Tear down and rebuild the My Money screen (tab 2) with a fundamentally new layout: a 2D horizontal container where spending blocks fill from the LEFT as columns and goal blocks fill from the RIGHT, with a gap in between showing Johnny and flex remaining. This replaces the current vertical stack.

## Architecture

Three files change significantly:

| File | Action |
|------|--------|
| `src/components/screens/MyMoneyScreen.tsx` | Rewrite -- new layout order, mode toggle, impact summary, Johnny tip |
| `src/components/budget/TetrisContainer.tsx` | Rewrite -- 2D horizontal container with spending columns (left) + goal columns (right) + gap |
| `src/components/budget/CategoryBlock.tsx` | Rewrite -- tall vertical column with icon/name/amount stacked vertically, bottom-up spending fill, vertical slider on right edge |

Two files get minor updates:

| File | Action |
|------|--------|
| `src/components/budget/AddTransactionSheet.tsx` | No changes needed (prefill already works) |
| `src/context/AppContext.tsx` | Read goals from here -- no changes needed |

## Screen Layout (top to bottom)

1. **"Can I afford" input** (moved to top, always visible)
2. **Mode toggle** ("My Month" / "What If")
3. **The 2D Tetris Container** (50-55vh, the core visual)
4. **Impact Summary row**
5. **Johnny's Tip card**
6. **FAB** (fixed bottom-right)

NO terrain/TerrainPath on this screen anymore.

## Technical Details

### MyMoneyScreen.tsx -- Full Rewrite

**Removed:** TerrainPath import and rendering, period toggle from header, Sparkles optimize button, terrain daily allowance delta section.

**New state:**
- `mode: 'month' | 'whatif'` -- mode toggle
- `period: 'month' | 'week'` -- moved inside container header
- Existing afford test state stays the same

**Layout order:**
1. "Can I afford" input row (existing logic, moved to top below header)
2. Mode toggle: two frosted pills centered, "My Month" (white/20 when selected) and "What If" (purple/15 + Sparkles icon when selected)
3. TetrisContainer (passes `mode`, `period`, goals from AppContext)
4. Impact summary row (frosted glass, 36px): flex remaining | pace pill | daily allowance. In What If mode: before/after with goal timeline impact
5. Johnny's Tip card with dynamic tips referencing user data
6. FAB (existing)

### TetrisContainer.tsx -- Full Rewrite

**New props:**
- `mode: 'month' | 'whatif'`
- `goals: Goal[]` (from AppContext)
- `ghostTestAmount`, `ghostTestCategoryId` (existing)

**Container dimensions:**
- Width: `window.innerWidth - 24` (capped at 400)
- Height: 50-55% of viewport
- Background: white/5, border 2px white/20, rounded 20px, inner glow
- In What If mode: pulsing dashed border

**Inside the container (top to bottom):**

1. **Fixed expenses bar** (32px, top): Lock icon + inline "Rent 450 . Electric 60" + "Fixed: EUR[total]"
2. **Main zone** (full remaining height minus fixed and savings bars):
   - **Spending columns** pack from LEFT edge
   - **Goal columns** pack from RIGHT edge  
   - **Gap** in the middle with Johnny
3. **Savings bar** (32px, bottom): PiggyBank icon + "Savings EUR[amount]/mo"

**Spending column sizing:**
- Each column width = `(categoryBudget / flexBudget) * availableWidth`
- Minimum width: 60px
- Column height: full zone height (~316px)
- Columns sit side by side left to right
- Sort: by budget descending

**Goal column sizing:**
- Each goal width = `(goal.monthlyContribution / totalGoalContributions) * savingsTarget` scaled to container
- Goals fill from right edge leftward
- Dashed border (aspirational feel), purple tint at 15%
- Content: goal icon, name, circular progress ring (40px), saved/target, monthly contribution
- Fill from bottom: green at 20% representing progress
- NO slider on goals -- they resize automatically when spending changes

**The Gap:**
- Space between rightmost spending column and leftmost goal column
- Johnny (40px) centered vertically in gap
- "EUR[flexRemaining]" above Johnny, "EUR[daily]/day" below
- When gap shrinks to 0: amber glow at collision, Johnny squeezed (only head visible)

**Column block content (stacked vertically in each column):**
- Top: Lucide icon (18px)
- Name (11px, 2 lines max)
- "EUR[spent]" (16px bold)
- "of EUR[budget]" (10px)
- Spending fill rises from BOTTOM
- Vertical slider track on RIGHT edge (3px wide, full height)
  - Thumb: 16px circle, white, category tint border
  - Drag UP = increase budget (column widens, goals shrink)
  - Drag DOWN = decrease budget (column narrows, goals grow)
  - Floating label during drag
  - Save/cancel on release with 3s auto-revert

**Weekly/Monthly toggle:** Small pills inside the container top area, only affects spending blocks.

**"+" add category:** Small Plus circle (28px) at right edge of spending columns. In My Month: creates real category. In What If: creates simulated block (dashed, pulsing).

**What If mode extras:**
- X button on each spending block (top-right) to remove from simulation
- Tap goal to set target date, recalculate contribution
- "Save changes" button in impact summary to commit

### CategoryBlock.tsx -- Full Rewrite as Vertical Column

Completely different component -- a tall, narrow column instead of a wide, short row.

**Props:** id, name, icon, tintColor, budget, spent, width (column width), height (full zone height), transactions, slider callbacks, ghost amount, mode

**Visual structure (vertical, top-aligned):**
- Rounded 12px column, full height
- Background: tint at 30% + white/8
- Border: 1px solid tint at 25%
- Content stacked vertically: icon -> name -> spent -> "of budget"
- Spending fill: absolute positioned, rises from BOTTOM
- Vertical slider: 3px track on RIGHT edge, full height, thumb at budget position
- In What If mode: X button at top-right corner

**Vertical slider implementation:**
- Custom implementation since Radix Slider is horizontal-only
- Track: 3px wide div on right edge, full column height
- Thumb: positioned based on budget/maxPossible ratio (bottom=0, top=max)
- Drag handler: onPointerDown/Move/Up on the track area
- During drag: floating label next to thumb with "EUR[amount]"
- On release: inline "Save?" with check/X at top of column, 3s auto-revert

### GoalBlock -- New Component (inline in TetrisContainer)

Rendered for each goal with monthlyContribution > 0.

**Visual:**
- Full height column, rounded 12px
- Background: purple at 15% + white/5
- Border: 1px dashed white/15
- Content: goal icon, name, progress ring (40px), saved/target, monthly/mo
- Fill from bottom: green at 20% representing (saved/target)
- Fully funded: green glow

## Data Flow

- Spending blocks: `BudgetContext.expenseCategories` + transactions
- Goal blocks: `AppContext.goals` (read-only from this screen)
- Fixed bar: `BudgetContext.fixedCategories`
- Savings bar: `BudgetContext.config.monthlySavingsTarget`
- Container total width represents income
- When a spending slider changes: goal columns auto-resize because flex remaining changes

## Implementation Order

1. Rewrite `CategoryBlock.tsx` as a vertical column component with bottom-up fill and vertical slider
2. Rewrite `TetrisContainer.tsx` with 2D horizontal layout (spending left, goals right, gap middle)
3. Rewrite `MyMoneyScreen.tsx` with new layout order, mode toggle, impact summary, tips
4. Test: setup wizard still works, blocks render correctly, slider drag resizes columns, goals respond, afford input shows ghost

