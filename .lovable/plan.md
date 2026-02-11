

# My Money - Prompt 5: Goals Above the Container

## What This Does

Adds a horizontal row of goal cards above the Tetris container, with SVG flow lines connecting them down to the savings bar. Goal cards react live when the trade-off slider is dragged.

## Changes (only `MyMoneyScreen.tsx`)

### New Imports

- `useApp` from `@/context/AppContext` (to access `goals` array)
- `iconMap` from `@/context/AppContext` (to resolve goal icon strings to Lucide components)
- `Laptop, Plane, Car, Home, Target, GraduationCap, Heart` from `lucide-react` (goal icons not yet imported)
- `useRef` for container/card DOM measurements

### Goal Cards Row

Inserted between the Header and the Container (before the container div). Only renders if `goals.length > 0`.

- Wrapper: `overflow-x-auto` horizontal scroll container, `flex` row, `gap-3`, `pb-4` (16px below), hide scrollbar via CSS
- If 1-3 goals: `justify-evenly` across full width
- If 4+: natural flex row, scrollable

Each goal card (110px wide, 72px tall):
- Background: `rgba(255,255,255,0.12)`, `backdrop-filter: blur(8px)`
- Border: `1px solid rgba(255,255,255,0.15)` -- changes to `rgba(52,199,89,0.25)` if fully funded
- Border radius: 16px
- Content stacked vertically centered:
  - Goal icon (18px, white/50) resolved via `iconMap` from AppContext
  - Name (11px, white/60, truncate, max 1 line)
  - "EUR[saved] / EUR[target]" (10px, white/35)
  - Mini progress bar at bottom: 3px tall, full width minus 12px padding each side, rounded. Fill green #34C759 at 40%, bg white/10
- Fully funded: green/25 border + small CheckCircle (10px, green/40) absolute top-right

### SVG Flow Lines

An SVG element rendered as a sibling between the goal cards row and the container, using `position: relative` layout. The SVG is absolutely positioned to overlay the gap between cards and the savings bar.

Approach: Use `useRef` on the wrapper div that contains both goal cards and container. Measure positions with `useLayoutEffect` after render. Draw bezier curves from each card's bottom-center to evenly spaced points along the savings bar width.

- SVG spans from goal cards bottom to savings bar top (z-index behind container content)
- Each path: cubic bezier S-curve
- Stroke: `rgba(255,255,255,0.08)`, 1.5px base
- Stroke-dasharray: `4 4`
- Line thickness scaled by `1.5 + (contribution / monthlySavingsTarget) * 2` (capped at 3.5px)

Simplified approach (no DOM measurement needed): Since the layout is predictable, calculate positions mathematically:
- Card bottom Y = 0 (top of SVG)
- Savings bar Y = goal cards height (72) + gap (16) + container height (the full container)
- X positions: evenly distribute across container width for both card centers and savings bar anchor points

The SVG renders behind the container using `position: absolute` and `z-index: 0`, with the container at `z-index: 1` (its semi-transparent bg lets lines show through faintly).

### Live Connection to Slider

New state: track `sliderDiff` (already computed as `sliderValue - originalBudget`).

When `sliderDiff !== 0` and goals exist:
- Calculate `totalContributions = sum of all goal monthlyContributions`
- For each goal with a contribution:
  - `ratio = goal.monthlyContribution / totalContributions`
  - `goalDiff = Math.round(sliderDiff * ratio * -1)` (negative slider diff = positive for goals)
  - Show floating label below card: "+EUR[X]/mo" in green (10px) if positive, "-EUR[X]/mo" in amber if negative
  - Card border briefly glows green/15 or amber/15
  - Flow line opacity increases to white/15 (positive) or decreases to white/5 (negative)

When slider is saved or cancelled, labels disappear.

### Impact Text Addition

In the `ExpandedContent` component, below the existing impact text, add a goal impact line when `sliderDiff !== 0`:
- Find the most affected goal (largest `|monthsChange|`)
- Calculate: `oldMonths = (target - saved) / oldContribution`, `newContribution = oldContribution + diff * ratio`, `newMonths = (target - saved) / newContribution`
- Display: "[Goal name]: [X] months sooner" (green/40) or "[X] months later" (amber/40) in 11px

Pass goals data into `ExpandedContent` as a prop, along with `monthlySavingsTarget`.

### Layout Order (top to bottom in the px-4 div)

1. Header (existing)
2. Goal cards row (NEW) -- only if goals exist
3. Container (existing, with relative positioning wrapper for SVG)
4. Impact summary row (existing)
5. FAB (existing, fixed position)

## Technical Notes

- Goals come from `useApp()` which wraps the app above `BudgetProvider`. Both contexts are available in `MyMoneyContent`.
- The SVG flow lines use a simplified approach: an absolutely positioned SVG behind the container. The wrapper div gets `position: relative` so the SVG can be positioned within it.
- Flow line paths use `M x1,0 C x1,h*0.3 x2,h*0.7 x2,h` for a smooth S-curve where h is the container height.
- Goal card scroll container uses `-ms-overflow-style: none; scrollbar-width: none; &::-webkit-scrollbar { display: none }` via inline styles.
- No other files are modified.

