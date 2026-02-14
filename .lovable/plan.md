

# Profile Screen Fix: Quest Path + Avatar (Prompt 1 of 2)

## Problem Summary
The current Profile screen has washed-out, monochrome quest nodes that all look like disabled buttons. There's no color differentiation between states, no 3D depth, and the layout feels flat and lifeless compared to the Duolingo-inspired design goal.

## Changes Required

### File: `src/components/screens/ProfileScreen.tsx`

**1. Remove duplicate Johnny avatar from quest path**
- Delete the `johnnyImg` element that renders on the vertical center line (lines 238-241)
- The only avatar on screen will be the one in the header area (the tamagotchi with the level ring)

**2. Reduce row spacing from 96px to 56px**
- Change `ROW_H` constant from `96` to `56`
- This compresses the quest path from ~864px to ~504px vertical space

**3. Reduce S-curve amplitude**
- Change node positioning from `28%`/`72%` (44% swing) to a gentle sine-based offset
- New formula: `calc(50% + ${Math.sin(i * 0.65) * 12}%)` giving ~12% amplitude

**4. Redesign node circles with SOLID colors and 3D shadows**

Each node state gets a completely different visual treatment:

- **COMPLETED nodes**: Each gets its own unique solid background color (purple, blue, orange, teal, indigo, pink, yellow) with a darker `box-shadow: 0 6px 0` for 3D depth. White bold icon at 30px. 76px diameter. Green check badge (22px) at bottom-right.

- **CURRENT node**: Solid `#A855F7` background, 88px diameter (bigger than others), `box-shadow: 0 8px 0 #7C3AED`, gold `#FFD700` 4px border with pulsing opacity, the entire node bounces (translateY animation). "START" gradient pill below.

- **LOCKED nodes**: Solid `#D1D5DB` gray background, `box-shadow: 0 5px 0 #9CA3AF`, 72px, gray icon, centered Lock overlay. No transparency.

- **COMING SOON nodes**: Solid `#E5E7EB` light gray, `box-shadow: 0 4px 0 #D1D5DB`, 64px, dashed border, very faint icon.

**5. Fix connecting path line**
- Increase width from 3px to 4px
- Completed sections: `rgba(255,255,255,0.25)` (brighter)
- Locked sections: dashed `rgba(255,255,255,0.08)`

**6. Improve label contrast**
- Completed: 14px bold white (not white/60)
- Current: 14px bold white + START pill
- Locked: 13px white/30 + "Locked" 10px white/20
- Coming soon: 12px white/15 + "Coming soon" 9px white/10

**7. Add reward dividers**
- Between node index 1 (Clarity) and 2 (Risk Pulse): "BONUS QUESTS" pill with warm yellow background (`#FEF3C7` at 60%), gold border, Gift icon, dark gold text
- Between node index 6 (Money Story) and 7 (Knowledge Tower): "COMING SOON" divider with gray background, Lock icon

**8. Fix progress bar at top**
- Add a "Quests X/7" frosted bar above the quest path
- Background: `rgba(255,255,255,0.1)`, rounded 12px
- Inner bar: 6px tall, gradient purple-to-pink fill, white/8 background

**9. Update animations in style block**
- Add `node-bounce` keyframe: `translateY(-6px)` to `translateY(0)`, 1.5s
- Add `gold-pulse` keyframe: opacity 0.6 to 1.0, 1.5s
- Keep existing avatar-bob, sparkle-orbit, star-pulse, shimmer animations

### Node Color Map (for completed states)
```text
module0 (Know Yourself):   bg #8B5CF6, shadow #6D28D9
clarity (Financial Clarity): bg #3B82F6, shadow #1D4ED8
module1 (Risk Pulse):      bg #F97316, shadow #C2410C
module2 (Time Lens):       bg #14B8A6, shadow #0D9488
module3 (Confidence):      bg #6366F1, shadow #4338CA
module4 (Social Mirror):   bg #EC4899, shadow #BE185D
module5 (Money Story):     bg #EAB308, shadow #A16207
knowledge (Knowledge):     bg #E5E7EB, shadow #D1D5DB
execution (Execution):     bg #E5E7EB, shadow #D1D5DB
```

### No changes to:
- `src/lib/profileData.ts` (data layer stays the same)
- `src/components/profile/QuestionnaireOverlay.tsx` (questionnaire stays the same)
- Bottom half of ProfileScreen (DNA card, badges, observations, settings) -- that's Prompt 2

