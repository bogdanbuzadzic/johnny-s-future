

# Today Drawer Micro-Simulations - Implementation Plan

## Overview

Add interactive simulation features to the Today Drawer that let users explore "what if" scenarios without affecting real data. All simulations are ephemeral (React state only, never localStorage).

---

## Architecture

### New File
- `src/context/SimulationContext.tsx` - Manages simulation state and computed values

### Modified File  
- `src/components/sheets/TodayDrawer.tsx` - Add all simulation UI components

---

## Data Model

### Simulation Type
```typescript
type Simulation = {
  id: string;
  type: 'spend' | 'cancel-bill';
  amount: number;
  date: string;           // ISO date string
  description: string;    // "Concert tickets" or "Skip Spotify"
  targetDayIndex: number; // Index in days array
};
```

### SimulationContext Provides
```typescript
{
  activeSimulations: Simulation[];
  isSimulating: boolean;
  addSimulation: (sim: Omit<Simulation, 'id'>) => void;
  removeSimulation: (id: string) => void;
  clearAllSimulations: () => void;
  
  // Computed values layered on top of real data
  simulatedFlexRemaining: number;
  simulatedDailyAllowance: number;
  getSimulatedDaySpending: (dayIndex: number) => number;
  getDayHasSimulation: (dayIndex: number) => boolean;
  getDaySimulations: (dayIndex: number) => Simulation[];
}
```

---

## Component Structure

### 1. Simulation Banner (NEW)

Appears below Month Pulse when `isSimulating === true`.

```text
┌─────────────────────────────────────────────┐
│ ✨ Simulating: €200 on Thursday          ✕  │
└─────────────────────────────────────────────┘
```

**Specifications:**
- Height: 36px
- Frosted glass (`glass-light rounded-2xl`)
- Left: Sparkles icon (16px) + simulation summary text (13px white)
- Right: X icon to clear all simulations
- Multiple simulations: "Simulating: 2 expenses" with dropdown on tap showing each

---

### 2. Interactive Daily Allowance Card (MODIFIED)

Transform existing static card into expandable simulator.

**Default State (unchanged visually):**
```text
┌─────────────────────────────────────────────┐
│ €44 / day                                   │
│ remaining for the next 7 days               │
└─────────────────────────────────────────────┘
```

**Expanded State (on tap):**
```text
┌─────────────────────────────────────────────┐
│ €44 / day                                   │
├─────────────────────────────────────────────┤
│ € [___How much would you spend?___]         │
│                                             │
│ [€20] [€50] [€100] [€200]                   │
│                                             │
│ ✓ You can afford this                       │
│ Daily budget stays at €42/day for 7 days    │
│                                             │
│                              Cancel         │
└─────────────────────────────────────────────┘
```

**State Management:**
- `isAllowanceExpanded: boolean`
- `quickSpendAmount: string` (input value)

**Result Logic:**
| Scenario | Icon | Message | Details |
|----------|------|---------|---------|
| Fits in allowance | CheckCircle (green) | "You can afford this" | "Daily budget stays at €X/day for Y days" |
| Tight but doable | AlertTriangle (amber) | "Tight but doable" | "Your daily budget drops from €44 to €X" + before/after comparison |
| Over budget | AlertCircle (amber) | "This would put you over budget" | "You'd be €X over for the month" + "Consider: wait X days" |

**Quick Amount Pills:**
- €20, €50, €100, €200
- Frosted glass pills (`glass-light rounded-full px-3 py-1.5`)
- Tap fills input instantly

**Input Styling:**
- `bg-white/15` background
- White text, 24px font size
- "€" prefix label
- Auto-focus on expand

---

### 3. Future Day "Add Hypothetical" (MODIFIED)

Enhance the expanded day detail for future days.

**Current (future day with no bills):**
```text
│ No bills scheduled                          │
```

**New (future day):**
```text
│ No bills scheduled                          │
│                                             │
│ + What if I spend...                        │
```

**When "Add hypothetical" is tapped:**
```text
│ € [____] [What for?__________]              │
│                                             │
│ [€20] [€50] [€100] [€200]                   │
│                                             │
│        [Simulate]                           │
```

**On "Simulate" tap:**
- Create simulation entry in SimulationContext
- Show simulation banner
- Calendar strip updates with simulated dot

---

### 4. "Skip Bill" Simulation (MODIFIED)

For future days with upcoming bills, add skip option.

**Current bill row:**
```text
│ 🏠 Rent                              €450   │
│    due                                      │
```

**New bill row:**
```text
│ 🏠 Rent                              €450   │
│    due                                      │
│ ✂️ What if I skip this?                     │
```

**On tap:**
- Add `cancel-bill` simulation
- Bill's hollow dot becomes green check
- Green "+€450" tag below day cell
- Daily allowance increases
- Banner shows "Simulating: skip Rent (-€450)"

---

### 5. Week-Ahead Forecast Bar (NEW)

Slim visualization between calendar strip and sparkline.

```text
┌─────────────────────────────────────────────┐
│ [█▓░] [█░░] [███] [██░] [█░░] [█▓░] [██░]  │
│   S      M     T     W     T     F     S    │
└─────────────────────────────────────────────┘
```

