

# Today Drawer v3 - Timeline Redesign

## Overview

Complete redesign of the Today Drawer content below the Month Pulse and Daily Allowance cards. Replace the existing timeline card with a compact calendar-based view that shows financial activity across days.

---

## Architecture

### File Modified
- `src/components/sheets/TodayDrawer.tsx` - Complete rewrite of content below the two hero cards

### What Gets Removed
- Unified Timeline Card with date group headers
- All transaction rows with icon circles
- "Upcoming" separator section
- Upcoming bills list
- "View all transactions" link

### What Gets Added
- Mini Calendar Strip (horizontal scrollable day cells)
- Expanded Day Detail (shows when day is tapped)
- Upcoming Summary Bar (compact "Next 7 days" banner)
- Spending Sparkline (14-day area chart)

### What Stays Unchanged
- Month Pulse hero card (lines 131-153)
- Daily Allowance card (lines 155-159)
- Johnny's Tip card (lines 260-275)
- Drawer mechanics (slide from top, drag to dismiss)

---

## Component Structure

### 1. Mini Calendar Strip

A single frosted glass card containing a horizontally scrollable week view.

```text
┌─────────────────────────────────────────────────────────────┐
│  Mon   Tue   Wed   Thu   Fri   Sat   Sun   Mon   Tue  ...   │
│   3     4     5     6     7    [8]    9    10    11   ...   │
│   ·     ●     ·     ○          ●·    ○     ○                │
│                               €16                            │
└─────────────────────────────────────────────────────────────┘
```

**Day Cell Specifications:**
- Width: 44px, Height: 64px
- Day abbreviation: 10px `text-white/40`
- Day number: 16px `text-white` bold
- Indicator dot below number

**Dot Types:**
| Activity | Visual |
|----------|--------|
| Spending | Filled dot, 4-10px, gradient-primary |
| Income | Filled dot, 6px, green |
| Upcoming bill | Hollow circle, 6px, `border-white/30` |
| No activity | No dot |

**Today Cell:**
- Background: `bg-white/15`
- Border: `border border-white/20`
- Below dot: tiny spend amount in 10px `text-white/50`

**Past Days:**
- Day name/number: `text-white/30`
- Dots show historical spending

**Future Days:**
- Day number: `text-white/50`
- Hollow dots for bills
- Below dot: bill amount in 10px `text-white/30`

**Scroll Behavior:**
- Default: Today centered or slightly left-of-center
- User can scroll left (past) or right (future)
- useRef for scroll container, useEffect to scroll to today on mount

### 2. Expanded Day Detail

Appears below calendar strip inside the same card when a day is tapped.

**For Past/Today (transactions):**
```text
┌─────────────────────────────────────────────┐
│ Spent €16.30                                │
├─────────────────────────────────────────────┤
│ UtensilsCrossed  Uber Eats         -€12.50  │
│ Coffee           Coffee Shop        -€3.80  │
└─────────────────────────────────────────────┘
```

- Summary header: 12px `text-white/50`
- Transaction rows: icon 16px `text-white/60`, name 13px, amount 13px
- Max 4 rows, then "and X more" link

**For Future (upcoming bills):**
```text
┌─────────────────────────────────────────────┐
│ €450 due                                    │
├─────────────────────────────────────────────┤
│ Home  Rent                           €450   │
│       due                                   │
└─────────────────────────────────────────────┘
```

- Icon 16px `text-white/40`, name 13px `text-white/60`
- "due" label 10px `text-white/30`
- Amount 13px `text-white/40`

**For Empty Days:**
- "No activity" centered in 12px `text-white/30`

**Interaction:**
- Today auto-expanded on drawer open
- Tapping another day collapses previous, expands new
- AnimatePresence for smooth expand/collapse

### 3. Upcoming Summary Bar

Compact banner below the calendar card.

```text
┌─────────────────────────────────────────────┐
│ Clock  Next 7 days                 €485 due │
└─────────────────────────────────────────────┘
```

- Height: ~44px
- Left: Clock icon (16px) + "Next 7 days" in 13px `text-white/60`
- Right: "€485 due" in 13px `text-white`
- Frosted glass styling (`glass-light rounded-2xl`)
- Tap to scroll calendar to show next 7 days

### 4. Spending Sparkline

Small frosted card with a 14-day spending trend chart.

```text
┌─────────────────────────────────────────────┐
│                   ╱╲                        │
│     ╱╲    ╱╲    ╱  ╲   ╱╲                   │
│   ╱    ╲╱    ╲╱      ╲╱  ●                  │
│ ╱                                           │
├─────────────────────────────────────────────┤
│ Past 2 weeks                    avg €24/day │
└─────────────────────────────────────────────┘
```

