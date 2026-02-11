

# My Money - Prompt 6: "Can I Afford" Input

## What This Does

Adds a "Can I afford" input row between the header and the goal cards. Typing an amount shows a ghost fill on the selected category's block, displays an affordability answer, and lets the user "Buy it" (pre-filling the Add Transaction sheet).

## Changes (only `MyMoneyScreen.tsx`)

### New Import

- `FlaskConical` from `lucide-react`

### New State (in `MyMoneyContent`)

- `affordAmount: string` -- raw input string (digits + optional decimal)
- `affordCategoryId: string | null` -- selected category for the afford check; defaults to the category with the most remaining budget
- `showCategoryPicker: boolean` -- controls the dropdown popover

### Default Category

On mount (and when categories change), compute default `affordCategoryId` as the expense category with the highest `(monthlyBudget - spent)`.

### "Can I Afford" Input Row (new JSX)

Inserted below the header, above the goal cards row. Always visible.

- Frosted glass container: `rgba(255,255,255,0.12)`, `backdrop-blur: blur(12px)`, rounded 16px, 48px tall, full width
- Left: `FlaskConical` icon (18px). Color changes based on answer state (green/white/amber)
- Center: `<input type="text" inputMode="decimal">` styled inline. Placeholder: "Can I afford EUR..." in 14px white/25. When typing: "EUR" prefix in white/40 + number in 16px white
- Right: category picker pill -- shows selected category icon (16px) + abbreviated name (11px white/40), `rgba(255,255,255,0.10)` background, rounded-full, 32px tall
- Tapping the pill toggles `showCategoryPicker`. A small dropdown appears below it (frosted glass, rounded 12px, z-50) listing all expense categories as rows (icon + name). Tapping a row selects it and closes the dropdown.

### Answer Text

When `parseFloat(affordAmount) > 0`, calculate:
```
categoryRemaining = categoryBudget - categorySpent
flexRemainingAfter = flexRemaining - affordAmountNum
dailyAfter = flexRemainingAfter / daysRemaining
```

Display answer inline to the right of the EUR amount inside the input row, in 13px:
- `flexRemainingAfter > flexBudget * 0.30` AND within category: "Yes, comfortably" (green)
- `flexRemainingAfter > flexBudget * 0.10` AND within category: "Yes, but watch it" (white)
- `flexRemainingAfter > 0` AND within category: "Tight. EUR[daily]/day for [days] days" (amber)
- `flexRemainingAfter <= 0`: "EUR[over] over budget" (amber)

The FlaskConical icon color matches the answer color.

### Ghost Fill on Affected Block

When `affordAmountNum > 0`:
- Find the block matching `affordCategoryId`
- Render a "ghost" div stacked on top of the real spending fill:
  - Height: `(affordAmountNum / categoryBudget) * 100` percent of block height
  - Bottom position: immediately above the current fill top edge
  - Color: `rgba(255,255,255,0.15)` with a dashed top border (`2px dashed rgba(255,255,255,0.20)`)
  - Pulsing animation: opacity cycles 10%-20% over 2s (uses the existing `ghostPulse` keyframe from `ghost-pulse.css`)
  - Label inside: "+EUR[amount]" in 12px white/30, centered
- If ghost + real fill exceed 100%, the overflow portion gets amber tint (`rgba(255,159,10,0.20)`)
- All OTHER blocks get `opacity: 0.85` to dim them

### Goal Card Reactions

When `affordAmountNum > 0` and goals have contributions:
- Calculate how spending this amount affects goal timelines (same proportional logic as Prompt 5 but reversed -- spending more means goals take longer)
- Show amber "~X days later" labels (10px amber/40) below affected goal cards using the existing `AnimatePresence` floating label pattern

### Action Buttons

When `affordAmountNum > 0`, two buttons fade in below the input row with 8px gap:

- "Buy it": 120px wide, 36px tall, purple gradient, white text 13px, rounded 12px. Tapping opens `AddTransactionSheet` with `prefillAmount={affordAmountNum}` and `prefillCategoryId={affordCategoryId}`. On sheet close after save: clear `affordAmount`, ghost dissolves, blocks restore opacity, goal labels disappear.
- "Clear": 80px wide, 36px tall, white/10 bg, white/30 text, rounded 12px. Clears `affordAmount` to empty string.

### Changing Category While Amount Entered

When user selects a different category from the picker while an amount is typed:
- Ghost fill moves from old block to new block (the old one loses ghost, new one gains it -- React re-render handles this naturally since ghost rendering is conditional on `cat.id === affordCategoryId`)
- Answer recalculates based on new category's remaining budget

### Clear Triggers

Ghost + answer clear when:
- User deletes all text (backspace to empty)
- User taps "Clear"
- After successful "Buy it" transaction
- Input blurs AND value is empty

Ghost + answer do NOT clear when:
- Category changes (ghost moves instead)
- User taps input to edit number

### Layout Order (top to bottom)

1. Header
2. "Can I afford" input row (NEW)
3. Action buttons ("Buy it" / "Clear") -- only when amount > 0 (NEW)
4. Goal cards row (existing)
5. Container with flow lines (existing)
6. Impact summary row (existing)
7. FAB (existing)

## Technical Notes

- The ghost fill CSS animation uses the already-imported `ghost-pulse.css` keyframe (`ghostPulse`).
- The `AddTransactionSheet` already accepts `prefillAmount` and `prefillCategoryId` props and handles them in a `useEffect` on open.
- The input uses `inputMode="decimal"` for mobile numeric keyboard and validates input to only allow digits and one decimal point via an `onChange` handler.
- The category picker dropdown uses absolute positioning relative to the input row, with z-index 50.
- No other files are modified.
