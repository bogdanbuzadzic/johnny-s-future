

# My Money - Prompt 4: Tap to Expand & Trade-Off Slider

## What This Does

Adds tap-to-expand behavior to spending blocks. Tapping a block reveals a budget slider, impact text, confirmation buttons, and a recent transaction list inside it. Only one block expanded at a time.

## Changes (only `MyMoneyScreen.tsx`)

### New State

- `expandedId: string | null` -- which block is currently expanded
- `sliderValue: number` -- current slider position for the expanded block
- `originalBudget: number` -- the budget value when expansion started (for cancel/revert)

### Block Rendering Changes

Each block switches from a plain `div` to a `motion.div` (Framer Motion) for animated height.

- **Collapsed height**: same as current `blockHeight(budget)` calculation
- **Expanded height**: collapsed height + 220px
- **Animation**: `animate={{ height }}` with `transition={{ type: 'spring', duration: 0.3, damping: 25 }}`
- **onClick**: toggles `expandedId`. If expanding a new block while another is expanded, the old one auto-collapses and any unsaved slider changes revert.

### Expanded Content (rendered inside the block when expanded)

Wrapped in `AnimatePresence` with fade in/out (150ms). Stacked below the existing icon/name/amount row with a thin divider (`1px solid white/5`).

1. **Budget Slider**
   - HTML `<input type="range">` styled with CSS (or a custom slider using pointer events)
   - Track: full width minus 24px padding, 6px tall, white/10 background, filled portion in category tint at 35%
   - Thumb: 28px circle, white fill, 2.5px border in tint color, shadow
   - Range: min=0, max=currentBudget + flexRemaining
   - Live value label above: current value in 18px bold white
   - End labels: "EUR0" and "EUR[max]" in 10px white/15
   - On drag: updates `sliderValue` state, which feeds into:
     - Impact summary row shows adjusted `flexRemaining` and `dailyAllowance` (computed as: `realFlexRemaining - (sliderValue - originalBudget)` and divide by `daysRemaining`)
     - Block height recalculates proportionally using `sliderValue` instead of `cat.monthlyBudget`

2. **Impact Text** (13px white/60)
   - Compares `sliderValue` vs `originalBudget`
   - Decreased: green text showing freed amount and new daily
   - Increased: amber text showing tightened budget and new daily
   - Unchanged: "Drag the slider to adjust this budget" in white/25

3. **Confirmation Buttons** (only when `sliderValue !== originalBudget`)
   - "Save": purple gradient pill, calls `updateCategory(id, { monthlyBudget: sliderValue })`, updates `originalBudget` to match
   - "Cancel": white/10 pill, resets `sliderValue` to `originalBudget`

4. **Transaction List**
   - Pulls transactions from context where `categoryId` matches and date is current month
   - Sorted newest first, max 4 shown
   - Each row: description (13px white/60), date below (10px white/25), amount right (13px white/50)
   - Dividers between rows (1px white/5)
   - Empty: "No spending yet" centered in 12px white/20

### Impact Summary Row (live updates)

When a slider is being dragged, the impact summary temporarily shows adjusted values:
- `adjustedRemaining = flexRemaining - (sliderValue - originalBudget)`
- `adjustedDaily = adjustedRemaining / daysRemaining`

When no block is expanded or slider is at original, show real computed values from context.

### Fill Behavior in Expanded State

The fill percentage stays `spent / budget` but uses `sliderValue` as the budget when that block is expanded and slider has moved. The fill div continues to sit behind all content with the same absolute positioning.

### Auto-Cancel on Collapse

When `expandedId` changes (user taps different block or same block), if previous block had unsaved changes, revert: set `sliderValue` back. Since state is local and `updateCategory` was never called, context data is already correct.

## Technical Notes

- Import `motion, AnimatePresence` from `framer-motion`
- Import `format, parseISO, isToday, isYesterday` from `date-fns` for transaction date display
- Use `transactions` and `updateCategory` from `useBudget()` (already available in context)
- The slider uses a custom styled `<input type="range">` with CSS appearance reset and custom thumb/track styles via inline styles
- `daysRemaining` is available from `useBudget()`
- Only `MyMoneyScreen.tsx` changes. No other files modified.

