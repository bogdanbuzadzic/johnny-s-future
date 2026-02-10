

# Tetris Core Interactions - Trade-Off Sliders + "Can I Afford This?" Input

## Overview

Two focused additions to the My Money screen:
1. A budget slider inside expanded category blocks for real-time trade-off visualization
2. A permanently visible "Can I afford..." input row between the container and terrain

No complex gesture systems. No drag-between-zones, split/merge, or drop test overlay. The existing subscription pulse, spending timeline, and optimize features remain untouched.

---

## Part 1: Trade-Off Slider in Expanded Blocks

### File: `src/components/budget/CategoryBlock.tsx`

**New props needed:**
- `flexRemaining: number` -- current flex remaining (from TetrisContainer)
- `dailyAllowance: number` -- current daily allowance
- `daysRemaining: number` -- days remaining in month
- `onSliderChange: (id: string, newBudget: number) => void` -- called during drag for live preview
- `onSliderConfirm: (id: string, newBudget: number) => void` -- called on "Save"
- `onSliderCancel: (id: string) => void` -- called on "Cancel"
- `sliderActive: boolean` -- whether this block's slider is currently unsaved-changed
- `onExpandToggle: (id: string) => void` -- to notify parent which block is expanded (for single-unsaved-change rule)

**New state inside the block:**
- `sliderValue: number` -- tracks the live slider position (initialized to `budget`)
- `hasSliderChange: boolean` -- true when slider has moved from original
- `originalBudget: number` -- snapshot of budget when slider interaction starts

**Slider UI (inserted at top of expanded area, above subscription info and timeline):**
- Full width of expanded block
- Track: 4px tall, rounded, white/15 background
- Thumb: 24px circle, white fill, subtle shadow, 2px border in category tint color
- Left label: "EUR0" in 10px white/20
- Right label: "EUR[maxPossible]" in 10px white/20 where `maxPossible = budget + flexRemaining`
- Above slider: "EUR[sliderValue]" in 18px bold white, updates live
- Below slider: impact text showing daily allowance delta, e.g., "EUR44/day -> EUR38/day" in 12px white/40 (green when improving, white/40 when worsening)
- Confirmation row (appears when `hasSliderChange`): "Set [name] budget to EUR[value]?" with "Save" purple pill and "Cancel" white/40 text

**Slider implementation:**
- Uses a native `input[type=range]` styled with CSS, or Radix Slider component (already installed: `@radix-ui/react-slider`)
- `min={0}`, `max={budget + flexRemaining}`, `step={5}`
- `onValueChange` updates `sliderValue` state and calls `onSliderChange(id, newValue)` for live container preview
- Debounce terrain recalc to 100ms via the parent
- "Save" calls `onSliderConfirm(id, sliderValue)` which persists via `updateCategory`
- "Cancel" resets `sliderValue` to `originalBudget`, calls `onSliderCancel(id)`

**Auto-balance suggestion:**
- When `sliderValue > budget` and `(flexRemaining - (sliderValue - budget))` < 10% of flexBudget:
  - Find the expense category with the largest remaining budget (excluding current)
  - Show suggestion row: "[icon] Reduce [name] by EUR[amount] to balance?" as tappable text
  - Tapping calls a callback `onSuggestRebalance(targetCategoryId, suggestedAmount)` to expand that block with pre-set slider

**Expanded block layout (top to bottom):**
1. Slider with live budget amount + impact text
2. Confirmation row (if slider changed)
3. Subscription annual cost (if hasRecurring) -- existing
4. Mini spending timeline -- existing
5. Progress bar -- existing
6. Transaction list -- existing
7. "What if I cancel?" -- existing (if hasRecurring)
8. "Edit name" link at bottom (new, subtle text)

### File: `src/components/budget/TetrisContainer.tsx`

**New state:**
- `activeSliderBlockId: string | null` -- which block currently has an unsaved slider change
- `sliderPreviewBudgets: Record<string, number>` -- live budget overrides during slider drag (keyed by category id)

**Block layout recalculation:**
- When `sliderPreviewBudgets` has entries, use those values instead of actual budgets for layout computation
- This makes block widths and empty space update live during drag

**Empty space recalculation:**
- `effectiveFlexRemaining` = `flexRemaining - sum(sliderPreviewBudgets[id] - actualBudget[id])` for all preview entries
- Pass this to the empty space display instead of raw `flexRemaining`

**Daily allowance delta:**
- Compute `previewDailyAllowance = effectiveFlexRemaining / daysRemaining`
- Pass both `dailyAllowance` and `previewDailyAllowance` to CategoryBlock for the impact text

**Handlers passed to CategoryBlock:**
- `onSliderChange(id, newBudget)`: updates `sliderPreviewBudgets` state, debounces terrain update
- `onSliderConfirm(id, newBudget)`: calls `updateCategory(id, { monthlyBudget: newBudget })`, clears preview
- `onSliderCancel(id)`: clears `sliderPreviewBudgets[id]`, clears `activeSliderBlockId`
- `onExpandToggle(id)`: if `activeSliderBlockId` exists and is different, auto-cancel that slider first

