

# Interactive Tetris Features - Implementation Plan

## Scope Assessment

This prompt contains 8 major features with extensive gesture handling, drag-and-drop physics, and real-time visual feedback. Implementing all 8 at once risks breaking the existing working UI. The plan sequences them in priority order, with each batch building on the previous.

---

## Batch 1: Foundation (Features 5, 6, 8)

These are self-contained visual enhancements that don't require new gesture systems.

### Feature 5: Subscription Block Pulse

**File: `src/components/budget/CategoryBlock.tsx`**

- Check if the category has any recurring transactions (pass `hasRecurring` boolean as prop from TetrisContainer)
- Add a CSS keyframe animation on the block's background opacity: 15% to 35% to 15% over 3 seconds, infinite
- Add a small `RefreshCw` icon (10px, white/20) in the top-right corner when `hasRecurring` is true
- In the expanded view, add above the transaction list:
  - "EUR[monthly] /month = EUR[annual] /year" line (annual = monthly * 12)
  - "EUR[daily] every single day" (daily = monthly / 30)
  - "= [X] hours of work per year" (if monthlyIncome > 0: annual / (monthlyIncome / 160))
- Add a "What if I cancel?" row with Scissors icon:
  - Tapping sets a local `cancelSimActive` state
  - Block fades to 30% opacity with dashed outline
  - Green text shows "+EUR[monthly]/month freed up, +EUR[annual]/year saved"
  - Two buttons: "Actually cancel" (sets budget to 0, collapses block as dormant) and "Just checking" (reverts visual)

**File: `src/components/budget/TetrisContainer.tsx`**

- Compute `hasRecurring` per category by checking if any transaction in that category has `isRecurring: true`
- Pass it as a prop to `CategoryBlock`

### Feature 6: Block Spending Timeline

**File: `src/components/budget/CategoryBlock.tsx`**

- In the expanded section, above the transaction list, render a mini SVG area chart (48px tall, full block width)
- Data: iterate days 1 to current day of month, accumulate spending per day for this category
- Render as a step-line (horizontal segments between transactions, vertical jumps on transaction days)
- Fill below the line with category tint at 20%
- Horizontal dashed line at budget level; area above it turns amber if crossed
- Small dot at today's position on the line

### Feature 8: Shake to Optimize (Sparkles Button)

**File: `src/components/screens/MyMoneyScreen.tsx`**

- Add a Sparkles icon button (32px frosted glass circle) in the header, next to Sliders
- Tapping sets `optimizeMode: true` state

**File: `src/components/budget/TetrisContainer.tsx`**

- Accept `optimizeMode` prop
- When true: blocks get a wobble animation (random translateY -2 to 2px, 500ms)
- After 1 second, compute suggestions:
  - For each category, compare budget vs average spending (spent / fraction of month elapsed)
  - If average projected spend < 60% of budget, suggest reducing to 120% of projected
  - Difference goes to savings
- Show overlay card: "Johnny suggests..." with the suggestion text and impact
- "Apply" button updates category budgets and savings target via BudgetContext
- "No thanks" reverts blocks to original positions
- If < 10 transactions total, show "Keep tracking..." message instead

---

## Batch 2: Drag Infrastructure (Features 1, 2)

### Feature 2: Block Push on Resize

**File: `src/components/budget/CategoryBlock.tsx`**

- Add a resize handle indicator: when touch/mouse is within 12px of the block's bottom edge, show three horizontal lines (white/20)
- On drag of the bottom edge (detect via `onPointerDown` near bottom 12px):
  - Track delta Y, convert to budget delta based on pixels-per-euro ratio
  - Call a new `onResize(id, budgetDelta)` callback prop

**File: `src/components/budget/TetrisContainer.tsx`**

- Implement `handleBlockResize(id, budgetDelta)`:
  - Increase the resized block's budget by `budgetDelta`
  - Find adjacent blocks (same row to the right, or next row) and decrease their budgets proportionally
  - Adjacent blocks get an amber tint pulse during the drag
  - Show a connecting line label: "+EUR20 / -EUR20"
  - On release: save both budgets, show a 3-second "Undo" toast
  - Store previous budgets for undo

### Feature 1: Drag Between Zones

**File: `src/components/budget/TetrisContainer.tsx`**

- Add gesture detection on category blocks:
  - Tap (instant): expand/collapse (existing)
  - Long-press 300ms: lift block for dragging (scale 1.05, shadow, position follows pointer)
- During drag:
  - Track pointer Y position relative to container zones
  - If block crosses into savings zone (Y < fixedBarHeight + savingsBarHeight), highlight savings zone with green/15 glow
  - On drop in savings zone: show confirmation bubble with "Confirm" and "Cancel"
  - On confirm: set category budget to 0, increase `monthlySavingsTarget` by that amount via `updateConfig`
  - Block becomes "dormant": 24px height, white/8 bg, "[name] - paused" text, tap to reactivate
- Savings zone long-press:
  - Show amount picker: inline number input with preset pills (EUR25, EUR50, EUR100, All)
  - On confirm: decrease `monthlySavingsTarget`, the freed amount becomes available flex space
  - Show toast: "EUR[amount] moved from savings"

**File: `src/context/BudgetContext.tsx`**

- No schema changes needed; `updateConfig` and `updateCategory` already exist

