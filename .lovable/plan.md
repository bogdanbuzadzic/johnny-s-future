

# Add New Goal Assets to My World

## Overview
Copy the 10 uploaded pixel art assets (Car1-3, Vacation1-4, Education2-4) into `src/assets/world/` and register them in MyWorldScreen so goals with these types render their real pixel art instead of the generic fallback icon.

## Assets to Copy

| Upload | Destination |
|--------|------------|
| Car1.png | src/assets/world/car1.png |
| Car2.png | src/assets/world/car2.png |
| Car3.png | src/assets/world/car3.png |
| Vacation1.png | src/assets/world/vacation1.png |
| Vacation2.png | src/assets/world/vacation2.png |
| Vacation3.png | src/assets/world/vacation3.png |
| Vacation4.png | src/assets/world/vacation4.png |
| Education2.png | src/assets/world/education2.png |
| Education3.png | src/assets/world/education3.png |
| Education4.png | src/assets/world/education4.png |

Note: Education1 was not uploaded; it will continue using the fallback icon.

## Code Change: `src/components/screens/MyWorldScreen.tsx`

**Add imports** (after existing car4 import):
- Import car1, car2, car3, vacation1-4, education2-4

**Update `GOAL_ASSETS` map** (line 34):
- Add all 10 new keys: `car1`, `car2`, `car3`, `vacation1`, `vacation2`, `vacation3`, `vacation4`, `education2`, `education3`, `education4`
- Car now has all 4 states (car1-4) fully covered
- Vacation has all 4 states fully covered
- Education has states 2-4; state 1 still falls back to generic icon

No other logic changes needed -- the existing `getGoalImage()` function already looks up `GOAL_ASSETS[key]` and these new entries will be found automatically.

