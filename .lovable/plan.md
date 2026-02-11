

# My Money - Goal Block Visual Fix

## What This Does

Redesigns goal blocks to look like neutral frosted glass cards, clearly distinct from the colorful spending blocks. Removes green accent stripes and colored tints from goals. Adds a purple-to-pink gradient progress bar and circular progress ring.

## Changes (only `src/components/screens/MyMoneyScreen.tsx`)

### 1. GoalBlock Component (lines 1166-1274) - Visual Overhaul

**Background**: Change from `rgba(255,255,255,0.08)` to `rgba(255,255,255,0.15)` + `backdrop-blur-md`

**Border**: Change from `2px dashed` in goal tint to `1.5px solid rgba(255,255,255,0.15)` (neutral, not dashed)

**Remove accent stripe**: Delete the 4px green stripe div (lines 1201-1203)

**Fill**: Change from green at 25% to `rgba(255,255,255,0.08)` (very subtle brightening)

**Fully funded state**: Border becomes `1.5px solid rgba(52,199,89,0.25)`, add `boxShadow: '0 0 12px rgba(52,199,89,0.1)'`, CheckCircle stays

### 2. Large Goal Block Content (lines 1223-1237) - New Layout

Replace with:
- Left side: icon (20px, white/50) + name (14px bold white) on first line
- Below: "saved / target" in 12px white/40
- Below: progress bar (full width minus right section, 5px tall, rounded)
  - Track: white/10
  - Fill: `linear-gradient(90deg, #8B5CF6, #FF6B9D)` (purple-to-pink gradient)
- Below bar: "[X]% complete" in 11px white/30
- Right side: circular progress ring (48px)
  - Track: white/10, 3px stroke
  - Fill: purple-to-pink gradient (using SVG linearGradient), 3px stroke
  - Center text: "[X]%" in 13px bold white/50
- Bottom-right: target date in 11px white/25 + monthly contribution in 11px white/25

### 3. Medium Goal Block Content (lines 1239-1247)

Replace with:
- Icon (16px) + name (13px white) + saved/target (12px white/40)
- Smaller progress ring (36px) on right
- Progress bar below name/amount (same gradient fill)
- Monthly contribution at bottom

### 4. Small Goal Block Content (lines 1249-1255)

Replace with:
- Icon (16px) centered
- Saved amount in 14px bold white
- "/target" in 10px white/30
- Percentage in 10px white/25
- No progress ring, no progress bar (fill from bottom acts as indicator)

### 5. Progress Ring Implementation

Add inline SVG with a `linearGradient` definition for the purple-to-pink arc:
```
<defs>
  <linearGradient id={`goalGrad-${blockId}`} x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stopColor="#8B5CF6" />
    <stop offset="100%" stopColor="#FF6B9D" />
  </linearGradient>
</defs>
```

Ring track: `stroke="rgba(255,255,255,0.10)"`, 3px
Ring fill: `stroke={url(#goalGrad-${blockId})}`, 3px, dasharray/dashoffset for progress

### 6. ExpandedGoalContent (lines 230-354) - Update Progress Ring

Change the expanded progress ring's stroke from green to the same purple-to-pink gradient. Add SVG `linearGradient` defs. Keep all slider/timeline/save-cancel behavior unchanged.

### 7. Target Date Calculation

For large/medium blocks, compute estimated completion:
```
const remaining = goal.target - goal.saved;
const monthsToGoal = goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : Infinity;
const completionDate = new Date();
completionDate.setMonth(completionDate.getMonth() + monthsToGoal);
const dateStr = isFinite(monthsToGoal) ? format(completionDate, 'MMM yyyy') : '--';
```

## Visual Comparison After Changes

| Property | Spending Block | Goal Block |
|----------|---------------|------------|
| Background | Category tint at 20% | White at 15% (neutral) |
| Border | 1.5px solid, tint at 25% | 1.5px solid, white/15 |
| Left stripe | 4px, tint at 50% | None |
| Fill rising | Tint at 40% | White at 8% |
| Progress bar | None | Purple-to-pink gradient, 5px |
| Progress ring | None | 36-48px, purple-to-pink |
| Overall feel | Colorful, bold, active | Clean, glass, calm |

## What Does NOT Change

- Spending blocks: completely untouched
- Container, fixed bar, savings bar
- Time zoom logic
- Expand/collapse behavior and slider mechanics
- Can I Afford input and ghost fills
- Johnny mascot
- FAB button
- Grid layout and sizing tiers
- Add category / Add goal forms

