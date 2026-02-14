

# Profile Screen Fix - Prompt 2 of 2: Bottom Section Redesign

## Overview
Fix the bottom half of the Profile screen (lines 373-563 of ProfileScreen.tsx) to add color, contrast, and life to the Financial DNA card, Level Progress, Trophy Case, Johnny's Observations, and Settings button.

## File Changed
**`src/components/screens/ProfileScreen.tsx`** (only file modified)

---

## Changes

### 1. Financial DNA Card (lines 373-464)

**Card background**: Change `rgba(255,255,255,0.12)` to `rgba(255,255,255,0.18)`

**Pentagon chart grid lines** (line 396): Change `rgba(255,255,255,0.05)` to `rgba(255,255,255,0.10)`

**Axis lines** (line 401): Change `rgba(255,255,255,0.08)` to `rgba(255,255,255,0.15)`

**Radar fill gradient** (lines 385-387): Change both `stopOpacity="0.15"` to `stopOpacity="0.30"`

**Radar stroke gradient** (lines 389-391): Change both `stopOpacity="0.4"` to `stopOpacity="0.6"`, strokeWidth from `"2"` to `"2.5"`

**Axis labels**: Add a color map for the 5 dimensions and render colored Lucide icons at each axis endpoint instead of plain text:
```text
Risk (Flame): #F97316
Time (Hourglass): #14B8A6
Confidence (Shield): #6366F1
Social (Users): #EC4899
Script (BookOpen): #EAB308
```
- Each axis label text stays as-is but uses the dimension's color at 70% opacity
- Score numbers for completed axes render in the matching axis color
- Locked axes show "?" in `white/20` with a small Lock icon (8px, `white/15`)

**Stat pills** (lines 436-449): Replace monochrome purple background with per-dimension colored tints:
- Each pill gets its axis color at 25% opacity as background
- Completed: icon + score in white
- Locked: icon + "?" in `white/30`

**Persona section** (lines 452-463):
- Change divider from `border-white/5` to `border-white/8`
- "Your Persona" label: 11px `white/25`
- Name: 18px bold white (already correct)
- Description: 12px `white/40` (already correct)
- Style line: 11px `white/25`
- Empty state text: increase from 12px to 14px, `white/20` to `white/30`, text: "Complete quests to reveal your DNA"

### 2. Level Progress (lines 466-476)

- Bar height: change from `h-2` (8px) to `h-2.5` (10px)
- Bar background: change `bg-white/[0.08]` to `bg-white/[0.12]`
- Fill: ensure it uses `background: linear-gradient(90deg, #8B5CF6, #EC4899)` explicitly (currently uses `gradient-primary` class)
- Current level text: already `font-bold text-white` -- keep
- Next level text: change from `text-white/25` to `text-white/30`
- Hint text: change from 11px `white/25` to 12px `white/25`

### 3. Trophy Case (lines 478-530)

**Card background**: Change to `rgba(255,255,255,0.15)` with a subtle warm tint by adding a second background layer

**Header**: Add Trophy icon (16px, `#FFD700`) next to "Trophy Case" text. Change to 16px bold.

**Featured badge slots** (lines 486-507):
- Earned badge slot:
  - Background: `badge.tint` at 30% (change from `+ '25'` to `+ '4D'` hex)
  - Border: 2px solid tint at 40%
  - Icon: 28px, `white/90`
  - Size: 64px square, 14px radius
  - Keep shimmer animation
  - Name below: 10px in tint color at 70%

- Empty slot (replace Plus icon + "Empty"):
  - Background: `rgba(255,255,255,0.06)`
  - Border: 2px dashed `rgba(255,255,255,0.12)`
  - Center: Sparkles icon (20px, `white/15`) with subtle pulse animation
  - Label: "Earn a badge!" 9px `white/15`

**All Badges row** (lines 510-529):
- Divider: `border-white/6`
- Counter text: "[X]/12 collected" in `white/20`
- Each unlocked badge (44px):
  - Background: `badge.tint` at 25%
  - Border: 1.5px solid tint at 30%
  - Icon: 20px, `white/80`
  - Name below: 8px in tint at 60%
- Each locked badge:
  - Background: `rgba(255,255,255,0.04)`
  - Border: 1px solid `rgba(255,255,255,0.06)`
  - Icon: 18px, `white/8`
  - Lock overlay: 10px, `white/12`
  - Label: "???" 8px `white/8`

### 4. Johnny's Observations (lines 532-551)

**Card background**: Change to `rgba(255,255,255,0.15)`

**Header**: Add Notebook-style icon (use BookOpen at 14px, `white/25`) next to title

**Observation icon colors**: Add a color map for each icon type:
```text
Eye: #3B82F6 (blue)
Zap: #F97316 (orange)
PiggyBank: #34C759 (green)
Clock: #14B8A6 (teal)
Star: #EAB308 (yellow)
AlertTriangle: #F97316 (orange)
TrendingUp: #34C759 (green)
Target: #EC4899 (pink)
```
- Each observation row's icon circle gets its color at 20% opacity as background
- Icon rendered in the matching color at 60%

**Empty state** (line 549): Replace single text line with:
- Johnny image (48px) centered
- "I'm still getting to know you!" 14px `white/30`
- "Complete your first quest and I'll share what I learn." 12px `white/20`

### 5. Settings Button (lines 553-560)

**Background**: Change from `rgba(255,255,255,0.08)` to `rgba(255,255,255,0.10)`

**Icon circle**: Wrap Settings icon in a 28px circle with `rgba(255,255,255,0.08)` background (neutral, not purple-tinted)

**Settings sheet rows** (lines 582-594): Change icon circle backgrounds from `rgba(139,92,246,0.15)` to `rgba(255,255,255,0.08)` and icon color from `text-purple-400` to `text-white/50` -- keeping settings utilitarian and neutral

### 6. Add DIMENSION_COLORS constant

Add near the top of the file (after NODE_COLORS):
```text
DIMENSION_COLORS = {
  module1: '#F97316',   // Risk - orange
  module2: '#14B8A6',   // Time - teal
  module3: '#6366F1',   // Confidence - indigo
  module4: '#EC4899',   // Social - pink
  module5: '#EAB308',   // Script - yellow
}
```

### 7. Add OBS_COLORS constant

Add near OBS_ICONS:
```text
OBS_COLORS = {
  Eye: '#3B82F6',
  Zap: '#F97316',
  PiggyBank: '#34C759',
  Clock: '#14B8A6',
  Star: '#EAB308',
  AlertTriangle: '#F97316',
  TrendingUp: '#34C759',
  Target: '#EC4899',
}
```

### 8. Import Sparkles icon

Add `Sparkles` to the lucide-react import (line 4).

---

## No changes to
- `src/lib/profileData.ts`
- `src/components/profile/QuestionnaireOverlay.tsx`
- Top half of ProfileScreen (avatar, quest path) -- already fixed in Prompt 1

