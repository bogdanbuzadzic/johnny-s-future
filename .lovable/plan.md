

# Plan: Insurance Decision Tool

## Overview

Add an Insurance Decision Tool as a new module in the Compare sheet, with 3 sub-tools: Risk Profile wizard, Worth-It Calculator, and Deductible Optimizer. This involves modifying `CompareSheet.tsx` and creating 4 new files.

---

## Step 1: Add Entry Point in CompareSheet

**File: `src/components/budget/CompareSheet.tsx`**

- Extend `CompareMode` type to include `'insurance'`
- Add 4th menu item: "Do I Need Insurance?" with desc "Evaluate if insurance is worth it for you"
- Fix `borderBottom` condition from `i < 2` to `i < 3` (now 4 items)
- Add `{mode === 'insurance' && <InsuranceToolHome ... />}` route
- Import `InsuranceToolHome` from new file
- `maxHeight` for insurance mode: `85vh` (already handled by the non-menu fallback)

---

## Step 2: Insurance Tool Home

**New file: `src/components/insurance/InsuranceToolHome.tsx`**

Landing screen with internal state `activeView: 'home' | 'profile' | 'worth-it' | 'deductible'`.

- When `activeView === 'home'`: shows header, Johnny intro (dark variant using `JohnnyMessage`), and 3 tool cards (Shield/Scale/GitCompare icons)
- Risk Profile card: shows "Complete" badge or "Start" based on `jfb_insurance_profile` in localStorage
- Worth-It and Deductible cards: locked if no profile, unlocked if profile exists
- Each card click sets `activeView` to the sub-tool
- Sub-views render `RiskProfileWizard`, `WorthItCalculator`, or `DeductibleOptimizer` with `onBack` returning to home

Card styling: dark background `rgba(255,255,255,0.04)`, border `rgba(255,255,255,0.06)`, rounded 14px, padding 16px, icon + title + description layout.

---

## Step 3: Risk Profile Wizard

**New file: `src/components/insurance/RiskProfileWizard.tsx`**

6-step wizard with progress bar. Each step renders a question with segmented pill buttons or radio options.

- Steps: Net Worth, Annual Income, Dependents, Emergency Savings, Housing, Risk Tolerance
- Pre-populates from budget config (`monthlyIncome * 12`) if available
- Pre-populates from existing `jfb_insurance_profile` if editing
- Segmented button styling: flex-wrap pills, violet highlight when selected
- Navigation: Back/Next buttons, step indicator "Step X of 6"
- On finish: saves to `localStorage('jfb_insurance_profile')`, shows completion message, calls `onBack()`
- Privacy note on step 1

---

## Step 4: Worth-It Calculator

**New file: `src/components/insurance/WorthItCalculator.tsx`**

Input section:
- Insurance category: 2-column card grid (8 types with lucide icons)
- Value at Risk: currency input with category-specific help text
- Annual Premium: currency input with monthly/annual toggle
- Deductible: currency input (shown only for applicable categories)

Results section (shown after "Analyze" button):
- Loads risk profile from localStorage
- Calculates `proportionalLoss = (valueAtRisk - deductible) / netWorth` adjusted by risk tolerance
- Verdict: SKIP (<5%), CONSIDER (5-20%), BUY (20-50%), ESSENTIAL (>50%)
- Verdict card: colored left border, icon, title, proportional loss bar, explanation text
- Special cases: extended warranty < €1000, life insurance + no dependents
- Johnny insight adapts to verdict
- "What to do instead" card for SKIP verdict
- Integration: if BUY/ESSENTIAL, Johnny suggests adding premium to Fixed expenses

---

## Step 5: Deductible Optimizer

**New file: `src/components/insurance/DeductibleOptimizer.tsx`**

Input: two side-by-side columns (Plan A low deductible, Plan B high deductible) with premium, deductible, and OOP max inputs.

Results:
- Scenario table: No claims / One claim / Multiple claims with cost for each plan and savings
- Financial domination check: if Plan A costs more in every scenario, show amber warning
- Key insight card with break-even years calculation
- Emergency fund context from risk profile
- Johnny insight adapts to recommendation

---

## Step 6: Cross-Tool Integration

- Pre-populate Risk Profile annual income from `config.monthlyIncome * 12`
- Worth-It and Deductible tools check `jfb_insurance_profile` exists before allowing use
- History storage in `jfb_insurance_history` (array, for future use)
- BUY/ESSENTIAL verdict: Johnny CTA to add premium to Fixed expenses

---

## Files Changed

| File | Action |
|------|--------|
| `src/components/budget/CompareSheet.tsx` | Modified (add insurance mode + import) |
| `src/components/insurance/InsuranceToolHome.tsx` | New |
| `src/components/insurance/RiskProfileWizard.tsx` | New |
| `src/components/insurance/WorthItCalculator.tsx` | New |
| `src/components/insurance/DeductibleOptimizer.tsx` | New |

