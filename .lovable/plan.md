

# My Money - Prompt 7: Add Category Row & Johnny Mascot

## What This Does

Two additions inside the Tetris container: (A) an inline "Add category" form below the spending blocks, and (B) Johnny the piggy bank mascot in the remaining empty space. Also adds a Johnny's Tip card below the impact summary.

## Changes (only `MyMoneyScreen.tsx`)

### New Imports

- `Gift, BookOpen, Shirt, Wrench, Heart, ChevronDown` from `lucide-react` (additional icons for the icon picker)
- `johnnyImage` from `@/assets/johnny.png`
- `JohnnyTip` from `@/components/budget/JohnnyTip`

### New State

- `showAddCatForm: boolean` -- whether the inline add-category form is expanded
- `newCatIcon: string` -- selected icon name (empty string = none selected)
- `newCatName: string` -- typed category name (max 20 chars)
- `newCatBudget: string` -- typed budget amount (digits + decimal)
- `iconPickerFlash: boolean` -- briefly true if user taps Create without selecting an icon

### Extended Icon Maps

Add `Gift, BookOpen, Shirt, Wrench, Heart` to `budgetIconMap` and extend `tintMap` with:
- `Gift: '#FF6B9D'`
- `BookOpen: '#007AFF'`
- `Shirt: '#8B5CF6'`
- `Wrench: '#5AC8FA'`
- `Heart: '#FF6B9D'`

Define `addCatIconOptions` array: `['UtensilsCrossed', 'ShoppingBag', 'Bus', 'Film', 'Dumbbell', 'CreditCard', 'Coffee', 'Smartphone', 'Gift', 'BookOpen', 'Shirt', 'Wrench', 'Heart', 'MoreHorizontal']`

### A. Add Category Row

Rendered inside the container's main area, below the blocks (after the `sortedCategories.map(...)` loop), before the empty space.

**Collapsed state** (default):
- 48px tall, full width, dashed border (`2px dashed rgba(255,255,255,0.12)`), transparent bg, rounded 16px
- Center: `Plus` icon (20px, white/25) + "Add category" text (14px, white/25)
- 6px gap above (same as between blocks)
- `onClick`: sets `showAddCatForm = true`

**Expanded state** (`showAddCatForm = true`):
- `motion.div` animates height from 48px to ~240px (spring 300ms, damping 25)
- Same dashed border but now contains the form

**Form contents** (stacked vertically, 12px gaps, 12px padding):

1. **Icon Picker**: horizontal scrollable row of 40px circles. Each shows a Lucide icon (18px). Unselected: `rgba(255,255,255,0.08)` bg, white/40 icon. Selected: tint color at 20% bg, tint at 25% border, white/70 icon. 8px gap between circles.

2. **Name Input**: frosted glass field (`rgba(255,255,255,0.10)`, rounded 12px, 40px tall). Placeholder "Category name" (13px white/20). White text. Max 20 chars. Color dot preview (8px circle, tint at 60%) rendered to the right of the input.

3. **Budget Input**: same styling. Left "EUR" prefix (14px white/30). Placeholder "Monthly budget" (13px white/20). Numbers only. 16px bold white text. Warning text below if parsed value exceeds `flexRemaining`: "Only EUR[flexRemaining] available" in 11px amber/50.

4. **Buttons Row**: centered, 12px gap.
   - "Create" pill: 40px tall, ~120px wide, purple gradient. Disabled (gradient at 30% opacity) until icon + name + budget all filled. On tap: validates, calls `addCategory({ name, icon: newCatIcon, monthlyBudget: parsed, type: 'expense' })`, collapses form, resets fields, sets `flashCategoryId` to the new category's ID for the drop-in flash.
   - "Cancel" text: 13px white/30, resets all fields, collapses form.

**Note**: Since `addCategory` from BudgetContext auto-generates `id` and `sortOrder`, we just pass `{ name, icon, monthlyBudget, type }`. To get the new ID for flashing, we read `expenseCategories` after the state update.

### B. Johnny in the Empty Space

Rendered inside the container's main area, below the add-category row.

**Calculate empty space**: Estimate based on flex remaining as a proportion of the container. Use `flexRemaining / flexBudget` as the "space ratio" to determine Johnny's size tier.

**Size tiers** (based on available flex ratio):

| Condition | Johnny Size | Content |
|-----------|-------------|---------|
| `flexRemaining / flexBudget > 0.3` (large space) | 48px | Johnny + "EUR[flexRemaining] free" (14px white/25) + "EUR[daily]/day" (11px white/15) + idle bob |
| `0.1 < ratio <= 0.3` (moderate) | 36px | Johnny + "EUR[flexRemaining]" only + thought bubble (3 ascending circles) |
| `0 < ratio <= 0.1` (tiny) | 24px | Johnny only + sweat drop SVG teardrop |
| `flexRemaining <= 0` (overflow) | 20px peek | Johnny peeks from below container. Container gets amber glow `box-shadow: 0 -6px 20px rgba(255,159,10,0.25)`. "EUR[overAmount] over" text between container and impact summary. |

**Idle bob**: `motion.div` with `animate={{ y: [0, -4, 0] }}` on loop, 2s duration.

**Thought bubble**: Three `div` circles (3px, 5px, 8px) with white/10 bg, ascending to the right of Johnny. The 8px circle contains "..." in 7px white/20.

**Sweat drop**: Small SVG teardrop (6px wide) with white/25 fill, positioned top-right of Johnny.

**Reactions to "Can I Afford"**:
- "comfortably": normal happy state
- "tight" or "watch it": thought bubble appears
- "over budget": sweat drop appears, Johnny shifts down slightly

**Reactions to slider drag**: Johnny's size tier recalculates using `adjustedRemaining` instead of `flexRemaining` during drag, so Johnny visually shifts as space changes.

All position/size changes use `motion.div` spring transitions (400ms, damping 25).

### Updated Empty State (zero categories)

When `hasExpenses` is false, replace the current empty state with:
- Dotted grid pattern (existing)
- Johnny at center, 48px, idle bob
- Above: "Let's build your budget!" (16px white/25)
- Below: "Tap the + below to create your first category" (12px white/15)
- Animated `ChevronDown` (white/15, pulse 2s) pointing at the add-category row
- The add-category dashed row still renders below

### Johnny's Tip Card

Below the impact summary row, with 12px gap. Uses the existing `JohnnyTip` component:
```
<JohnnyTip tips={[
  "Try adjusting a category slider to see how it affects your goals.",
  "The gap between blocks is your breathing room. Keep it healthy!",
  "Small daily savings add up. Even EUR2/day is EUR60/month.",
]} />
```

### Layout Order (final, inside the scrollable area)

1. Header
2. "Can I Afford" input row
3. Action buttons (Buy it / Clear)
4. Goal cards row
5. Flow Lines + Container wrapper:
   - Fixed bar
   - Spending blocks
   - Add category row (NEW)
   - Johnny in empty space (NEW)
   - Savings bar
6. Over-budget text (if overflow, NEW)
7. Impact summary row
8. Johnny's Tip card (NEW)
9. FAB (fixed position)

## Technical Notes

- The `addCategory` function from `useBudget()` is already available -- just needs to be destructured.
- Johnny image is already imported in `JohnnyTip.tsx` as `@/assets/johnny.png` -- reuse same import.
- The ghost-pulse CSS animation already exists for the afford ghost fill.
- The add-category form stops click propagation to prevent interfering with block expand/collapse.
- Only `MyMoneyScreen.tsx` is modified. No other files change.
