

# My Money Tetris - Three Fixes

## Fix 1: Full-Width Vertical Stack Layout

### File: `src/components/budget/TetrisContainer.tsx`

**Replace the bin-packing `blockLayout` calculation (lines 227-257)** with a simple vertical stack:

- Sort `expenseCategories` by budget descending (biggest first)
- Each block gets `width = containerInnerWidth` (full width)
- Block height is proportional to budget:
  - `totalFlexZoneHeight` = container height minus fixed bar, savings bar, and empty space minimum
  - `proportionalHeight = (categoryBudget / flexBudget) * totalFlexZoneHeight`
  - `blockHeight = clamp(proportionalHeight, 52, 120)`
- Gap: 6px between blocks

**Replace the row-based rendering (lines 360-425)** with a simple vertical map:

- No more `blockLayout.rows.map` with nested `row.map`
- Single flat list: `sortedBlocks.map(block => <CategoryBlock ... />)` with `mb-1.5` spacing
- Each block gets `width={containerInnerWidth}` and `height={computedHeight}`

**Recalculate `blockRowsHeight` and `emptySpaceHeight`** based on new per-block heights summed vertically.

**Add "Add category" dashed block** after the last category block:

- Full width, 48px tall, 2px dashed white/15 border, transparent bg, rounded-2xl
- Center: Plus icon (20px, white/30) + "Add category" text (14px, white/30)
- Local state `addingCategory: boolean` to toggle inline form
- On tap, the block expands (spring 300ms) to ~200px showing:
  - Icon picker: horizontal scroll of 36px circle pills with icons (UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, Gift, BookOpen, Smartphone, Shirt, MoreHorizontal). Tap selects (purple border). One selected at a time.
  - Name input: frosted glass text field, placeholder "Category name", 14px
  - Budget input: "EUR" prefix + number input, 18px bold white
  - Color dot: auto-assigned from tint color map based on icon/name
  - "Create" button: purple gradient pill, full width, 40px, disabled until all filled
  - "Cancel" text below in white/30, collapses form
- On Create: calls `addCategory({ name, icon, tintColor, monthlyBudget, type: 'expense' })`, collapses form, new block appears with drop-in animation

### File: `src/components/budget/CategoryBlock.tsx`

- The `width` prop now always equals container width -- no changes needed, it already uses `style={{ width }}`
- The `height` prop changes to reflect proportional height -- already used as `minHeight`

---

## Fix 2: Add Category Inline Form

Handled inside `TetrisContainer.tsx` as described above. New local state:

- `addingCategory: boolean`
- `newCatIcon: string`
- `newCatName: string`
- `newCatBudget: string`

Icon-to-tint mapping reuses the existing `CATEGORY_TINTS` from `CategoryBlock.tsx` plus a fallback mapping for icons that don't match category names.

---

## Fix 3: Always-Visible Slider on Every Block

### File: `src/components/budget/CategoryBlock.tsx`

**Add a slim slider track at the bottom of every block (collapsed state):**

- Below the content div (icon + name + spent/budget), inside the block but always visible
- Track: 3px tall, full width with 12px padding each side, category tint at 20% opacity, rounded
- Filled portion: represents `spent / budget` progress (same color as spending fill)
- Draggable thumb: 16px circle, white fill, 2px category tint border, subtle shadow
- Thumb position: represents budget amount on 0 to maxPossible scale

**Thumb drag behavior:**
- Uses Radix Slider (already imported) in a compact form
- `onValueChange` calls `onSliderChange(id, newValue)` for live preview
- During drag, show a floating label above the thumb: frosted pill (white/20, 28px tall) with "EUR[value]" in 14px bold white, plus "EUR[daily]/day" in 10px white/30 below
- On release (onValueCommit or pointer up): show inline confirmation replacing the spent/budget text: "Set to EUR[new]?" with Check icon (green) and X icon (white/30)
- Check confirms (saves), X cancels (reverts)
- Auto-cancel after 3 seconds with no action

**Remove the slider from the expanded area:**
- The expanded section no longer includes the large slider, the "EUR[value]" heading, min/max labels, or confirmation row
- Keep: subscription info, spending timeline, progress bar, transactions, cancel sim, edit name

**Expanded block layout becomes:**
1. Subscription annual cost (if hasRecurring)
2. Mini spending timeline
3. Progress bar (3px)
4. Transaction list
5. "What if I cancel?" (if hasRecurring)
6. "Edit name" link

The slider thumb on the collapsed block must not trigger the expand/collapse tap. Use `onClick stopPropagation` on the slider area and `onPointerDown` to differentiate slider interaction from block tap.

### File: `src/components/budget/TetrisContainer.tsx`

- All existing slider preview state (`sliderPreviewBudgets`, `activeSliderBlockId`, handlers) remains the same
- The data flow is identical; only the UI location of the slider moves from inside expanded to the block's bottom edge

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/components/budget/TetrisContainer.tsx` | Replace bin-packing with vertical stack, add "Add category" inline form, update height calculations |
| `src/components/budget/CategoryBlock.tsx` | Add always-visible slim slider at block bottom, remove slider from expanded area, add confirmation UX |

