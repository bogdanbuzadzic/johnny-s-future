

# Plan: Contextual Johnny Notifications + Block Detail Timeline

This plan adds 2 new files and modifies 4 existing files across 7 steps, adding contextual Johnny messages throughout the app and a new spending block detail sheet.

---

## Step 1: Create `JohnnyMessage` component

**New file: `src/components/ui/JohnnyMessage.tsx`**

A shared component with three visual variants (`light`, `dark`, `glass`), each with distinct background/text colors. Uses the actual `johnny.png` image (never emoji). Features:
- Animated enter/exit via `framer-motion`
- Dismiss button (X)
- Optional action buttons slot
- Two helper button components: `JohnnyPrimaryBtn` (gradient bg) and `JohnnySecondaryBtn` (transparent)

The prompt's JSX has formatting issues (missing closing tags, broken type syntax). These will be fixed during implementation -- the `variantStyles` Record type needs proper typing, and all JSX elements need correct closing/nesting.

---

## Step 2: Post-survey Johnny message in `QuestionnaireOverlay.tsx`

**Modified file: `src/components/profile/QuestionnaireOverlay.tsx`**

Inside the completion screen (`showCompletion` block, around line 387-458), after the badge card and before the "Continue →" button (line 451), insert a `JohnnyMessage` with variant `light`.

Content varies by `moduleKey`:
- `clarity`: references clarity score from localStorage, shows "Solid score" (>=70) or "Good start" (<70)
- `module0`: uses `getPersona()` (already imported at line 8) to reveal persona strengths/blind spots
- Other modules: generic encouraging message

`getPersona` is already imported on line 8. Will need to add the `JohnnyMessage` import.

---

## Step 3: First-visit notification on My Money

**Modified file: `src/components/screens/MyMoneyScreen.tsx`**

Add state `showMyMoneyIntro` (reads `jfb_myMoney_introduced` from localStorage). Inside the green income container, after the parent blocks grid (line ~1327) and before the free cash strip (line ~1329), insert a `JohnnyMessage` with variant `glass`.

Shows once, dismisses to localStorage. Content explains: "The green is your income. Everything inside = where your money goes."

---

## Step 4: Johnny message in Can I Afford results

**Modified file: `src/components/budget/CanIAffordSheet.tsx`**

After the goal delays section (line ~220) and before the type-specific sections (line ~223), insert a `JohnnyMessage` with variant `dark`.

Content: shows hours of work calculation (`amount / hourlyRate`) and goal delay impact. All variables (`amount`, `hourlyRate`, `goals`, `goalDelays`) are already available in scope (lines 64-74).

---

## Step 5: Johnny message in What If results

**Modified file: `src/components/sheets/TodayDrawer.tsx`**

The What If scenarios render inside `DrawerContent` via the `WhatIfPanel` component. The scenario results (fork data, danger month indicators) display in the terrain chart area. The best place to add a Johnny message is after the fork delta label / danger indicators, inside the DrawerContent render.

After the chart SVG area where `forkData` results show, add a `JohnnyMessage` with variant `dark` when `activeScenarios.length > 0`. Content: calculates runway months from savings vs expenses, suggests bumping savings. Uses `computed.totalFixed`, `computed.flexBudget`, and budget config from localStorage.

Will include "Adjust savings" and "Later" action buttons using `JohnnyPrimaryBtn` / `JohnnySecondaryBtn`.

---

## Step 6: Milestone notification in My World

**Modified file: `src/components/screens/MyWorldScreen.tsx`**

Add state `milestoneGoal`. Add a `useEffect` watching `scrubberDate` and `sorted` that checks each goal's projected progress for 50% and 75% milestones (stored in localStorage keys like `jfb_milestone_GoalName_50`).

Render a `JohnnyMessage` with variant `glass` positioned above the timeline scrubber. "Speed it up" button opens the existing acceleration panel (`setShowAcceleration(true)` + `setAcceleratingGoalIdx`).

---

## Step 7: Block Detail Sheet for spending categories

**New file: `src/components/budget/BlockDetailSheet.tsx`**

A bottom sheet (using vaul `Drawer` or a custom motion.div like `CanIAffordSheet`) that opens when a spending block is tapped. Features:
- Category header with icon, name, budget bar
- Budget slider (reusing existing slider logic from the inline expanded view)
- **Daily spending timeline**: 7 columns showing the current week, each with a bar for that day's spending. A prominent 2px dashed budget line at `dailyBudget = category.monthlyBudget / daysInMonth`. Bars below the line are muted, portions above are bright/gold.
- **Legend**: "Under budget" / "Over budget" / daily budget amount
- **Johnny insight**: Analyzes over-budget day count vs total days elapsed
- **Transaction list**: filtered by selected day (tap a day column to filter)
- **Cumulative chart**: SVG with diagonal budget pace line vs actual cumulative polyline

**Wire-up in `MyMoneyScreen.tsx`**:
- Add state `detailCatId: string | null`
- Change spending sub-block `onClick` from `handleExpandItem` to `setDetailCatId(cat.id)` (line 746)
- Render `BlockDetailSheet` at the bottom alongside other sheets
- Keep inline expansion as fallback (if `BlockDetailSheet` isn't needed, the old behavior remains accessible via the sheet's own slider)

Props needed: `open`, `onClose`, `category`, `spent`, `transactions` (filtered to this category), `daysInMonth`, `dayOfMonth`, `onUpdateBudget`

---

## Technical Notes

- The `JohnnyMessage` component's `variantStyles` type in the prompt has a syntax error (`Record;`) -- will be corrected to `Record<Variant, {...}>`.
- All localStorage keys follow the existing `jfb_` prefix convention.
- The `BlockDetailSheet` daily timeline uses the same transaction data already available from `BudgetContext` -- no new data fetching required.
- The `TodayDrawer` Johnny message needs budget config access. It already reads from localStorage via `readBudgetFromStorage()` (line 15-26), so savings target is available as `budgetData.config.monthlySavingsTarget`.

