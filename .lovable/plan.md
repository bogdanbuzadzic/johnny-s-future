

# My Money - Prompt 3: Block Fill & Add Transaction

## What Changes

Two additions to the existing My Money screen. No changes to container, fixed bar, savings bar, or impact summary layout.

### A. Spending Fill Inside Each Block

Add a colored rectangle inside each spending block that rises from the bottom based on spent/budget ratio.

**In `MyMoneyScreen.tsx`:**

- For each category block, calculate `fillPercent = Math.min((spent / budget) * 100, 110)` and render an absolutely positioned div at the bottom of the block
- Fill div: `position: absolute`, `bottom: 0`, `left: 0`, `width: 100%`, `height: fillPercent%`, with matching bottom border-radius (16px) and `0` top radius (unless fill is 100%+, then match all corners)
- Fill color logic:
  - 0-70%: category tint at 40% opacity
  - 70-90%: amber `#FF9F0A` at 35%
  - 90-100%: amber at 40%
  - Over 100%: amber at 50%, plus block border changes to amber at 35%
- Text content (icon, name, spent/budget) gets `position: relative` and `z-index: 1` so it renders on top of the fill
- **Staggered load animation**: Each fill starts at height 0 and animates to its target using CSS transition + a per-block delay. Use inline style `transition: height 600ms ease-out` with `transitionDelay: ${index * 100}ms`. Use a `useState` flag that flips after mount to trigger the animation (initial render = height 0, after useEffect = real height).
- **Smooth growth on new transaction**: Since fills use CSS transitions, adding a transaction updates `spent` in context, which recalculates `fillPercent`, and the CSS transition handles the smooth 400ms rise automatically.
- Brief highlight flash on affected block after transaction: track `lastAddedCategoryId` in state, apply a temporary white/10 overlay that fades out after 200ms.

### B. Working FAB with Add Transaction Sheet

**In `MyMoneyScreen.tsx`:**

- Import the existing `AddTransactionSheet` component
- Add state: `showAddTransaction: boolean` and `lastAddedCategoryId: string | null`
- Change FAB onClick from `toast(...)` to `setShowAddTransaction(true)`
- Render `<AddTransactionSheet open={showAddTransaction} onClose={handleTransactionClose} />`
- `handleTransactionClose`: sets `showAddTransaction` to false, and triggers the highlight flash on the affected block

The existing `AddTransactionSheet` already has all the required functionality (type toggle, custom keypad via `NumberKeypad`, category pills, description input, date selector, recurring toggle, save button). It already calls `addTransaction` from `BudgetContext` and persists to localStorage. No changes needed to `AddTransactionSheet.tsx` or `NumberKeypad.tsx`.

## Technical Notes

- The fill animation on load uses a common pattern: render with `height: 0`, then in a `useEffect(() => { requestAnimationFrame(() => setAnimated(true)) }, [])` flip to real heights. Each block's fill div has `style={{ height: animated ? fillPercent + '%' : '0%', transition: 'height 600ms ease-out', transitionDelay: index * 100 + 'ms' }}`
- The highlight flash uses a state variable `flashCategoryId` set on transaction save, cleared after 500ms via setTimeout. The affected block gets a white/10 overlay div that fades via CSS animation.
- Only `MyMoneyScreen.tsx` is modified. No other files change.

