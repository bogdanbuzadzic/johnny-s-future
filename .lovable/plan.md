

# My Money - Unified Goals + Time Zoom

## Overview

This is a major restructuring that merges goals into the Tetris container as blocks, adds a time zoom toggle, and removes the separate Goals tab. Goals and spending blocks coexist in the same 2D grid, with their relative sizes changing dramatically based on the selected time zoom.

## Files to Modify

### 1. `src/components/TabBar.tsx`
- Remove the Goals tab (Target icon)
- Tabs become: Home (index 0), My Money (index 1), Profile (index 2)
- Remove `Target` import from lucide-react

### 2. `src/App.tsx`
- Remove `GoalsScreen` import
- Update `renderScreen` switch: case 0 = Home, case 1 = MyMoney, case 2 = Profile (placeholder)
- No case 3 needed

### 3. `src/context/AppContext.tsx`
- Add `updateGoal` to update goal contributions (already exists)
- No major changes needed -- goals data stays here

### 4. `src/components/screens/MyMoneyScreen.tsx` (main work)

#### Remove
- Goal cards row (lines 758-846) -- the floating cards above the container
- Flow lines SVG (lines 851-878) -- the dashed lines connecting cards to container

#### Add: Time Zoom State + Logic
- New state: `timeZoom: 'month' | 'year' | '5year'` (default: 'month')
- Multiplier map: `{ month: 1, year: 12, '5year': 60 }`
- All block sizing now uses `amount * multiplier` relative to `totalIncome * multiplier`

#### Add: Time Zoom Toggle UI
- Inside the container, overlaying the fixed bar area (top-right corner)
- Three frosted glass pills: "Month" | "Year" | "5 Year"
- Selected pill: white/20 bg, white text. Others: white/8, white/40 text

#### Modify: Block Sizing (`getSizeTier`)
- Now takes `amount` and `totalBudgetForZoom` instead of just budget/flexBudget
- For spending blocks at month zoom: `amount = cat.monthlyBudget`, total = `config.monthlyIncome`
- For spending blocks at year zoom: `amount = cat.monthlyBudget * 12`, total = `config.monthlyIncome * 12`
- For goal blocks at month zoom: `amount = goal.monthlyContribution`, total = `config.monthlyIncome`
- For goal blocks at 5year zoom: `amount = goal.target`, total = `config.monthlyIncome * 60`
- Same tier thresholds (>0.25 = huge, >0.15 = large, >0.08 = medium, else small)

#### Add: Goal Blocks in the Grid
- Goals from AppContext rendered as blocks in the same CSS grid
- All blocks (spending + goals) sorted by their zoom-adjusted amount descending
- Goal block visual differences:
  - Border: `2px dashed` (not solid) in goal tint at 30%
  - Accent stripe: green (#34C759 at 50%) for all goals
  - Background: white/8 (more transparent)
  - Small Target icon (10px, white/15) in top-right corner
  - Fill: green (#34C759 at 25%) rising from bottom, height = `(saved / target) * 100%`
  - At 100% funded: solid border, CheckCircle replaces Target icon

Goal tint colors:
- ShieldCheck: #34C759, Plane: #5AC8FA, Car: #007AFF, Home: #6366F1, Laptop: #8B5CF6, GraduationCap: #14B8A6, Target: #34C759

Goal block content tiers (same adaptive pattern as spending):
- Large: icon + name + "saved/target" + progress bar + percentage
- Medium: icon + name + saved/target on one line
- Small: icon + saved + /target + percentage

#### Add: Goal Block Expansion
- Tapping a goal block expands to full width, 280px (same as spending)
- Content:
  1. Progress ring (80px) centered, green fill arc
  2. "saved of target" text + "X% funded"
  3. Contribution slider (green track/thumb instead of category tint)
     - Range: 0 to (current contribution + flexRemaining)
     - Label: "EUR[amount]/month"
     - Impact: "At EUR X/month, reach goal in Y months (Mon Year)"
     - If changed up: "Reaching X months sooner" in green
     - If changed down: "Reaching X months later" in amber
  4. Timeline bar (simple horizontal)
  5. Save/Cancel buttons (same pattern)

#### Add: "Add Goal" Dashed Block
- Small (1x1) dashed block in green/15 with Plus icon + "Add goal" text
- Tapping expands inline form (same pattern as Add Category):
  - Icon picker (goal icons: ShieldCheck, Plane, Car, Home, Laptop, GraduationCap, Heart, Target, Dumbbell, Gamepad2)
  - Name input
  - Target amount input
  - Monthly contribution input
  - "Create" button (green gradient) + "Cancel"
- On create: calls `addGoal` from AppContext

#### Modify: Fixed Bar Text
- Scales with zoom: month shows monthly, year shows annual, 5year shows 5-year totals

#### Modify: Savings Bar
- Month: "Savings EUR X/mo"
- Year: "Savings EUR X/yr"
- 5 Year: "Savings EUR X / 5yr"

#### Modify: Impact Summary
- Left: "EUR[remaining * multiplier] left"
- Daily stays the same (always today's rate)
- Right: "EUR[dailyAllowance]/day"

#### Modify: Spending Slider Goal Impact Text
- When slider decreases: "If moved to savings: [goal] reaches target X months sooner"
- When slider increases: "Savings pressure: [goal] may be delayed X months"

#### Add: Zoom Transition Animation
- When switching zoom levels, all blocks resize via `layout` animation (500ms spring)
- The grid naturally re-packs as sizes change

#### Sorting All Blocks Together
- Create a unified array of `{ type: 'spending' | 'goal' | 'add-goal', amount, ...data }`
- Sort by zoom-adjusted amount descending
- "Add goal" block always sorted last (smallest)
- Render spending blocks and goal blocks from the same sorted array

## Technical Notes

- The `goals` array from `useApp()` is already available in MyMoneyContent
- `addGoal` and `updateGoal` from AppContext handle persistence
- Goal contribution slider updates use `updateGoal(id, { monthlyContribution: newValue })`
- The expand/collapse state needs to handle both spending and goal blocks -- expand `expandedId` to work with goal IDs too (prefix or unified namespace)
- Time zoom multiplier is purely a display/sizing concern -- underlying data stays monthly
- The CSS grid naturally handles mixed block types since they're all `motion.div` elements with grid-column/row spans