- Card height: ~80px
- Uses Recharts AreaChart (already installed)
- Area fill: purple-to-pink gradient at 20% opacity
- Line: `stroke-white/40`, 1.5px
- Today marker: small white dot on line
- Footer: "Past 2 weeks" left, "avg €X/day" right in 10px `text-white/30`
- No axes, no labels, purely visual

---

## Data Model

### Mock Data Structure

```typescript
// Day with financial activity
interface DayData {
  date: Date;
  dayName: string;      // "Mon", "Tue", etc.
  dayNumber: number;    // 1-31
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  transactions: DayTransaction[];
  upcomingBills: DayBill[];
  totalSpent: number;
  totalIncome: number;
  totalBillsDue: number;
}

interface DayTransaction {
  icon: LucideIcon;
  name: string;
  amount: number;       // negative for expenses
}

interface DayBill {
  icon: LucideIcon;
  name: string;
  amount: number;
}

// Sparkline data point
interface SparklinePoint {
  day: number;
  amount: number;
  isToday: boolean;
}
```

### Data Generation

Generate 21 days of data: 14 past + today + 6 future

**Past Days (mock spending):**
- Feb 8 (today): €16.30 (Uber Eats €12.50, Coffee €3.80)
- Feb 7: €0 (no activity)
- Feb 6: €35.00 (Bus Pass)
- Feb 5: €28.50 (Groceries)
- Feb 4: €8.90 (Coffee, Snacks)
- Feb 1: €450 expense (Rent) + €2400 income (Salary)
- Earlier days: random amounts 0-50

**Future Days (upcoming bills):**
- Feb 28: Rent €450
- Mar 1: Phone €25
- Mar 3: Spotify €10

---

## Technical Implementation

### State Management

```typescript
const [selectedDay, setSelectedDay] = useState<Date>(new Date());
const scrollRef = useRef<HTMLDivElement>(null);
```

### Scroll to Today

```typescript
useEffect(() => {
  if (open && scrollRef.current) {
    // Scroll to position today in center
    const todayIndex = days.findIndex(d => d.isToday);
    const scrollPosition = (todayIndex * 44) - (scrollRef.current.offsetWidth / 2) + 22;
    scrollRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
  }
}, [open]);
```

### Dot Size Calculation

```typescript
const getDotSize = (amount: number): number => {
  // Scale 4-10px based on amount relative to max spending
  const maxSpend = 50;
  const normalized = Math.min(Math.abs(amount) / maxSpend, 1);
  return 4 + (normalized * 6);
};
```

### Sparkline with Recharts

```typescript
<AreaChart data={sparklineData} width={300} height={50}>
  <defs>
    <linearGradient id="sparklineGradient" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="hsl(262, 80%, 66%)" stopOpacity={0.2} />
      <stop offset="100%" stopColor="hsl(342, 100%, 71%)" stopOpacity={0.2} />
    </linearGradient>
  </defs>
  <Area
    type="monotone"
    dataKey="amount"
    stroke="rgba(255,255,255,0.4)"
    strokeWidth={1.5}
    fill="url(#sparklineGradient)"
  />
</AreaChart>
```

---

## Animation Details

### Day Cell Tap
- Subtle scale on tap: `whileTap={{ scale: 0.95 }}`

### Expanded Detail
- AnimatePresence with height animation
- Slide down from 0 height to auto
- Duration: 200ms ease-out

### Selected Day Indicator
- Animated underline or glow effect on selected day

---

## Layout Summary

```text
┌─────────────────────────────────────────────┐
│          Month Pulse Hero Card              │  (unchanged)
│          €1,340 available                   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│          Daily Allowance Card               │  (unchanged)
│          €44 / day                          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ◀ Mon  Tue  Wed  Thu  Fri [Sat] Sun  Mon ▶ │  NEW: Calendar Strip
│     3    4    5    6    7   [8]   9   10    │
│     ●    ·    ●    ·    ○    ●·   ○    ○    │
│                             €16             │
├─────────────────────────────────────────────┤
│  Spent €16.30                               │  NEW: Expanded Detail
│  🍽 Uber Eats                      -€12.50  │
│  ☕ Coffee Shop                     -€3.80  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 🕐 Next 7 days                     €485 due │  NEW: Summary Bar
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│            Spending Sparkline               │  NEW: Trend Chart
│         ╱╲    ╱╲                            │
│     ╱╲╱    ╲╱    ╲╱●                        │
│  Past 2 weeks               avg €24/day     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 🐷                                          │  (unchanged)
│ Johnny's Tip: You're spending less...       │
└─────────────────────────────────────────────┘
```

---

## Implementation Steps

1. Create mock data generator for 21 days
2. Build calendar strip with horizontal scroll
3. Implement day cell component with dot indicators
4. Add expanded detail section with AnimatePresence
5. Create upcoming summary bar
6. Integrate Recharts sparkline
7. Wire up tap interactions and scroll behavior
8. Test scroll-to-today on drawer open

