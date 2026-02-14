

# MVP Alignment - Complete Fix (3 Prompts)

This is a large, multi-feature implementation covering data flow fixes, new features, and persona-adaptive messaging across the entire app.

---

## Prompt 1: No Preset Data + Calculations Fix + Terrain Connection

### 1A. Empty State for My Money (when Clarity not done)

**File: `src/components/screens/MyMoneyScreen.tsx`**

- At the top of `MyMoneyContent`, check `localStorage.getItem('jfb_clarity_done') === 'true'`
- If NOT done, render a full-screen empty state instead of the normal dashboard:
  - Johnny tamagotchi (64px, idle bob animation)
  - "Set up your finances" heading (20px bold white)
  - Description text (14px white/30)
  - "Go to Profile" frosted button that calls `setActiveTab(2)`
  - Hide FAB, Can I Afford, mode toggle, zoom, macro container, impact summary
- If done, render the normal dashboard (no changes to existing layout)

### 1B. Calculations Engine Fix

**File: `src/context/BudgetContext.tsx`**

The existing BudgetContext already has the correct structure (localStorage persistence, useMemo calculations, addTransaction with number coercion). Key issues to verify/fix:

- Storage key is `jfb-budget-data` (single blob). The prompt references separate keys (`jfb_transactions`, etc.) but the existing context uses a combined key. We keep the existing approach since the Clarity questionnaire already writes to it via `updateConfig` and `addCategory`.
- Ensure `totalIncome` uses `Number()` coercion: change line 130 from `config.monthlyIncome` to `Number(config.monthlyIncome) || 0`
- Ensure `savingsTarget` uses `Number()`: change line 135 from `config.monthlySavingsTarget` to `Number(config.monthlySavingsTarget) || 0`
- Ensure `totalFixed` uses `Number()`: already uses `c.monthlyBudget` directly, add `Number()` wrapper
- Add `Goal` type and goals state to BudgetContext (currently goals live in AppContext with hardcoded initial data)

**File: `src/context/AppContext.tsx`**

- Remove the hardcoded `initialGoals` array (lines 164-205). Replace with empty array `[]`
- Goals created by Clarity questionnaire via `addGoal` will populate this

**File: `src/components/screens/MyMoneyScreen.tsx`**

- The screen already reads from `useBudget()` and computes `categorySpentMap` correctly
- Verify `categorySpentMap` uses the same month-filtering logic as BudgetContext
- Remove any fallback hardcoded values (none found in current code, but verify)

**File: `src/components/budget/AddTransactionSheet.tsx`**

- Already uses `addTransaction` from `useBudget()` with `amount` as parsed float and `categoryId` as `selectedCategoryId` (the UUID). This is correct.

### 1C. Terrain Reads Fresh Data

**File: `src/components/sheets/TodayDrawer.tsx`**

- Already reads fresh from localStorage every time drawer opens (lines 197-202: `useMemo` with `[open]` dependency calling `readBudgetFromStorage()`)
- This is already correctly implemented. No changes needed.

**File: `src/components/terrain/TerrainPath.tsx`**

- Verify it receives fresh data from SimulationProvider props (it does via `useSimulation()`)
- No changes needed here.

### 1D. Remove Hardcoded Default Data

**File: `src/components/sheets/TodayDrawer.tsx`**

- Lines 68 and 206: fallback values `flexRemaining: 738, dailyAllowance: 44, daysRemaining: 7, monthlyIncome: 2400` are shown when `setupComplete` is false. Change these to zeros: `flexRemaining: 0, dailyAllowance: 0, daysRemaining: 0, monthlyIncome: 0, averageDailySpend: 0`

---

## Prompt 2: Subscription Tracking + Cash Flow Forecasting

### 2A. Subscription Tracking in Spending Sub-Tetris

**File: `src/components/screens/MyMoneyScreen.tsx`**

- Inside `renderSubTetris()`, when `subView === 'spending'`, add a subscription summary card ABOVE the spending category blocks
- Detect recurring transactions: `transactions.filter(t => t.isRecurring === true)`
- Group by description to get unique subscriptions
- Calculate monthly total, annual total, hours-of-work equivalent
- Render:
  - Frosted card with header: RefreshCw icon + "Subscriptions" + monthly total
  - Horizontal scroll of subscription pills with category tint dots
  - "Annual: [X] -- [Y] hours of work/year" summary
  - "Manage" toggle that expands to show full list with "Cancel?" per item
  - Cancel simulation: strikethrough, savings preview, goal impact, Confirm/Just checking buttons
  - On confirm: remove `isRecurring` flag from matching transactions

