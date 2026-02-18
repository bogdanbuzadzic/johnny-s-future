

# JFB Section 12 Bug Fixes + Gradient Update

## Overview
9 targeted fixes across 5 files: gradient update, spending math, Other category removal, block proportional sizing, terrain data, My World assets, combined score+badge screen, auto-advance, and daily calculation.

---

## FIX 1: Background Gradient Update

**Files: `src/index.css`, `src/components/profile/QuestionnaireOverlay.tsx`, `src/components/screens/MyMoneyScreen.tsx`**

Update the app-wide gradient from `#B4A6B8 -> #9B80B4` to a new lighter gradient:
```
background: linear-gradient(180deg, #C4B5D0 0%, #D8C8E8 25%, #E8D8F0 50%, #F2E8F5 75%, #FAF4FC 100%);
```

Changes:
- **`src/index.css`**: Update `.jfb-bg` class to use the new 5-stop gradient (replace the HSL variable approach with the direct gradient)
- **`QuestionnaireOverlay.tsx`**: Update 4 occurrences of `linear-gradient(to bottom, #B4A6B8, #9B80B4)` (calibration screen line 325, completion screen line 392, question screen line 467)
- **`MyMoneyScreen.tsx`**: Update the empty state background (line 786) from `#B4A6B8, #9B80B4` to the new gradient
- My World keeps its own sky gradient (no change needed)

---

## FIX 2: Spending Math -- Subtract Goals Before Spending

**File: `src/components/profile/QuestionnaireOverlay.tsx` (lines 196-223)**

The spending math is already correct in the current code (lines 197-223). The `goalContributions` are calculated and subtracted before computing `flexForSpending`. However, there may be a mismatch in the `goalMap_` contribution values vs the `goalMap` values. Verify and align:

- `'Start investing'` has `mc: 100` in `goalMap_` (line 201) but `mc: 100` in `goalMap` (line 257) -- OK
- `'Save for retirement'` has `mc: 200` in `goalMap_` (line 202) but `mc: 200` in `goalMap` (line 258) -- OK

The math already follows the correct order. The issue may be that `goalMap_` doesn't have entries for all goal types, so contributions aren't fully subtracted. Fix: ensure `goalMap_` matches `goalMap` exactly for all monthly contribution values.

Also update allocation percentages to match the spec:
- Entertainment: 30% of allocatable
- Shopping: 38% of allocatable
- Lifestyle: remainder (32%)

These are already correct (lines 215-217). No math changes needed unless the actual runtime values differ.

---

## FIX 3: Remove "Other" Category

**File: `src/components/profile/QuestionnaireOverlay.tsx`**

The current code (lines 219-223) already only creates Food, Entertainment, Shopping, and Lifestyle -- no "Other" category. However, the `fixedMap` on line 186 includes `{ key: 'other', name: 'Other Fixed', icon: 'MoreHorizontal' }` which creates an "Other Fixed" in the fixed categories if there's a value. This is for fixed expenses, not spending, so it's intentional.

Verify there's no other code path creating an "Other" spending category. The code looks clean.

---

## FIX 4: Block Proportional Sizing

**File: `src/components/screens/MyMoneyScreen.tsx`**

Current `getSubSpans` (lines 83-89) uses thresholds 0.30 and 0.18. Update to match the spec:
- proportion >= 0.45 -> span 3 columns (full width) -- for Rent at 70%
- proportion >= 0.25 -> span 2 columns
- proportion < 0.25 -> span 1 column

Also add proportional `minHeight`:
```typescript
function getSubSpans(amount: number, parentTotal: number) {
  if (parentTotal <= 0) return { col: 1, row: 1, minH: 60 };
  const ratio = amount / parentTotal;
  const minH = Math.max(60, Math.round(ratio * 200));
  if (ratio >= 0.45) return { col: 3, row: 2, minH };
  if (ratio >= 0.25) return { col: 2, row: 1, minH };
  return { col: 1, row: 1, minH };
}
```

