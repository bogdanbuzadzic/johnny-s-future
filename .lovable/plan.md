

# Add More Goal Assets to My World

## Overview
Copy 10 new pixel art assets (Education1, Laptop1-4, House1-4) into `src/assets/world/` and register them in MyWorldScreen. The Weather_Effects image is reference only and won't be embedded.

## Assets to Copy

| Upload | Destination | Notes |
|--------|------------|-------|
| Education1.png | src/assets/world/education1.png | Completes education set (1-4) |
| Laptop1.png | src/assets/world/laptop1.png | New type |
| Laptop2.png | src/assets/world/laptop2.png | |
| Laptop3.png | src/assets/world/laptop3.png | |
| Laptop4.png | src/assets/world/laptop4.png | |
| House1.png | src/assets/world/house1.png | Foundation (0-24%) |
| House2.png | src/assets/world/house2.png | Walls (25-49%) |
| House14.png | src/assets/world/house3.png | Roof frame (50-74%) |
| House3.png | src/assets/world/house4.png | Complete house (75-100%) |

Note: Weather_Effects.png is reference only -- not copied.

## Code Change: `src/components/screens/MyWorldScreen.tsx`

**Add imports** for education1, laptop1-4, house1-4 (9 new imports).

**Update `GOAL_ASSETS` map** to add all 9 new keys:
- `education1` -- completes education set (now 1-4 fully covered)
- `laptop1`, `laptop2`, `laptop3`, `laptop4` -- new goal type fully covered
- `house1`, `house2`, `house3`, `house4` -- new goal type fully covered

No other logic changes needed -- existing `getAssetPrefix()` already maps house/laptop keywords, and `getGoalImage()` already looks up `GOAL_ASSETS[key]`.

## Coverage After This Change

| Goal Type | States Covered |
|-----------|---------------|
| Car | 1-4 (complete) |
| Vacation | 1-4 (complete) |
| Education | 1-4 (complete) |
| Laptop | 1-4 (complete) |
| House | 1-4 (complete) |
| Bike | fallback icons |
| Shield | fallback icons |
| Investment | fallback icons |
| Target | fallback icons |
