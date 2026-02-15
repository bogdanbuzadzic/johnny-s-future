

# Tamagotchi World - Implementation Plan

## Overview

Create a full-screen pixel art world scene that opens when users tap their avatar on the Profile screen. The world visually represents their financial health (sky/ground) and goals (pixel art objects that materialize as they save).

## Assets to Copy (36 images)

Copy all uploaded pixel art assets into `src/assets/world/`:

**Skies (3):** `sky1_sunny`, `sky2_sunset`, `sky3_overcast`
**Grounds (3):** `ground1_healthy`, `ground2_average`, `ground3_struggling`
**Weather (4):** `weather1_sunny`, `weather2_cloudy`, `weather3_rain`, `Weather_Effects_Clouds`
**Goals (36 = 9 types x 4 states):** `house1-4`, `car1-4`, `vacation1-4`, `laptop1-4`, `bike1-4`, `shield1-4`, `education1-4`, `investment1-4`, `target1-4`

Note: Only `car4` and the two general goal icons are uploaded. The remaining goal assets (house, vacation, laptop, bike, shield, education, investment, target) are referenced in the spec but not uploaded. The implementation will use the uploaded assets and fall back to `target` or `General_Goal_Icon` images for missing assets.

## New Files

### `src/components/screens/MyWorldScreen.tsx`

Full-screen component with:

- **Entry trigger**: Avatar tap on ProfileScreen opens this screen (state: `worldOpen`)
- **Transition**: Avatar scales up (400ms spring), world scene fades in around it
- **Header**: ArrowLeft + "My World" 18px bold white. Back returns to Profile.
- **Scene layers** (full viewport, no scroll):
  - z-0: Sky background image (top 80%) -- selected by Clarity score
  - z-0: Ground image (bottom 20%) -- selected by Clarity score
  - z-1: Weather overlay -- selected by spending pace
  - z-2: Goal objects -- positioned by target amount, progress state 1-4
  - z-3: Avatar (120px, centered on ground line, bob animation)
- **Sky selection**: `score > 60` = sunny, `> 30` = sunset, else overcast. Default: sunset.
- **Ground selection**: Same thresholds mapped to healthy/average/struggling.
- **Weather selection**: Based on `percentSpent vs percentMonth` pace calculation from budget data.
- **Goal objects**: Read from `localStorage('jfb_goals')`. Map goal name/icon to asset prefix (house/car/vacation/etc). Progress state 1-4 based on `savedAmount/targetAmount` percentage.
- **Goal positions**: 7 preset positions sorted by targetAmount descending. Largest goal = center back, most prominent.
- **Goal tap**: Opens frosted bottom sheet with name, asset image, progress bar, amounts, monthly contribution, months-to-go estimate, Close button.
- **Goal long-press** (500ms): Cross-fades current progress image to the "4" (100% complete) version for 2 seconds as a "dream preview", then fades back.
- **Empty state**: If no goals, show "?" markers, "Your world is empty!" text, and "Go to My Money" button.
- **Info tooltip**: Top-right frosted pill, tap shows toast explaining the world concept.

### Animations

- Goal objects: gentle bob (translateY -3px to 0, 2-3s infinite, staggered 400ms each)
- Weather clouds (cloudy/rain): translateX drift 0 to -100%, 30s linear infinite loop
- Sparkles on 100%-funded goals: 3 tiny white dots cycling opacity
- Scene entrance: sky fade in (300ms), ground slide up (200ms delay), goals pop in staggered (spring 300ms), avatar last

## Modified Files

### `src/components/screens/ProfileScreen.tsx`

- Add `worldOpen` state
- Make avatar center area clickable -- on tap, set `worldOpen = true`
- Render `MyWorldScreen` when `worldOpen` is true (with AnimatePresence)
- Pass `onClose={() => setWorldOpen(false)}` to MyWorldScreen

## Technical Details

### Goal-to-Asset Mapping

```text
Goal name/icon keyword -> asset prefix:
  house/home/apartment/Home -> "house"
  car/vehicle/Car -> "car"
  vacation/travel/trip/Plane -> "vacation"
  laptop/computer/tech/Laptop -> "laptop"
  bike/bicycle/Bike -> "bike"
  emergency/safety/ShieldCheck -> "shield"
  education/school/course/GraduationCap -> "education"
  invest/grow/TrendingUp/LineChart -> "investment"
  fallback -> "target"
```

### Progress State Selection

```text
0-24%  -> prefix1 (most ghosted/incomplete)
25-49% -> prefix2
50-74% -> prefix3
75-100% -> prefix4 (fully complete)
```

### Data Sources (all from localStorage)

```text
Sky/Ground: jfb_clarityScore -> .total
Weather: jfb-budget-data -> config + transactions (pace calc)
Goals: jfb_goals -> array of {name, icon, savedAmount, targetAmount, monthlyContribution}
```

### Missing Assets Strategy

Since only a subset of goal assets are uploaded (car4, general goal icons, sky/ground/weather), the component will:
1. Import all available uploaded assets
2. For missing goal type images, fall back to the `General_Goal_Icon` or render a styled placeholder with the Lucide icon from the goal data
3. This allows the feature to work immediately while additional assets can be added later

## File Summary

| File | Action | Scope |
|------|--------|-------|
| `src/assets/world/*` | Create (copy uploaded assets) | ~10 files |
| `src/components/screens/MyWorldScreen.tsx` | Create | Major - new feature |
| `src/components/screens/ProfileScreen.tsx` | Edit - add avatar tap + world overlay | Minor |