**Specifications:**
- Height: ~48px (32px bar + 16px labels)
- Frosted glass card (`glass rounded-2xl`)
- 7 equal-width segments for next 7 days (including today)

**Segment Layers (bottom to top):**
1. **Known bills** (amber fill): Height proportional to bill/allowance ratio
2. **Average spending** (purple/30 fill): Based on 14-day average daily spend
3. **Buffer** (transparent): Remaining space

**During Simulation:**
- Hypothetical expenses add dashed purple outline section
- Buffer space shrinks on affected and surrounding days
- Overflow (expenses > available) turns segment amber with "!" indicator

**Day Labels:**
- Single letter: "S", "M", "T", "W", "T", "F", "S"
- 9px `text-white/30`

---

### 6. Calendar Strip Simulation Visuals (MODIFIED)

When simulating, the calendar strip reacts:

**Simulated Spending Dot:**
- Larger dot size (includes hypothetical amount)
- Pulsing dashed outline animation
- CSS: `border: 2px dashed rgba(255,255,255,0.4); animation: pulse 2s infinite`

**Day with Cancelled Bill:**
- Hollow dot changes to green filled dot
- Green "+€X" tag below cell

**Insufficient Funds Warning:**
- Days where bills exceed remaining allowance get amber border
- Only during active simulation

---

### 7. Sparkline Simulation Extension (MODIFIED)

During simulation, extend the sparkline:

- Add dashed line extension for future 7 days
- Height based on simulated daily allowance
- Simulated spending spikes shown as dashed peaks

---

## Visual Indicators for Simulated State

All simulated elements use consistent visual language:

| Element | Style |
|---------|-------|
| Simulated amounts | Dashed pulsing outline |
| Simulated dots | 2px dashed white/40, animation: pulse 2s |
| Positive simulation | Green/60 text |
| Negative simulation | Amber/60 text |
| Simulated numbers | Sparkles icon adjacent |

**CSS Animation:**
```css
@keyframes simulation-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.simulation-indicator {
  border: 2px dashed rgba(255, 255, 255, 0.4);
  animation: simulation-pulse 2s ease-in-out infinite;
}
```

---

## State Management

### New State in TodayDrawer

```typescript
// Quick spend simulator (Daily Allowance card)
const [isAllowanceExpanded, setIsAllowanceExpanded] = useState(false);
const [quickSpendAmount, setQuickSpendAmount] = useState('');

// Hypothetical expense form (future days)
const [hypotheticalForm, setHypotheticalForm] = useState<{
  dayIndex: number;
  amount: string;
  description: string;
} | null>(null);
```

### SimulationContext State

```typescript
const [activeSimulations, setActiveSimulations] = useState<Simulation[]>([]);

const addSimulation = (sim: Omit<Simulation, 'id'>) => {
  setActiveSimulations(prev => [...prev, { ...sim, id: crypto.randomUUID() }]);
};

const removeSimulation = (id: string) => {
  setActiveSimulations(prev => prev.filter(s => s.id !== id));
};

const clearAllSimulations = () => {
  setActiveSimulations([]);
};
```

### Computed Values

```typescript
const simulatedFlexRemaining = useMemo(() => {
  const spendSims = activeSimulations.filter(s => s.type === 'spend');
  const cancelSims = activeSimulations.filter(s => s.type === 'cancel-bill');
  
  const totalSpend = spendSims.reduce((sum, s) => sum + s.amount, 0);
  const totalCancelled = cancelSims.reduce((sum, s) => sum + s.amount, 0);
  
  return flexRemaining - totalSpend + totalCancelled;
}, [activeSimulations, flexRemaining]);

const simulatedDailyAllowance = useMemo(() => {
  return Math.max(0, simulatedFlexRemaining / daysRemaining);
}, [simulatedFlexRemaining, daysRemaining]);
```

---

## Implementation Sequence

1. **Create SimulationContext** - State, actions, computed values
2. **Add simulation CSS** - Pulsing dashed outline animation
3. **Modify Daily Allowance card** - Add expand/collapse, input, quick pills, result display
4. **Add Simulation Banner** - Shows when simulating, X to clear
5. **Modify future day detail** - Add "What if I spend..." option
6. **Add hypothetical form** - Amount, description, simulate button
7. **Add "Skip bill" option** - For upcoming bills in expanded view
8. **Create Week-Ahead Forecast Bar** - Segmented visualization
9. **Update calendar strip dots** - Simulation visual indicators
10. **Update sparkline** - Dashed projection extension
11. **Wire up all interactions** - Test complete flow

---

## Integration Points

### With BudgetContext
- Read: `flexRemaining`, `dailyAllowance`, `daysRemaining` for base calculations
- Read: Mock data values for prototype (since TodayDrawer uses static data)

### With TodayDrawer
- Wrap content in SimulationProvider
- Pass simulation state to calendar cells, sparkline, forecast bar
- Handle expand/collapse of Daily Allowance card
- Handle hypothetical form in future day details

---

## Technical Notes

- All simulations are ephemeral React state, never persisted
- Clearing simulations instantly reverts all visuals to real data
- Multiple simulations can stack (budget calculations compound)
- Future day simulations require date math for "days until" calculations
- Forecast bar segments use SVG for precise height control
- Input auto-focus uses `useRef` + `useEffect` on expand

