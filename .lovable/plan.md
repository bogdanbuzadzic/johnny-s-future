

# Profile Screen — RPG Character Sheet

## Overview
Replace the placeholder Profile screen (tab 3) with a full RPG-style character profile featuring an animated pixel art avatar, a module map skill tree, financial health score breakdown, achievement badges, and settings.

## What Gets Built

### 1. New File: `src/components/screens/ProfileScreen.tsx`
A single scrollable screen containing all 6 sections described below.

### 2. Avatar Image
Copy the uploaded pixel art image to `src/assets/avatar.png` and import it as an ES6 module.

### 3. App.tsx Update
Replace `PlaceholderScreen` import/usage with `ProfileScreen`.

---

## Screen Sections

### Section 1: Avatar Hero
- 100x100px avatar image with idle bob animation (translateY -4px to 0, 2s infinite)
- 130px SVG level ring behind avatar: white/10 track, purple-to-pink gradient fill proportional to health score
- Drop shadow glow on the ring
- User name from localStorage (`jfb_userName`, default "Bogdan")
- Level title derived from score tier (Beginner / Explorer / Builder / Architect / Master)
- Frosted glass score pill with star icon and count-up animation (0 to score over 800ms)

### Section 2: Module Map (2x3 Grid)
Six module cards in a constellation layout with dotted connecting lines:

| Know Yourself (Brain) | Budget Arena (LayoutGrid) | Dream Builder (Target) |
| Future Vision (Sparkles) | Knowledge Tower (BookOpen) | Execution Hub (Building2) |

- Each card: 100x120px, frosted glass, icon + name + 3px progress bar + status text
- Progress calculated from real data (BudgetContext + AppContext)
- Last two modules locked (60% opacity, Lock icon overlay)
- Completed modules get accent-colored glow borders; active modules have pulsing connecting lines
- Tapping unlocked modules navigates to My Money tab or shows "coming soon" sheet

### Section 3: Score Breakdown Card
Frosted glass card with 4 pillar rows:
- **Awareness** (Brain): assessment completion (0 or 25)
- **Budget Health** (LayoutGrid): setup + pace + tracking (0-25)
- **Goal Progress** (Target): average goal completion * 25
- **Future Planning** (Sparkles): savings target + what-if usage + savings rate

Each row shows icon, name, animated horizontal bar, and X/25 score.

### Section 4: Achievement Badges (Horizontal Scroll)
8 achievement circles (48px each):
- First Step, Tracker (10+ transactions), Dreamer (1+ goal), Saver, Explorer, On Track, Goal Getter, Time Traveler
- Unlocked = bright icon; Locked = dimmed with Lock overlay
- Tap shows toast with name/description or unlock hint

### Section 5: Settings List
6 rows with icon + label + ChevronRight:
- Budget Settings (opens EditBudgetSheet)
- Reminders, Appearance, Export Data (toast "Coming soon")
- Privacy (toast about local storage)
- About (small info sheet)

### Section 6: Bottom Spacer
64px spacer to clear the tab bar.

---

## Technical Details

### Score Calculation
```text
calculateHealthScore() returns { awareness, budgetHealth, goalProgress, futurePlanning, total }
- Each pillar: 0-25 points
- Total: 0-100, feeds level ring + score badge + level title
```

### localStorage Keys (new)
- `jfb_userName` (string)
- `jfb_hasCompletedAssessment` (boolean)
- `jfb_hasUsedWhatIf` (boolean)
- `jfb_hasUsed5YearZoom` (boolean)
- `jfb_hasCompletedMonth` (boolean)

### Animations
- Avatar bob: CSS keyframes, 2s ease-in-out infinite
- Level ring: SVG stroke-dashoffset from full to target, 1000ms ease-out
- Score count-up: requestAnimationFrame loop, 800ms
- Progress bars: staggered fill with 100ms delay per item, 600ms duration
- Achievement badges: staggered fade-in, 50ms delay each
- Constellation lines: stroke-dashoffset draw animation, 800ms

### Data Sources
- `useBudget()` for config, categories, transactions, paceStatus, flexSpent
- `useApp()` for goals, setActiveTab
- localStorage for assessment/what-if/zoom/month flags

### Files Changed
1. **New**: `src/assets/avatar.png` (copy from upload)
2. **New**: `src/components/screens/ProfileScreen.tsx` (entire screen)
3. **Edit**: `src/App.tsx` (swap PlaceholderScreen for ProfileScreen)

