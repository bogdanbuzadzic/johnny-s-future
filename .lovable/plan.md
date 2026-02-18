

# Fix: Score + Badge Combined, Tetris Packing, Goals Hover

## Overview
Four targeted fixes across QuestionnaireOverlay, MyMoneyScreen, MyWorldScreen, and ProfileScreen.

## Changes

### 1. Combine Clarity Score + Badge into ONE Screen
**File: `src/components/profile/QuestionnaireOverlay.tsx`**

- Delete the separate `showScoreBreakdown` screen (lines 351-418)
- Delete the separate `showCompletion` celebration screen (lines 420-504)
- Replace BOTH with a single combined completion screen that shows:
  - Confetti (50+ particles, same colors/logic)
  - Score counting up from 0 (1.5s duration) in 64px bold white + "/100" in 22px white/35
  - "Financial Clarity Score" label 16px white/50
  - Three pillar bars (staggered fill animation, 800ms): Spending orange, Saving blue, Planning purple
  - Insight text (italic, based on weakest pillar)
  - Compact horizontal badge card (gold border 1.5px, white/10 bg, badge image 48px left + name/text right), slides up at 800ms delay
  - "Continue" gradient button, fades in at 1000ms
- In `handleComplete` for clarity: instead of `setShowScoreBreakdown(true)`, go directly to `setShowCompletion(true)`
- The completion screen now contains everything -- no intermediate step
- Animation sequence: 0ms confetti, 200ms score count, 500ms bars, 800ms badge, 1000ms button

### 2. Tetris Dense Grid Packing
**File: `src/components/screens/MyMoneyScreen.tsx`**

- Parent grid (line ~933): Change from `repeat(2, 1fr)` to `repeat(4, 1fr)` and add `gridAutoFlow: 'dense'`
- Update `getSpans` thresholds:
  - ratio > 0.35 -> col:2, row:2 (Spending ~37%)
  - ratio > 0.25 -> col:2, row:2 (Fixed ~34%)
  - ratio > 0.15 -> col:2, row:1 (Goals ~19%)
  - else -> col:1, row:1 (Savings ~8%)
- Sub-block grids (spending + fixed): Add `gridAutoFlow: 'dense'` to both
- Update `getSubSpans`:
  - ratio > 0.30 -> col:2, row:2 (Food 38%)
  - ratio > 0.18 -> col:1, row:2 (Shopping 18%)
  - else -> col:1, row:1

### 3. Remove "Other" Category + Rename "Personal" to "Lifestyle"
**File: `src/components/profile/QuestionnaireOverlay.tsx`**

- In `handleComplete` (clarity section, lines ~218-229):
  - Remove the "Other" category creation entirely (line 229)
  - Rename "Personal" to "Lifestyle" (line 228)
  - Update math: `allocatable * 0.30` for entertainment, `allocatable * 0.38` for shopping, remainder for lifestyle
- Update `flexForSpending` formula to use 0.35 multiplier for food default

**File: `src/components/screens/MyMoneyScreen.tsx`**

- In `handleMockImport` (line 262): Change `'Personal'` reference to `'Lifestyle'`

### 4. My World: Show All 4 Goals + Hover Progress Tooltip
**File: `src/components/screens/MyWorldScreen.tsx`**

- Simplify `getGoalImage`: Map directly to fixed images (house3, car2, vacation2, laptop3) instead of progress-based numbering. Fallback to general icon.
- Update `POSITIONS` array to show 4 goals at x: 20%, 40%, 60%, 80% all at bottom: 18%
- Replace `setSelectedGoal` click with hover/tap tooltip:
  - State: `hoverGoalIdx` instead of `selectedGoal`
  - On mouse enter: show floating card above goal image
  - On touch start: show card, auto-hide after 3s
  - Card shows: name, amount, gradient progress bar, percentage, monthly contribution
  - Triangle pointer at bottom of card
  - `fadeInUp` animation (200ms)
- Remove the bottom sheet detail view entirely (lines 296-348)
- Remove unused numbered asset imports (car1, car3, car4, vacation1, etc.) -- keep only car2, vacation2, laptop3, house3 + general icons

**File: `src/components/screens/ProfileScreen.tsx`**

- Update demo goals (line 649-652): Add Vacation and New Laptop goals:
  ```
  { name: 'Dream House', icon: 'Home', target: 40000, saved: 30000, monthlyContribution: 200 }
  { name: 'New Car', icon: 'Car', target: 10000, saved: 5000, monthlyContribution: 150 }
  { name: 'Vacation', icon: 'Plane', target: 2000, saved: 1000, monthlyContribution: 75 }
  { name: 'New Laptop', icon: 'Laptop', target: 2500, saved: 1875, monthlyContribution: 50 }
  ```
- Update category reference from `'Personal'` to `'Lifestyle'` in demo transaction seeding

## Technical Notes

### Files Modified (5)
1. `src/components/profile/QuestionnaireOverlay.tsx` -- combined completion screen, spending math fix
2. `src/components/screens/MyMoneyScreen.tsx` -- 4-col dense grid, Lifestyle rename in mock import
3. `src/components/screens/MyWorldScreen.tsx` -- simplified images, hover tooltip, 4 positions
4. `src/components/screens/ProfileScreen.tsx` -- 4 demo goals, Lifestyle rename

### Spending Math (with demo data)
```
Income:       2500
Fixed:         850
Savings:       200
Goals:         475
Flex:          975
Food:          350
Remaining:     625
Allocatable:   562 (90%)
Entertainment: 169 (30%)
Shopping:      214 (38%)
Lifestyle:     179 (remainder)
Total spend:   912
Free:           63
```

### Grid Layout Result (4-col dense)
```
Spending (2x2)  |  Fixed (2x2)
                |
Goals (2x1)     | Savings(1x1) | [green free]
```

