

# Budget Tool Implementation Plan

## Overview

A fully functional budgeting tool for the JFB app that replaces the placeholder on tab 3. The tool starts empty, allows users to build their budget from scratch via a setup wizard, and persists all data to localStorage. All numbers calculate dynamically with zero hardcoded demo data.

---

## Architecture

### New Files to Create

```text
src/context/BudgetContext.tsx          # Budget state management + localStorage
src/components/screens/BudgetScreen.tsx # Main budget screen with 3 tabs
src/components/budget/SetupWizard.tsx   # First-time setup flow (4 steps)
src/components/budget/OverviewTab.tsx   # Flex hero, breakdown, weekly pulse
src/components/budget/CategoriesTab.tsx # Category list with expand/edit
src/components/budget/IncomeTab.tsx     # Month navigator, income list
src/components/budget/AddTransactionSheet.tsx  # FAB transaction sheet
src/components/budget/FixedExpensesSheet.tsx   # Edit fixed expenses
src/components/budget/EditBudgetSheet.tsx      # Settings/reset sheet
src/components/budget/NumberKeypad.tsx  # Custom 4x3 keypad component
src/components/budget/ProgressRing.tsx  # Reusable SVG progress ring
```

### Files to Modify

```text
src/App.tsx  # Replace Budget PlaceholderScreen with BudgetScreen wrapped in BudgetProvider
```

---

## Data Model

### Types

```typescript
type Transaction = {
  id: string;              // crypto.randomUUID()
  amount: number;          // always positive
  type: 'expense' | 'income';
  categoryId: string;
  description: string;
  date: string;            // ISO date
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'biweekly' | 'monthly';
};

type Category = {
  id: string;
  name: string;
  icon: string;            // Lucide icon name
  monthlyBudget: number;
  type: 'expense' | 'fixed' | 'savings';
  sortOrder: number;
};

type BudgetConfig = {
  monthlyIncome: number;
  monthlySavingsTarget: number;
  setupComplete: boolean;
};
```

### Computed Values (recalculated on every state change)

| Value | Formula |
|-------|---------|
| totalIncome | budgetConfig.monthlyIncome |
| totalFixed | sum of monthlyBudget where type === 'fixed' |
| savingsTarget | budgetConfig.monthlySavingsTarget |
| flexBudget | totalIncome - totalFixed - savingsTarget |
| flexSpent | sum of expenses in current month for 'expense' categories |
| flexRemaining | flexBudget - flexSpent |
| dailyAllowance | max(0, flexRemaining / daysRemaining) |
| percentSpent | (flexSpent / flexBudget) * 100 |
| percentMonth | (dayOfMonth / daysInMonth) * 100 |
| paceStatus | 'on-track' / 'watch' / 'slow-down' based on thresholds |

---

## BudgetContext Implementation

### State Structure
- `config`: BudgetConfig object
- `categories`: Category[]
- `transactions`: Transaction[]

### localStorage Persistence
- Key: `jfb-budget-data`
- Load on mount, save on every state change
- Handles missing/corrupted data gracefully

### Helper Functions
- addTransaction, deleteTransaction
- addCategory, updateCategory, deleteCategory
- updateConfig
- getCategorySpent(catId, period)
- getCategoryRemaining(catId, period)
- getWeekTransactions(weekStart, weekEnd)
- resetMonth()

---

## Component Details

### SetupWizard (4-Step Flow)

Shows when `config.setupComplete === false`

**Step 1: Income**
- Wallet icon header
- Large centered amount display (builds via keypad)
- Custom number keypad (4x3 grid)
- "Next" button (disabled until amount > 0)

**Step 2: Fixed Expenses**
- Lock icon header
- Empty list with "Add expense" button
- Inline add form: icon picker row, name input, amount input, confirm button
- Each item shows: icon + name + amount + remove button
- Running total at bottom
- Creates Category entries with type='fixed'

**Step 3: Savings**
- PiggyBank icon header
- Amount input with keypad
- Live preview: "This leaves X for spending"
- Amber warning if negative flex budget

**Step 4: Spending Categories**
- ShoppingBag icon header
- Quick-add suggestion pills (Food, Shopping, Transport, etc.)
- Added categories appear in list with editable budget amounts
- "Allocated: X of Y" indicator with bar visualization
- "Done" sets setupComplete=true

### BudgetScreen Main Layout

**Header**
- Frosted pill tabs: Overview | Categories | Income
- Sliders icon button (opens EditBudgetSheet)

**FAB (Floating Action Button)**
- Purple gradient circle, Plus icon
- Fixed bottom-right, visible on all tabs
- Opens AddTransactionSheet

