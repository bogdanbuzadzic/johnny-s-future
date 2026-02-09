

# Johnny's Path - Terrain Visualization Build

## Overview

Replace everything below the Month Pulse and Daily Allowance cards in the Today Drawer with a new "Johnny's Path" terrain visualization. This is a horizontally scrollable SVG landscape where the Y-axis represents balance, terrain rises on income and drops on expenses, and Johnny sits at today's position. Includes a "What if?" Playground Mode for interactive simulations.

---

## Architecture

### Files Modified
- `src/components/sheets/TodayDrawer.tsx` - Complete rewrite of content below the two hero cards. Replace calendar strip, forecast bar, sparkline, and summary bar with terrain SVG, date axis, and "What if?" button/toolbar.
- `src/context/SimulationContext.tsx` - Add terrain-specific simulation type (`add-expense`, `add-income`, `cancel-bill`) and `playgroundMode` / `selectedTool` state.

### What Gets Removed
- Mini Calendar Strip (horizontal day cells)
- Expanded Day Detail section
- Week-Ahead Forecast Bar
- Upcoming Summary Bar
- Spending Sparkline card
- All hypothetical form UI
- Quick spend simulator in Daily Allowance card

### What Gets Added
- SVG terrain area (220px tall, horizontally scrollable)
- Transaction markers (obstacle blocks for expenses, green circles for income)
- Date axis with tick marks and week labels
- Johnny on the terrain at today's position with reactions
- "What if?" button and Playground Mode toolbar
- Playground interaction bubbles for adding simulated expenses/income
- "Today" snap-back pill when scrolled away

### What Stays Unchanged
- Month Pulse hero card
- Daily Allowance card (reverts to static, non-expandable)
- Johnny's Tip card at bottom
- Simulation Banner (adapted for terrain simulations)
- Drawer mechanics (slide from top, drag to dismiss)

---

## Data Model

### Terrain Point
```typescript
interface TerrainPoint {
  dayIndex: number;
  date: Date;
  balance: number;
  income: number;        // income arriving this day
  expenses: number;      // specific bills/expenses this day
  dailySpend: number;    // organic daily spending
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  label: string;         // day number or week label
  bills: { name: string; amount: number; icon: LucideIcon }[];
  incomeItems: { name: string; amount: number; icon: LucideIcon }[];
}
```

### Terrain Simulation (replaces old Simulation type)
```typescript
type TerrainSimulation = {
  id: string;
  type: 'add-expense' | 'add-income' | 'cancel-bill';
  amount: number;
  dayIndex: number;
  description: string;
  originalBillId?: string;
};
```

### SimulationContext additions
- `playgroundMode: boolean`
- `selectedTool: 'income' | 'expense'`
- `setPlaygroundMode(on: boolean)`
- `setSelectedTool(tool: 'income' | 'expense')`
- Terrain-aware computed values that recalculate balance array with simulations layered

---

## Data Generation

Build terrain from budget state (with fallbacks):
- `monthlyIncome`: 2400 (fallback)
- `flexRemaining`: 738 (fallback)
- `flexBudget`: 2060 (fallback)
- `averageDailySpend`: 37 (fallback)

### Event Data (fallbacks)
Past transactions:
- Feb 3: Electricity, Zap icon, -60
- Feb 6: Insurance, Shield icon, -30
- Feb 8: Groceries, ShoppingCart icon, -100

Upcoming bills:
- Feb 28: Rent, Home icon, 450
- Mar 1: Phone, Smartphone icon, 25
- Mar 3: Spotify, Music icon, 10
- Mar 5: Gym, Dumbbell icon, 50

Income:
- Mar 1: Salary, Wallet icon, +2400

### Balance Calculation
```
let balance = monthlyIncome  // Feb 1 start
for each day from Feb 1 to today + 30:
  balance += incomeOnThisDay
  balance -= billsOnThisDay
  if past/today: balance -= actualSpending
  else: balance -= averageDailySpend
  points.push({ day, balance, ... })
```

---

## SVG Terrain Rendering

### Dimensions
- Each day = 44px wide
- Total width = numDays * 44px (scrollable)
- Height = 220px
- Y mapping: max balance -> ~170px from bottom, zero -> ~10px

