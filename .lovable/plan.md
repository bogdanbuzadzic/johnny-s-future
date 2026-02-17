

# Comprehensive Fix - All Parts

## Overview
This plan covers 5 major areas across 6 files: Clarity assessment restructuring, Tetris/My Money redesign refinements, Goals + My World fixes, and asset updates. All existing data infrastructure (BudgetContext, AppContext, personaMessaging) is preserved.

## Files to Modify

### 1. `src/lib/profileData.ts` - Clarity Assessment Changes
- **Merge Step 8 + Step 10**: Combine current `step8` (cash) and `step10` (investments) into one compound step with 3 fields: Bank accounts, Savings accounts, Investments (excl. pension)
- **Remove standalone Step 10** (investments number input)
- **Old Step 9** (pension) stays as new Step 9, old Step 11 (insurance) becomes Step 10
- **Total steps**: Clarity goes from 11 visible to 10
- **Update Step 3 goal options**: Replace current list with: "Better budgeting", "Manage debt", "Save for a home", "Save for a car", "Save for a vacation", "Save for a purchase", "Build emergency fund", "Start investing", "Save for retirement"
- **Update `calculateClarityScore`** to read investments from `step8.investments` instead of `step10`

### 2. `src/components/profile/QuestionnaireOverlay.tsx` - Assessment UI Changes
- **Auto-advance on single-select**: After selecting a single/quiz/scale5 option, wait 400ms then auto-slide to next question. Does NOT apply to multi, slider, number, text, expenses, compound, statements types
- **Clarity score breakdown screen**: Insert a new screen BETWEEN the last question and the badge celebration. Shows:
  - "Your Financial Clarity Score" title
  - Large score number "/100"
  - Three pillar bars (Spending - orange, Saving - blue, Planning - purple) with fill widths
  - Insight text based on weakest pillar
  - "Continue" gradient button that leads to badge celebration
- **Goal creation map update**: Match the new Step 3 options with proper goal definitions including "Save for a vacation" (Plane, target 2000, monthly 75) and "Save for a purchase" (Laptop, target 2500, monthly 50)
- **Update handleComplete**: Read investments from merged step8, store cash/investments together
- **Fix goal map keys** to match new step3 option labels

### 3. `src/components/screens/MyMoneyScreen.tsx` - Tetris Redesign Refinements
- **Summary bar at TOP** (not bottom): Move the dark summary bar from `bottom: 0` to `top: 0` with `border-radius: 20px 20px 0 0`. Adjust container `paddingTop: 52px`
- **INCOME watermark**: Position below the summary bar at `top: 48px`
- **Parent blocks SOLID opaque**: Change from `rgba(255,255,255,0.05)` to solid colors: Spending `#8E44AD`, Fixed `#5D6D7E`, Goals `#E91E63`, Savings `#2980B9`
- **Proportional block sizing**: Update `getSpans` thresholds: >0.35 = col:2/row:2, >0.25 = col:2/row:1, >0.12 = col:1/row:2, else col:1/row:1
- **Sub-block proportional sizing**: Add `getSubSpans` function for blocks within parents (Rent visibly larger than Transport)
- **"+" add block button**: Inline creation form with icon picker, name input, amount input, Create/Cancel buttons inside Spending and Fixed parent grids
- **Goals parent shows 4 rows** (not 3), with contrasting progress bar colors on pink background
- **Goal progress bar colors**: House sky blue, Car gold, Vacation hot pink, Laptop orange
- **Remove separate impact summary** below the container (all info is in the top summary bar now)
- **Remove green from any non-income element**: Ensure Dumbbell icon tint is not green, etc.

### 4. `src/components/screens/MyWorldScreen.tsx` - Goal Image Mapping
- **Simplify `getGoalImage`**: Map goals to EXACTLY these files: house3, car2, vacation2, laptop3. No progress-based numbering. One image per goal type.
- **Update `getDreamImage`** similarly
- **Remove unused imports** for numbered variants not needed
- **Goal positions**: Ensure 4 goals can be shown with x positions at 15%, 38%, 62%, 85%

### 5. `src/components/screens/ProfileScreen.tsx` - Demo Data Updates
- **4 demo goals** (not 2): Dream House (75% funded, saved 30000/40000), New Car (50%, 5000/10000), Vacation (50%, 1000/2000), New Laptop (75%, 1875/2500)
- **Goal fields**: Use AppContext Goal interface fields (`target`, `saved`) not `targetAmount`/`savedAmount`

### 6. Asset Copies
- Copy uploaded `House3-2.png` to `src/assets/world/house3.png`
- Copy uploaded `vacation.2.png` to `src/assets/world/vacation2.png`
- Copy uploaded `laptop3.png` to `src/assets/world/laptop3.png`

## Key Data Flow Notes

### AppContext Goal interface uses `target`/`saved`
```
{ id, name, icon, target, saved, monthlyContribution, targetDate, monthIndex }
```
But MyWorldScreen reads `targetAmount`/`savedAmount` from localStorage. This mismatch needs fixing -- MyWorldScreen should use the same field names as AppContext.

### Clarity Score Breakdown Calculation
Uses existing `calculateClarityScore()` which returns `{ total, spending, saving, planning }`. The breakdown screen will display these three sub-scores with their maximums (spending/40, saving/35, planning/25).

### Auto-advance Logic
In the `single` case of `QuestionInput`, after `onChange(label)`, the parent component detects the change and triggers a 400ms timeout before calling `handleNext()`. Same for `quiz` and `scale5` types. A ref tracks whether auto-advance is pending to prevent double-fires.

## Implementation Order
1. Copy 3 asset files
2. Update `profileData.ts` (Clarity questions restructure)
3. Update `QuestionnaireOverlay.tsx` (auto-advance, score breakdown, goal map)
4. Update `MyMoneyScreen.tsx` (summary bar position, solid blocks, proportional sizing, add block)
5. Update `MyWorldScreen.tsx` (simplified image mapping, field name fix)
6. Update `ProfileScreen.tsx` (4 demo goals)

