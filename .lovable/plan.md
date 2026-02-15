

# My Money: Goals + Free Block Fix

## Overview
Three fixes to the My Money screen plus a Goals sub-Tetris empty state. No changes to macro block layout, design system, or other functionality.

---

## FIX 1: Add "Goal" option to FAB sheet

**File: `src/components/budget/AddTransactionSheet.tsx`**

- Change the type toggle from two pills (Expense | Income) to three pills: **Expense | Income | Goal**
- Add state for the type to include `'goal'` as a third option
- When "Goal" is selected, replace the existing form content with a goal creation form:
  - Goal name input (frosted, placeholder "What are you saving for?")
  - Icon picker (horizontal scroll of frosted circles: ShieldCheck, Plane, Car, Home, Laptop, GraduationCap, Heart, Target, TrendingUp, LineChart, Bike, Gamepad2)
  - Target amount input with euro prefix
  - Monthly contribution input with euro prefix
  - Green gradient "Create Goal" button (disabled until name + target + contribution filled)
- Import `useApp` and call `addGoal()` on save, writing to localStorage via the existing AppContext mechanism
- The Goal interface needs `targetAmount` and `savedAmount` fields -- the existing `Goal` type in AppContext uses `target` and `saved`, so we map accordingly

---

## FIX 2: Goals macro block showing correct amounts

**File: `src/components/screens/MyMoneyScreen.tsx`**

The macro block calculation at line 171 already reads from `goals` and `totalGoalContributions`. The actual bug is that the Clarity completion handler over-allocates spending budgets (see FIX 3), which makes the Goals block appear small or zero when no goals are created during Clarity. The `macroBlocks` code itself is correct -- it will show the right values once goals exist.

However, I will also add the "Tap + to add a goal" hint text on the Goals block when `goals.length === 0`, and ensure the goal color mapping per icon is used for the segmented bar.

Add goal-specific colors to the segment rendering:
```
const goalIconColors = {
  ShieldCheck: '#34C759', Plane: '#38BDF8', Car: '#2DD4BF',
  Home: '#818CF8', Laptop: '#A78BFA', GraduationCap: '#14B8A6',
  TrendingUp: '#34C759', LineChart: '#3B82F6', Target: '#8B5CF6',
}
```

Update `sortedGoals` to use icon-based colors instead of index-based colors.

---

## FIX 3: Free block showing correct unallocated amount

**File: `src/components/profile/QuestionnaireOverlay.tsx`**

The Clarity completion handler currently allocates 100% of `remainingFlex` (after food) to spending categories:
- Entertainment: 20%
- Shopping: 25%
- Personal: 25%
- Other: 30%
- **Total: 100%** -- leaves nothing free

Fix: Reduce to **80%** of remaining flex, leaving 20% unallocated:

```
const allocatable = Math.max(0, remainingFlex * 0.80);
addCategory({ name: 'Entertainment', ..., monthlyBudget: Math.round(allocatable * 0.20) });
addCategory({ name: 'Shopping', ..., monthlyBudget: Math.round(allocatable * 0.25) });
addCategory({ name: 'Personal', ..., monthlyBudget: Math.round(allocatable * 0.25) });
addCategory({ name: 'Other', ..., monthlyBudget: Math.round(allocatable * 0.30) });
```

This ensures Free block shows approximately 20% of flex as unallocated.

**Note**: Existing users who already completed Clarity will still see the old over-allocated amounts. This fix only affects new completions.

---

## FIX 4: Goals sub-Tetris empty state

**File: `src/components/screens/MyMoneyScreen.tsx`**

When `subView === 'goals'` and `sortedGoals.length === 0`, render an inviting empty state instead of just the "+" button:

- Centered Target icon (48px, white/15)
- "No goals yet" (18px, white/25)
- "What are you saving for? A house? A vacation? An emergency fund?" (13px, white/15)
- "Add Goal" button (green gradient, opens the FAB sheet with Goal mode pre-selected)

---

## Technical Summary

| File | Change |
|------|--------|
| `src/components/budget/AddTransactionSheet.tsx` | Add "Goal" type toggle + goal creation form |
| `src/components/screens/MyMoneyScreen.tsx` | Goals empty hint on macro block, goal icon colors for segments, Goals sub-Tetris empty state |
| `src/components/profile/QuestionnaireOverlay.tsx` | Reduce spending allocation from 100% to 80% of remaining flex |