**Single-unsaved-change rule:**
- When a new block expands via tap, if another block has `activeSliderBlockId`, that block's slider auto-cancels (reverts to original)

---

## Part 2: "Can I Afford This?" Input Row

### File: `src/components/screens/MyMoneyScreen.tsx`

**New state:**
- `affordTestAmount: number` -- the amount being tested (0 when empty)
- `affordTestCategoryId: string | null` -- selected category for the test
- `affordTestInput: string` -- raw input string

**New UI element between TetrisContainer and TerrainPath:**
- A frosted glass input row (white/12, rounded-2xl, 44px tall, full width)
- Left: FlaskConical icon (18px, white/40)
- Center: EUR prefix (white/40) + text input, placeholder "Can I afford EUR..." in 14px white/25
- Right: category picker pill -- shows icon + abbreviated name of selected category. Tapping opens a horizontal scroll row of all category pills below the input. Default: first expense category (or most-used if transaction data exists)
- When amount > 0, two buttons fade in below:
  - "Buy it" -- small purple gradient pill, 36px tall
  - "Clear" -- small frosted glass pill, 36px tall, white/30 text

**Props passed down:**
- Pass `affordTestAmount` and `affordTestCategoryId` to `TetrisContainer` as `ghostTestAmount` and `ghostTestCategoryId`
- Pass `affordTestAmount` to terrain for daily allowance delta display

**"Buy it" action:**
- Opens AddTransactionSheet with pre-filled amount and category
- Need to add `prefillAmount` and `prefillCategoryId` props to AddTransactionSheet

**"Clear" action / empty input:**
- Sets `affordTestAmount` to 0, clears input
- Ghost block dissolves, everything reverts

**Result text logic (replaces placeholder when amount > 0):**
- Compute `testRemaining = flexRemaining - affordTestAmount`
- `testRatio = testRemaining / flexBudget`
- If testRatio > 0.3: "Yes, comfortably" in green
- If testRatio 0.1-0.3: "Yes, but it'll be tighter" in white
- If testRatio 0-0.1: "Tight. EUR[dailyLeft]/day left for [daysRemaining] days" in amber
- If testRatio < 0: "EUR[shortage] over budget" in amber

### File: `src/components/budget/TetrisContainer.tsx`

**New props:**
- `ghostTestAmount?: number` -- amount being tested
- `ghostTestCategoryId?: string` -- category for the ghost

**Ghost block rendering:**
- When `ghostTestAmount > 0` and `ghostTestCategoryId` exists:
  - Find the matching category block in the layout
  - Inside that block, overlay a ghost fill on top of the existing spending fill
  - Ghost fill: category tint at 15%, with a dashed pulsing border (2px dashed, tint at 40%, CSS animation pulse 2s)
  - The ghost fill width = `(ghostTestAmount / budget) * blockWidth`, stacked after the spending fill
- Empty space shrinks: subtract `ghostTestAmount` from effective flex remaining
- Update the "EUR to spend" text to show "EUR[adjusted] to spend" with dimmer opacity + "testing EUR[amount]" annotation

**Johnny reaction to ghost:**
- Same space ratio logic already exists; it reacts naturally because `effectiveFlexRemaining` decreases

**Daily allowance delta above terrain:**
- Show "EUR[current]/day -> EUR[new]/day" when ghost is active

### File: `src/components/budget/AddTransactionSheet.tsx`

**New optional props:**
- `prefillAmount?: number`
- `prefillCategoryId?: string`

**On open with prefill:**
- Initialize `amountValue` to `prefillAmount.toString()` if provided
- Initialize `selectedCategoryId` to `prefillCategoryId` if provided

### File: `src/components/budget/CategoryBlock.tsx`

**New optional props for ghost:**
- `ghostAmount?: number` -- amount of ghost fill to show in this block

**Ghost fill rendering:**
- When `ghostAmount > 0`:
  - Render a second fill bar after the spending fill
  - Position: starts at `spent/budget * 100%` width, extends by `ghostAmount/budget * 100%`
  - Style: category tint at 15%, with animated dashed border overlay
  - CSS keyframe: border opacity pulses 20% to 50% over 2s, infinite

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/components/budget/CategoryBlock.tsx` | Add slider UI in expanded area, ghost fill overlay, new props for flex data and callbacks |
| `src/components/budget/TetrisContainer.tsx` | Slider preview state, ghost block rendering, effective flex remaining calculations, new props |
| `src/components/screens/MyMoneyScreen.tsx` | "Can I afford" input row, ghost state management, pre-fill FAB flow |
| `src/components/budget/AddTransactionSheet.tsx` | Add prefillAmount and prefillCategoryId optional props |

---

## Implementation Order

1. Update `CategoryBlock.tsx`: add slider + ghost fill props and UI
2. Update `TetrisContainer.tsx`: add slider preview state, ghost props, effective flex calculations
3. Update `MyMoneyScreen.tsx`: add the "Can I afford" input row between container and terrain
4. Update `AddTransactionSheet.tsx`: add prefill props

