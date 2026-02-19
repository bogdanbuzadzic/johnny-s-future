

# Purchase Decision Engine v2

## Overview
Replace the existing "Can I Afford" input bar and simple answer text with a full Purchase Decision Engine featuring: dual-field input (amount + description), purchase type classification, contextual analysis per type, value-aligned suggestions, and merged goal impact + trade-off section.

## Architecture

A new component `PurchaseDecisionSheet.tsx` will handle the entire flow (type selector, decision card, all metrics, actions). The existing "Can I Afford" section in `MyMoneyScreen.tsx` (lines 833-881) will be replaced with the new dual-input bar inside the green income container, and the sheet will be triggered on submit.

## Files to Create

### `src/components/budget/PurchaseDecisionSheet.tsx` (NEW -- ~700 lines)

Contains the full decision engine as a bottom sheet with three phases:

**Phase 1: Purchase Type Selector**
- Bottom sheet with 4 tappable cards in 2x2 grid (Habit, One-time, Experience, Tool/Investment)
- Light frosted glass style (rgba(255,255,255,0.85), backdrop-filter blur(24px))
- Tapping a type highlights it (border = type color), waits 300ms, transitions to Phase 2

**Phase 2: Decision Card**
- Replaces type selector in same sheet position
- Handle bar at top (#D1C8E0)
- Header: amount + description + type pill + verdict pill (Comfortable/Tight/Over)
- Universal metrics (3 frosted cards):
  1. Hours of Work (income/160 = hourly rate, amount/hourlyRate = hours)
  2. Time to Recover (amount / freeMonthly, with contextual text)
  3. What You're Giving Up (goal delays sorted by impact + category comparison)
- Type-specific metric (4th card, varies):
  - Habit: Payback analysis with inline habit cost input + frequency pills
  - One-time: Reality check (1 week/1 month/1 year prompts + behavioral quote)
  - Experience: Friend-split calculator with 1/2/3/4+ pills, recalculates metrics
  - Tool: ROI calculator with monthly value input

**Additional sections:**
- Alternatives card (purple-tinted, persona + value-based suggestions, max 3)
- Cooling period card (teal-tinted, persona-adapted text + "Remind me in 24h" button; replaced with time-sensitivity note for Experience type)
- Mini before/after visual (two side-by-side state cards with health bars + free/daily comparison)

**Action buttons (sticky bottom):**
- "Buy it" -- green gradient, creates transaction, dismisses, shows toast
- "Wait 24h" -- subtle bordered, saves reminder to localStorage, shows toast
- "Skip" -- text-only, dismisses everything

**Edge case:** Amount > income shows simplified "make it a goal" card instead.

**Props:**
```typescript
interface PurchaseDecisionSheetProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  description: string;
  // Budget data passed from parent
  income: number;
  flexBudget: number;
  flexSpent: number;
  flexRemaining: number;
  freeAmount: number;
  daysRemaining: number;
  daysInMonth: number;
  expenseCategories: Category[];
  categorySpentMap: Record<string, number>;
  goals: Goal[];
  onBuyIt: (amount: number, description: string, categoryId: string) => void;
}
```

**Helper functions inside the component:**
- `deriveValues()` -- reads persona from localStorage, returns value tags
- `getVerdictInfo(amount, flexRemaining, flexBudget)` -- returns verdict pill data
- `calculateGoalDelays(amount, goals)` -- returns sorted delay list
- `getCategoryComparison(amount, categories)` -- returns best comparison text
- `getCoolingText(persona)` -- returns persona-adapted cooling message
- `getAlternatives(persona, purchaseType, values)` -- returns max 3 suggestions

## Files to Modify

### `src/components/screens/MyMoneyScreen.tsx`

**Remove (lines 210-238):** Old `affordInput`, `affordCatId`, `showCatPicker`, `affordNum`, `affordAnswer` state and logic.

**Add new state:**
```typescript
const [purchaseAmount, setPurchaseAmount] = useState('');
const [purchaseDesc, setPurchaseDesc] = useState('');
const [showDecisionSheet, setShowDecisionSheet] = useState(false);
const [reminderDismissed, setReminderDismissed] = useState(false);
```

**Add reminder banner logic:** On mount, check `localStorage.getItem('jfb_reminder')`. If exists and 24h has passed, show banner at top of screen. "Yes, buy it" triggers transaction + dismisses. "Skip" removes reminder.

**Replace "Can I Afford" section (lines 833-881):** Remove the old frosted-input bar that sits above the income container. Instead, add the new dual-input bar INSIDE the green income container, below the summary bar.

**New input bar (inside green container, after summary bar around line 957):**
- Style: rgba(255,255,255,0.12), backdrop-filter blur(8px), 14px border-radius, 48px height
- Left: Bell icon (white/40) + "EUR" prefix (white/50) + amount input (70px, white text, placeholder "0" in white/30)
- Divider: 1px white/15, 20px tall
- Description input (flex:1, white text, placeholder "What is it?" in white/30)
- Right: ArrowRight in 32px gradient circle (#8B5CF6 to #EC4899), disabled until amount > 0
- On submit: opens `PurchaseDecisionSheet`

**Remove ghost pulse on spending block** (line 741, `isGhosting` logic) -- the new engine replaces the ghost effect.

**`onBuyIt` handler:** Creates transaction via `addTransaction`, shows toast via `sonner`, clears inputs, closes sheet.

**Remove old afford answer display and "Buy it" / "Clear" buttons (lines 866-880).**

### `src/components/budget/ghost-pulse.css`
No changes needed -- keep the file but the ghost effect won't be triggered by the new flow.

## Design System Compliance

All elements follow the established design system:
- Decision card background: rgba(255,255,255,0.88), backdrop-filter blur(24px)
- Text colors: #2D2440 (primary), #5C4F6E (secondary), #8A7FA0 (tertiary)
- White text ONLY inside green container input bar (dark background)
- Metric cards: rgba(255,255,255,0.45) with white/50 border
- Frosted inputs for habit/ROI: rgba(255,255,255,0.6) with colored borders
- Box shadows: rgba(45,36,64,...) for warmer tones
- No "Other" or "Personal" category references -- only Food, Entertainment, Shopping, Lifestyle
- All persona names match: Money Avoider, Impulsive Optimist, Present Hedonist, Vigilant Saver, Confident Controller, Steady Saver

## Implementation Order

1. Create `PurchaseDecisionSheet.tsx` with all phases, metrics, and actions
2. Modify `MyMoneyScreen.tsx`: remove old afford logic, add new input bar inside income container, wire up sheet + reminder banner

## Key Calculations

```
hourlyRate = income / 160
hoursOfWork = amount / hourlyRate
workdays = ceil(hours / 8)

monthsToRecover = free > 0 ? ceil(amount / free) : Infinity

goalDelay = amount / goal.monthlyContribution (per goal, sorted desc)

verdict: flexRemaining - amount > 0 and > 30% of flexBudget = Comfortable
         flexRemaining - amount > 0 = Tight
         flexRemaining - amount <= 0 = Over

beforePct = (categorySpent / categoryBudget) * 100
afterPct = ((categorySpent + amount) / categoryBudget) * 100
afterFree = freeAmount - amount
afterDaily = (flexBudget - flexSpent - amount) / daysRemaining
```