Update all call sites to apply `minH` as `minHeight` style. This ensures Rent (70%) gets `col: 3` (full width) while Transport (9%) gets `col: 1`.

---

## FIX 5: Terrain Data Connection

**File: `src/components/sheets/TodayDrawer.tsx`**

The terrain chart reads from localStorage via `readBudgetFromStorage()`. Need to verify it also reads Clarity data for income/fixed amounts. The terrain should:
- Read `jfb_clarity_data` or derive values from `jfb-budget-data` config
- Build 30-day projection with salary spike on day 1
- Show green label for salary, bill icons for rent/utilities
- Re-read on every drawer open (already does this via `readBudgetFromStorage()`)

Add a `useEffect` or `useMemo` that reads Clarity-derived data and passes it to `TerrainPath`. If `TerrainPath` already handles this, verify it receives the right props. If the terrain shows flat at zero, the issue is likely that `config.monthlyIncome` is 0 in the budget data.

The `updateConfig` call in `QuestionnaireOverlay.tsx` (line 169) sets `monthlyIncome` and `monthlySavingsTarget`, which should flow to the terrain. Need to verify `TerrainPath` reads these values.

---

## FIX 6: My World Goal Assets

**File: `src/components/screens/MyWorldScreen.tsx`**

The current code already imports all 4 images (lines 9-12) and maps them correctly (lines 41-66). The images were copied in a previous session. This should already work.

Verify the images exist at:
- `src/assets/world/house3.png`
- `src/assets/world/car2.png`
- `src/assets/world/vacation2.png`
- `src/assets/world/laptop3.png`

No code changes needed for this fix.

---

## FIX 7: Combined Score + Badge Screen

**File: `src/components/profile/QuestionnaireOverlay.tsx`**

The combined screen is already implemented (lines 346-461). Score counter, pillar bars, insight text, badge card with gold border, and Continue button are all in one screen. The `showScoreBreakdown` state was already removed in a previous session.

No changes needed -- already fixed.

---

## FIX 8: Auto-Advance on Single-Select

**File: `src/components/profile/QuestionnaireOverlay.tsx`**

The auto-advance logic exists (lines 27, 103-122) but only handles `'single'` type. Need to also include quiz-type questions and yes/no (which are `single` type). The `AUTO_ADVANCE_TYPES` set on line 27 only has `'single'`.

Add `'quiz'` and `'scale5'` to the set if those types exist. Check if the auto-advance is actually being triggered in the question rendering code.

Need to verify the question input rendering calls `handleAutoAdvanceAnswer` for single-select types instead of `setAnswer`.

---

## FIX 9: Daily Calculation

**File: `src/components/screens/MyMoneyScreen.tsx`**

The daily rate in the summary bar (line 919) uses `dailyAllowance` from BudgetContext. Need to verify BudgetContext calculates this as `(flexBudget - flexSpent) / daysRemaining` which should give the correct value.

The summary bar should show `spendingFlex / daysInMonth` for the daily budget rate. If `dailyAllowance` is computed differently, update the display to use `Math.round(flexBudget / daysInMonth)` for the summary bar display.

---

## Implementation Order

1. Update `src/index.css` -- new gradient for `.jfb-bg`
2. Update `src/components/profile/QuestionnaireOverlay.tsx` -- gradient updates (3 places), verify auto-advance wiring
3. Update `src/components/screens/MyMoneyScreen.tsx` -- gradient update (1 place), `getSubSpans` thresholds, daily calc display
4. Verify `src/components/screens/MyWorldScreen.tsx` -- assets already correct
5. Verify `src/components/sheets/TodayDrawer.tsx` -- terrain data reading

## Files Modified
1. `src/index.css` -- gradient update
2. `src/components/profile/QuestionnaireOverlay.tsx` -- gradient + auto-advance verification
3. `src/components/screens/MyMoneyScreen.tsx` -- gradient + proportional sizing + daily calc
4. `src/components/sheets/TodayDrawer.tsx` -- terrain data connection (if needed)