---

## Batch 3: Drop Test (Feature 4)

### Feature 4: "Can I Afford This?" Drop Test

**File: `src/components/screens/MyMoneyScreen.tsx`**

- Add a secondary FAB: 40px frosted glass circle with FlaskConical icon, positioned left of the main FAB
- Tapping sets `dropTestMode: true`

**New file: `src/components/budget/DropTestOverlay.tsx`**

- Renders when `dropTestMode` is true
- Shows a floating test block at the bottom of the screen with dashed pulsing border
- Amount input: inline 18px number input + quick pills (EUR20, EUR50, EUR100, EUR200, EUR500)
- Category selector: horizontal scroll of category pills from BudgetContext
- Test block resizes proportionally as amount changes, takes on category tint color
- User drags the test block upward into the container:
  - **Fits** (flexRemaining >= amount): block lands with bounce, green "Yes, you can afford this!", shows daily allowance delta, "Buy it" / "Never mind" buttons
  - **Tight** (fits but dailyAllowance drops below EUR20): wobble landing, amber "Tight but doable", same buttons
  - **Rejected** (flexRemaining < amount): block bounces off, container shakes (CSS animation 300ms), amber text "EUR[shortage] short", "Buy it anyway" / "Never mind" / "Adjust budget" buttons
- "Buy it" / "Buy it anyway": calls `addTransaction` and closes overlay
- "Never mind": dissolves test block, reverts everything
- "Adjust budget": scrolls to the suggested category block

---

## Batch 4: Split/Merge and Goals (Features 3, 7)

### Feature 3: Split and Merge Blocks

**File: `src/components/budget/CategoryBlock.tsx`**

- Long-press 600ms (differentiated from 300ms drag lift): show split handle
  - Horizontal dashed line across block middle with Scissors icon
  - Drag handle up/down to adjust ratio, preview labels show split amounts
  - On release: call `onSplit(id, ratio)` callback

**File: `src/components/budget/TetrisContainer.tsx`**

- `handleSplit(id, ratio)`:
  - Get original category, compute two new budgets based on ratio
  - Update original category's budget to the top portion
  - Call `addCategory` for the new bottom portion with auto-name "[name] 2"
  - Show inline rename input on the new block
- Merge detection:
  - During block drag (from Feature 1), if a dragged block overlaps >50% with another block, highlight bottom block with white/20 glow
  - On drop: show merge confirmation bubble with combined name suggestion
  - On confirm: update first category's budget to combined total, reassign transactions from second category to first, delete second category

### Feature 7: Goal Blocks Floating Above Container

**File: `src/components/budget/TetrisContainer.tsx`**

- Above the container div, render a horizontal scrollable row of goal blocks
- Each goal: 80px wide, 36px tall, rounded, icon + name + 2px progress bar
- SVG curved tether lines from each goal down to the savings zone
- Goal block Y-offset is inversely proportional to progress: 100% = sitting on container edge, 0% = 16px above
- When savings change (via Feature 1 or resize), animate goal positions
- Tap a goal block: call `setActiveTab(2)` and `setSelectedGoalId(goal.id)` to navigate to Goals screen

**File: `src/context/AppContext.tsx`**

- No changes needed; `goals`, `setActiveTab`, `setSelectedGoalId` already exist

---

## Gesture Priority System

Implemented in `CategoryBlock.tsx` via a unified pointer event handler:

```text
onPointerDown:
  - Check if pointer is within 12px of bottom edge -> start resize mode
  - Otherwise start a timer:
    - 300ms: enter drag mode (lift block)
    - 600ms: cancel drag mode, enter split mode (show handle)

onPointerUp before any timer:
  - It's a tap -> toggle expand

onPointerMove after 300ms timer:
  - It's a drag -> reorder / zone transfer / merge detection
```

Each mode is mutually exclusive. The resize handle visual indicator (three lines at bottom edge) helps users discover the resize gesture without accidentally triggering it.

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/components/budget/CategoryBlock.tsx` | Subscription pulse, spending timeline, resize handle, split handle, gesture priority system |
| `src/components/budget/TetrisContainer.tsx` | Zone drag, block push resize, split/merge, optimize mode, goal tethers, dormant blocks |
| `src/components/screens/MyMoneyScreen.tsx` | Sparkles button, FlaskConical FAB, drop test mode state, optimize mode state |
| `src/components/budget/DropTestOverlay.tsx` | New file -- floating test block UI with drag + outcome logic |

---

## Implementation Order

1. Feature 5: Subscription pulse + annual cost + cancel simulation (CategoryBlock)
2. Feature 6: Spending mini-timeline in expanded blocks (CategoryBlock)
3. Feature 8: Sparkles optimize button + suggestion logic (MyMoneyScreen + TetrisContainer)
4. Feature 2: Resize handle + push neighbors (CategoryBlock + TetrisContainer)
5. Feature 1: Long-press drag between zones + dormant blocks (TetrisContainer)
6. Feature 4: Drop test overlay + outcomes (new DropTestOverlay + MyMoneyScreen)
7. Feature 3: Split + merge blocks (CategoryBlock + TetrisContainer)
8. Feature 7: Floating goal blocks with tethers (TetrisContainer)

Each batch builds on the previous without breaking existing functionality.