### OverviewTab

**Flex Number Hero Card**
- "Available to spend" label
- Large flexRemaining value (amber if negative)
- "of X flex budget" subtitle
- Progress bar at percentSpent
- Daily allowance on left, pace status pill on right

**Flex Breakdown Card**
- Income row (taps to Income tab)
- Fixed expenses row (taps to FixedExpensesSheet)
- Savings row (taps to Goals tab)
- Spent so far row (taps to Categories tab)
- Available row in bold

**Weekly Pulse**
- Horizontal scroll of week cards
- Each shows: week label, spent amount, mini progress
- Current week has purple border + daily allowance
- Past weeks muted, future weeks show "Upcoming"

### CategoriesTab

**Toggle**
- Weekly / Monthly pills at top

**Category Cards**
- Icon + name + "spent / budget"
- "X left" indicator (green/amber/red)
- Progress ring (SVG) + progress bar
- Tap to expand: shows transactions, "Edit budget" option
- Tap header again to collapse

**Unallocated Row**
- Shows if flexBudget minus allocated differs from zero

**Add Category Row**
- Plus icon, inline form to create new category

### IncomeTab

**Month Navigator**
- "[Month Year]" with ChevronLeft/Right arrows
- Changes displayed month

**Summary Card**
- Income total (green)
- Expenses total (white)
- Savings target (purple)
- Divider + Net result

**Income Entries List**
- Wallet icon + source + date + amount (green)
- Swipe left to delete
- Empty state with "Add income" button

**Add Income Row**
- Source input, amount, date picker, recurring toggle

### AddTransactionSheet

**Layout**
- Type toggle: Expense | Income pills
- Large amount display center
- Custom 4x3 keypad
- Category selector (horizontal scroll, expense mode only)
- Description input with autocomplete from history
- Date selector: Today | Yesterday | Calendar
- Recurring toggle with frequency pills
- Save button with validation

**Behavior**
- Creates Transaction with unique ID
- Closes sheet on save
- All computed values update immediately
- Brief pulse animation on Flex Number

### FixedExpensesSheet

- Lists all type='fixed' categories
- Each row: icon + name + amount/month
- Tap to edit amount inline
- Swipe left for delete (with confirmation)
- Total at bottom
- Add row with inline form

### EditBudgetSheet

- Monthly income (tappable to edit)
- Savings target (tappable to edit)
- "Reset month" button (clears transactions, keeps config)
- "Edit categories" list with drag reorder + swipe delete

### NumberKeypad Component

Reusable 4x3 grid:
```text
1   2   3
4   5   6
7   8   9
.   0   ⌫
```

- Frosted glass circle buttons (52px)
- Builds amount string: handles decimal, max 2 places after
- Delete icon from Lucide (backspace)

---

## Styling Consistency

All components follow existing design system:
- `.glass` class for frosted surfaces
- `.gradient-primary` for purple-to-pink gradients
- `rounded-3xl` for cards, `rounded-2xl` for inner elements
- Lucide icons only (20-24px, 1.5px stroke)
- White text with /60 and /50 opacity variants
- Framer Motion for all animations and transitions
- Inter font throughout

---

## Empty States

| Scenario | Display |
|----------|---------|
| No setup done | Full SetupWizard overlay |
| No transactions in category | "No spending yet" in expanded view |
| No income entries | "No income recorded" + Add button |
| Flex budget is 0 | "Set your income to get started" amber |
| Flex budget negative | "Fixed costs + savings exceed income" amber |

---

## Implementation Sequence

1. **BudgetContext** - Data model, localStorage, computed values
2. **NumberKeypad** - Reusable keypad component
3. **SetupWizard** - 4-step onboarding flow
4. **BudgetScreen** - Tab container layout
5. **OverviewTab** - Hero card, breakdown, weekly pulse
6. **CategoriesTab** - Category list with expand/collapse
7. **IncomeTab** - Month navigator, income list
8. **AddTransactionSheet** - FAB transaction entry
9. **FixedExpensesSheet** - Edit fixed costs
10. **EditBudgetSheet** - Settings and reset
11. **App.tsx update** - Wire up BudgetScreen with provider

---

## Technical Considerations

- Use `crypto.randomUUID()` for unique IDs (supported in all modern browsers)
- Date calculations use native Date API with helpers for month/week boundaries
- localStorage read/write wrapped in try-catch for safety
- Category icon names stored as strings, resolved via existing iconMap pattern
- Autocomplete description matching uses case-insensitive startsWith
- Weekly budget calculated as monthlyBudget / 4.33 (average weeks per month)

