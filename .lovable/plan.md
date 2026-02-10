

# My Money - Complete Build

## Overview

Replace the 5-tab navigation with a 4-tab layout and build a new "My Money" screen that combines budget management (Tetris-style block packing) with the terrain visualization (Johnny's Journey) in a single scrollable page. The separate Budget tab is removed.

---

## Navigation Changes

### TabBar (src/components/TabBar.tsx)
- Change from 5 tabs to 4: Home, My Money (LayoutGrid), Goals, Profile
- Update icons and labels accordingly

### AppContext (src/context/AppContext.tsx)
- Tab indices shift: 0=Home, 1=My Money, 2=Goals, 3=Profile
- Remove references to old tab 1 (Tetris) and tab 2 (Budget)

### App.tsx
- Update `renderScreen()` switch: tab 1 renders `<MyMoneyScreen />`, tab 2 renders `<GoalsScreen />`, tab 3 renders Profile placeholder
- Remove BudgetScreen import, add MyMoneyScreen import

---

## New Files

### src/components/screens/MyMoneyScreen.tsx
The main screen component. Wraps everything in `BudgetProvider` + `SimulationProvider`. Contains:

**Header row:**
- Left: "My Money" 20px bold white
- Center: Monthly/Weekly toggle (frosted glass pill)
- Right: Sliders icon button (opens EditBudgetSheet)

**Tetris Container:**
- Large rounded rect (~55vh), white/5 fill, 2px white/20 border, 24px radius
- Above container: Wallet icon + "Monthly Income EUR[amount]" label
- Three zones inside:

**Zone 1 - Fixed Expenses Bar (top):**
- Single 36px bar, white/5 bg, Lock icon, inline list of fixed expenses separated by dots, total on right
- 1px bottom border

**Zone 2 - Savings Block:**
- 48px bar, green/12 + white/8 bg, green/20 border, PiggyBank icon, savings amount, ShieldCheck corner icon
- 1px bottom border

**Zone 3 - Flex Zone (remaining height):**
- Category blocks packed left-to-right using width proportional to budget/flexBudget
- Block styling: category tint color at 30% + white/8, tint/25 border, 16px radius
- Horizontal spending fill inside each block at 45% tint opacity
- Over-80% blocks shift to amber fill; over-100% full amber takeover
- Tap expands to show transactions + edit budget
- Empty space at bottom shows dotted grid, "EUR[remaining] to spend", daily allowance, Johnny mascot

### src/components/budget/TetrisContainer.tsx
Extracted component for the Tetris game board. Handles:
- Block layout calculation (width proportional to budget, row packing with 6px gaps)
- Block rendering with tint colors, spending fills, icons
- Tap-to-expand with transaction list
- Long-press drag to reorder (saves sortOrder)
- Drag bottom edge to resize budget (live terrain updates)
- Empty space rendering with Johnny reactions
- Overflow state with amber glow

### src/components/budget/CategoryBlock.tsx
Individual block component. Props: category, spent, budget, tintColor, width, expanded, onTap, onResize.
- Renders icon, name, spent/budget, horizontal fill bar
- Expanded state: progress bar, transaction list (max 4 + "and X more"), edit budget inline

---

## Modified Files

### src/context/BudgetContext.tsx
- Add `tintColor` field to Category type with default colors
- Add category tint color map as a constant
- Ensure `getCategorySpent` supports both 'month' and 'week' periods (already does)

### src/components/terrain/TerrainPath.tsx
- Reduce TERRAIN_HEIGHT from 220 to 140
- Accept optional props for flexRemaining, dailyAllowance, etc. (so it can work both in TodayDrawer and inline on My Money screen)
- Add "Next 30 days" label top-left, daily allowance label top-right
- Change date axis to week labels: "This week", "Week 2", "Week 3", "Week 4"
- Add resize delta text: "EUR44/day becomes EUR38/day" (shown during block resize)
- Add hint text at bottom when not interacting

### src/context/SimulationContext.tsx
- No major changes needed; already supports the required simulation types

### src/components/sheets/TodayDrawer.tsx
- Keep as-is for now (still accessible from Home screen swipe-down)
- The terrain in TodayDrawer remains at 220px height with its own data

### src/components/budget/SetupWizard.tsx
- No changes needed (already works with BudgetContext)

### src/components/budget/AddTransactionSheet.tsx
- Add category tint colors to pill styling
- No major structural changes needed

### src/components/budget/EditBudgetSheet.tsx
- Add "Manage fixed expenses" section with edit/delete per item + add new
- Add "Edit categories" section with drag-to-reorder + swipe-to-delete
- Keep existing income/savings/reset functionality

---

## Category Tint Color System

A constant map assigns distinct colors to category names:

```text
Food:          #FF9F0A (amber/orange)
Shopping:      #FF6B9D (pink)
Transport:     #007AFF (blue)
Entertainment: #8B5CF6 (purple)
Health:        #34C759 (green)
Subscriptions: #5AC8FA (light blue)
Coffee:        #C4956A (brown)
Other:         #FFFFFF (white, lower opacity)
```

When creating categories (setup wizard or add form), assign tintColor based on name match or default to white.

---

## Block Packing Algorithm

```text
containerInnerWidth = screenWidth - 32px
for each category:
  blockWidth = (categoryBudget / flexBudget) * containerInnerWidth
  blockWidth = clamp(blockWidth, 100px, containerInnerWidth)

Layout: place blocks left-to-right in rows
  if next block fits in remaining row space (with 6px gap): place inline
  else: start new row
  
blockHeight = width >= 120px ? 56px : 48px
gap = 6px horizontal and vertical
```

---

## Monthly/Weekly Toggle

- Monthly (default): blocks show monthly budgets, spending = month-to-date totals
- Weekly: block widths recalculate using monthlyBudget/4.33, spending = current week only
- Toggle animates block sizes with 300ms spring transition
- Terrain data and daily allowance recalculate accordingly

---

## Data Flow

```text
BudgetContext (localStorage)
  |
  +-> MyMoneyScreen
  |     +-> Header (toggle, settings)
  |     +-> TetrisContainer (blocks, empty space, Johnny)
  |     +-> TerrainPath (30-day projection from flexRemaining)
  |     +-> What If button + Playground Mode
  |     +-> Johnny's Tip card
  |     +-> FAB -> AddTransactionSheet
  |
  +-> SimulationProvider wraps TerrainPath + What If
```

---

## Johnny Reactions in Empty Space

- Lots of space (>30% of flex zone height): normal idle bob
- Moderate (10-30%): still present, space visually tighter
- Tiny (<10%): thought bubble with "..." above Johnny
- No space/overflow: blocks overflow container, amber glow on bottom edge, Johnny half-visible, "EUR[over] over" text

---

## Implementation Order

1. Update TabBar: 4 tabs (Home, My Money, Goals, Profile)
2. Update AppContext: adjust tab indices
3. Update App.tsx: route tab 1 to MyMoneyScreen, tab 2 to Goals, tab 3 to Profile
4. Add tintColor to BudgetContext Category type + default color map
5. Create CategoryBlock component
6. Create TetrisContainer component with block packing layout
7. Create MyMoneyScreen: header, container, terrain, what-if, tip, FAB
8. Modify TerrainPath: 140px height variant, week labels, connection to budget data
9. Update EditBudgetSheet: add fixed expense management + category management
10. Remove old BudgetScreen import from App.tsx
11. Wire terrain to live budget data (flexRemaining, dailyAllowance from BudgetContext)

---

## Technical Notes

- The existing BudgetContext, SetupWizard, AddTransactionSheet, NumberKeypad, and ProgressRing components are reused as-is
- Block drag-resize uses touch event handlers with requestAnimationFrame for smooth updates
- Long-press reorder uses a 500ms timeout before entering drag mode
- The SimulationProvider wraps the terrain section, receiving live values from BudgetContext
- All state persists in localStorage via BudgetContext; simulation state is ephemeral React state only
- The dotted grid in empty space uses an SVG pattern fill (white/3, 20px spacing)