### 2B. Cash Flow Forecasting (Extended Terrain)

**File: `src/components/terrain/TerrainPath.tsx`**

- Add a time range toggle above the terrain: "1M" | "3M" | "6M" | "1Y" as frosted pills
- State: `const [range, setRange] = useState<'1M'|'3M'|'6M'|'1Y'>('1M')`
- Extended calculation loop for up to 365 days:
  - Monthly salary on the 1st (after first month)
  - Recurring bill deductions on due dates
  - Average daily spend deduction
  - Balance tracking with floor at -2000
- Rendering adjustments per range: px/day, obstacle filtering, date axis labels
- Goal flags at projected achievement dates
- Keep existing 1M behavior as default

**File: `src/components/sheets/TodayDrawer.tsx`**

- Pass additional data to TerrainPath/SimulationProvider for extended forecasting (recurring transactions, goals)

---

## Prompt 3: Persona-Adaptive Messaging

### 3A. Persona Tips Data

**File: `src/lib/personaMessaging.ts`** (NEW FILE)

- Export `tipsByPersona` object with arrays per persona type + "default"
- Export `getImpactText(diff, newDaily, goalText, persona)` function
- Export `getAffordText(result, persona, daily, days, shortage)` function
- Export `getCelebration(moduleName, persona)` function
- Export `getPersonaObservation(persona)` function returning icon/color/text

### 3B. Johnny's Tips on Home Screen

**File: `src/components/screens/HomeScreen.tsx`**

- Read persona from localStorage: `getPersona(JSON.parse(localStorage.getItem('jfb_module0_answers') || 'null'))`
- Use `tipsByPersona[persona?.n || 'default']` for the tip text
- Replace static "Your Financial Co-pilot" subtitle with rotating persona-specific tips
- Rotate tips by day index: `tips[new Date().getDate() % tips.length]`

### 3C. Johnny's Tips on My Money

**File: `src/components/screens/MyMoneyScreen.tsx`**

- Add a JohnnyTip component below the impact summary (or above macro container)
- Read persona, select tips from `tipsByPersona`
- For dynamic tips that reference data (e.g., "[X]% used"), interpolate calc values

### 3D. Slider Impact Text

**File: `src/components/screens/MyMoneyScreen.tsx`**

- In the spending block expanded view (lines 445-452), replace hardcoded impact text with `getImpactText()`
- Pass current persona, diff, newDaily, and goal text

### 3E. Can I Afford Answer Text

**File: `src/components/screens/MyMoneyScreen.tsx`**

- In `affordAnswer` useMemo (lines 117-127), use `getAffordText()` with persona
- Map existing result categories (comfortable/tight/over) to persona-specific text

### 3F. Johnny's Observations on Profile

**File: `src/components/screens/ProfileScreen.tsx`**

- In the observations section, prepend a persona-specific observation using `getPersonaObservation(persona?.n)`
- Uses the icon/color/text mapping from the prompt

### 3G. Quest Celebration Text

**File: `src/components/profile/QuestionnaireOverlay.tsx`**

- In the completion screen (line 160), replace "Quest Complete!" with `getCelebration(node.name, persona?.n)`
- Read persona from localStorage

---

## Technical Notes

- **Storage keys**: The app uses `jfb-budget-data` as a single blob for budget config/categories/transactions. Goals are in AppContext state (not persisted). The Clarity questionnaire writes to both via `updateConfig`/`addCategory`/`addGoal`.
- **Persona detection**: `getPersona()` in `profileData.ts` derives persona from Module 0 answers (`jfb_module0_answers`). No separate `jfb_persona` key exists; we read Module 0 answers and call `getPersona()`.
- **Goal persistence gap**: Goals in AppContext use hardcoded `initialGoals` and reset on reload. Prompt 1 removes these defaults. Goals from Clarity will also be lost on reload since AppContext doesn't persist. Consider adding localStorage persistence for goals in AppContext.
- **File count**: ~7 files modified, 1 new file created.

## Implementation Order

1. Remove hardcoded goals from AppContext (add localStorage persistence for goals)
2. Fix Number() coercion in BudgetContext
3. Add empty state to MyMoneyScreen
4. Remove fallback values from TodayDrawer
5. Create personaMessaging.ts
6. Add subscription tracking to MyMoneyScreen sub-tetris
7. Add terrain range toggle to TerrainPath
8. Wire persona messaging across HomeScreen, MyMoneyScreen, ProfileScreen, QuestionnaireOverlay