### Path Construction
1. Start at bottom-left (0, height)
2. Move up to first balance point
3. For each subsequent point:
   - If day has specific expense: sharp drop (steep bezier or near-vertical)
   - If day has income: sharp rise (steep bezier upward)
   - If gradual daily spend only: smooth bezier curve (gentle downward slope)
4. Drop to bottom-right, close path

Use monotone cubic interpolation for smooth sections, override with steep control points at transaction days.

### Fill Gradient (vertical, height-based)
```
<linearGradient id="terrainGradient" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
  <stop offset="50%" stopColor="#FF6B9D" stopOpacity="0.25" />
  <stop offset="100%" stopColor="#FF9F0A" stopOpacity="0.25" />
</linearGradient>
```

### Surface Line
- 2px stroke, white at 50% opacity, tracing top edge of terrain

### Baseline
- 1px horizontal line at SVG bottom, white/8

### Altitude Labels
- Right edge, 2-3 faint labels: "500", "1,000", "1,500" in 9px white/12

### Past Terrain
- Fill opacity reduced to 25% of normal for days before today
- Achieved by clipping or drawing past section with lower opacity

---

## Transaction Markers

### Expense Obstacles
- Rounded rectangle (28px tall, width 20-44px proportional to amount)
- Position: ON the surface line at the cliff's top edge (before drop)
- Fill: white/10, border: white/15, rounded 6px
- Inside: category Lucide icon (14px, white/50)
- Below obstacle (inside terrain): amount label "450" in 10px white/35
- Vertical dotted line (1px white/8) from obstacle down to baseline
- Icon mapping: Home=rent, Zap=electricity, Shield=insurance, ShoppingCart=groceries, Smartphone=phone, Music=spotify, Dumbbell=gym

### Income Markers
- Circle (28px, white/15 fill, green/20 border)
- Position: ON surface at rise bottom (before terrain goes up)
- Inside: Wallet icon (14px, green/50)
- Amount label above peak: "2,400" in 10px green/40
- Vertical dotted line (1px green/10) from marker up
- Green tint overlay (#34C759 at 15%) on rising terrain section

### Daily Spend Label
- ONE instance on the longest gradual decline stretch
- "~37/day" in 9px white/12, positioned below surface line inside fill

---

## Date Axis (32px strip below terrain)

- Scrolls in sync with terrain (same scrollable container)
- Tick marks at each day: 6px tall, white/12
- Every 7th tick: 10px tall, white/20
- Day numbers: 9px white/15
- Week labels every 7 days: "Feb 9", "Feb 16", etc. in 10px white/35 (replace day number)
- Month boundary: "Mar 1" format
- Today's tick: white/50, 2px thick, label "Today" in 10px white/50
- Small upward triangle (5px, white/30) above today's tick

---

## Johnny on Terrain

- 48px image positioned at today's x, bottom edge on surface line
- Faces right
- Idle animation: `translateY` -4px to 0, 2s ease-in-out infinite (framer-motion)

### Reactions (based on next 7 days terrain)
- Calculate average height of next 7 days vs today
- Level/rising: no additions
- Moderate drop (20-40% loss): thought bubble - three ascending circles (4px, 7px, 12px, white/15) with "..." in 8px white/30
- Severe drop (>40% loss): sweat drop SVG (8px teardrop, white/30) near head

---

## Scroll Behavior

- Default: today at ~15% from left edge
- Smooth horizontal scroll with momentum
- "Today" snap-back pill: appears when scrolled far from today
  - Frosted glass, white/20, "Today" in 10px text
  - Bottom-left of terrain area, absolute positioned
  - Tap scrolls back to Johnny

---

## "What if?" Button and Playground Mode

### Default State
- Full-width button below terrain/date axis
- Frosted glass (white/12, white/15 border), 48px tall
- Sparkles icon (20px) + "What if?" in 15px white semibold

### Playground Mode Active
Button morphs (300ms) into toolbar:
- Left: two pills side by side
  - Green pill: ArrowUp icon + "Income" (white/15 fill, green/20 border)
  - Pink pill: ArrowDown icon + "Expense" (white/15 fill, pink/20 border)
  - "Expense" pre-selected (brighter border)
- Right: "Done" in 13px white/50

### Visual Changes in Playground
- Pulsing dashed border around terrain (2px dashed white/10, 3s pulse)
- "Playground" label + Sparkles icon in 9px white/20, top-right of terrain

### Tapping Future Terrain
- Map tap x-position to day index
- Show frosted glass bubble (130px wide, 44px tall) above terrain at that point
- Contains: "€" prefix + number input (18px white, auto-focus) + CircleCheck button (20px)
- Date label below: "Thu, Feb 27" in 9px white/25
- Border tint: green for income, pink for expense
- As amount is typed: terrain recalculates and animates (500ms spring)
  - Expense: cliff forms, subsequent terrain drops
  - Income: rise forms, subsequent terrain lifts
- Impact text: "37/day becomes 31/day" in 11px white/35
- CircleCheck confirms: bubble closes, simulation persists with dashed outline marker
- Tap outside: cancels, terrain snaps back

### Tapping Real Obstacle in Playground
- Shows bubble: bill name + amount (14px) + Scissors icon (24px circle)
- "Skip this?" in 11px white/35
- Scissors tap: obstacle fades out (300ms), terrain rises (500ms spring), green flash, Johnny bounces (translateY -16px, spring back), "+amount" floats up and fades
- Stored as cancel-bill simulation

### Tapping Simulated Marker
- CircleX icon (20px, white/30) appears
- Tap removes simulation, terrain smoothly returns

### Multiple Simulations
- Stack cumulatively
- Toolbar shows badge: "3 changes" in 9px white/30

### Exiting Playground ("Done")
- Simulated markers dissolve left-to-right (600ms)
- Terrain morphs back to real data (500ms spring)
- Toolbar morphs back to button
- Dashed border disappears
- All simulation state cleared

---

## SVG Layer Order (bottom to top)

1. Baseline (1px white/8 horizontal)
2. Terrain fill (gradient, closed path)
3. Green tint overlays on income sections
4. Past terrain dimming overlay
5. Terrain surface line (2px white/50)
6. Vertical dotted connector lines
7. Obstacle blocks (expense markers)
8. Income markers (green circles)
9. "~37/day" label
10. Johnny (at today's position)
11. Simulation overlays (dashed markers, playground mode)
12. Interaction bubbles (playground mode)
13. Altitude labels (right edge)

---

## State Management

### New state in TodayDrawer
```typescript
const [playgroundMode, setPlaygroundMode] = useState(false);
const [selectedTool, setSelectedTool] = useState<'income' | 'expense'>('expense');
const [terrainSimulations, setTerrainSimulations] = useState<TerrainSimulation[]>([]);
const [activeBubble, setActiveBubble] = useState<{
  dayIndex: number;
  amount: string;
  type: 'new' | 'existing-bill';
  billName?: string;
} | null>(null);
const [showTodayPill, setShowTodayPill] = useState(false);
```

### Scroll tracking for "Today" pill
```typescript
const handleScroll = () => {
  if (!scrollRef.current) return;
  const todayX = todayIndex * 44;
  const scrollLeft = scrollRef.current.scrollLeft;
  const viewWidth = scrollRef.current.offsetWidth;
  const todayVisible = todayX > scrollLeft && todayX < scrollLeft + viewWidth;
  setShowTodayPill(!todayVisible);
};
```

---

## Implementation Steps

1. Update SimulationContext with terrain simulation types and playground state
2. Rewrite TodayDrawer: remove calendar strip, forecast bar, sparkline, summary bar
3. Build terrain data generator (balance calculation with real/fallback data)
4. Build SVG terrain renderer (path generation, gradient fill, surface line)
5. Add transaction markers (obstacles and income circles) positioned on terrain
6. Add date axis with tick marks, labels, today marker
7. Position Johnny on terrain with bob animation and reactions
8. Add scroll container, default position, and "Today" snap-back pill
9. Add "What if?" button
10. Build Playground Mode: toolbar morph, tap-to-add bubbles, terrain recalculation
11. Build obstacle interaction (scissors to skip bills)
12. Add simulation visual indicators (dashed outlines, dissolve animations)
13. Wire up "Done" to clear all and animate back to real data

