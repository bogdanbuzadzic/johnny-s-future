

# Profile + Assessments + Data Flow - Complete Rebuild

## Overview
This rebuilds the Profile screen's orbital nodes to show results when completed, removes the separate Financial DNA card, enhances the Clarity questionnaire's data flow, and adds mock terrain projection to the Home screen.

## Changes by File

### 1. `src/components/screens/ProfileScreen.tsx` (Major Rewrite)

**Remove:**
- The entire "Financial DNA Card" section (lines 387-485): the radar pentagon chart, dimension stat pills, and persona display. The orbital nodes themselves become the DNA visualization.

**Add - Completed Node Result Displays:**
- When a node's status is `completed`, instead of rendering a plain colored circle with an icon, render a **result node** that shows the module's output data inside the circle:
  - **Clarity**: Blue `#3B82F6` circle showing `[score]/100` (24px bold + 11px white/50). BarChart3 icon badge (24px) on top-left edge. Below: mini segmented bar (spending/saving/planning).
  - **Know Yourself**: Purple `#8B5CF6` showing abbreviated persona (14px bold): "Avoider" / "Impulse" / "Steady" etc. Below: full persona name.
  - **Risk Pulse**: Orange `#F97316` showing risk score + "risk". Below: "Moderate"/"High"/"Low".
  - **Time Lens**: Teal `#14B8A6` showing time score + "time". Below: descriptor.
  - **Confidence**: Indigo `#6366F1` showing confidence score + "conf.". Below: calibration descriptor.
  - **Social Mirror**: Pink `#EC4899` showing social score + "social". Below: descriptor.
  - **Money Story**: Yellow `#EAB308` showing dominant script abbreviated. Below: trigger emotion from M6.
- All completed nodes keep: 3D shadow, green check badge bottom-right, icon badge top-left edge.
- Add helper functions to compute result labels (e.g., risk level from score, dominant money script from M5 answers).

**Keep unchanged:**
- Orbital layout structure, avatar center, arc connections, score badge, level progress, trophy case, Johnny's observations, settings, spacer.

### 2. `src/lib/profileData.ts` (Minor Updates)

**Update Clarity questions:**
- Step 2 text: Change `'Always'` to `'Always on time'` for clarity score consistency with the spec's scoring logic.
- Step 5 (expenses): Add a `frequency` concept. The current `expenses` type doesn't support a weekly/monthly toggle. We'll handle this in the QuestionnaireOverlay by storing a secondary `step5_freq` answer object.
- Step 3 goal option: Change `'Save for a purchase'` to `'Save for a specific purchase'` to match the goalMap key in completion handler.

**Add result label helpers:**
- `getRiskLabel(score)`: returns "Low" / "Moderate" / "High"
- `getTimeLabel(score)`: returns "Present-focused" / "Balanced" / "Future-focused"
- `getConfidenceLabel(score)`: returns "Underestimates" / "Well calibrated" / "Overconfident"
- `getSocialLabel(score)`: returns "Independent" / "Moderate" / "Socially driven"
- `getDominantScript(answers)`: returns highest-scoring script from M1-M4 ("Avoid" / "Worship" / "Status" / "Vigil.")
- `getPersonaAbbrev(personaName)`: returns shortened display name

### 3. `src/components/profile/QuestionnaireOverlay.tsx` (Moderate Updates)

**Clarity completion handler updates:**
- Add frequency support for Step 5: if a field has `frequency === 'weekly'`, multiply by 4.33 before creating the fixed category.
- Store step5 with frequency data so the multiplied monthly value is used.
- After creating fixed categories, also create a recurring transaction for subscriptions if `step5f > 0` (using `addTransaction` from BudgetContext).
- Create goals using updated goalMap keys matching the multi-select options (including `'Save for a specific purchase'`).
- Store debt data: `localStorage.setItem('jfb_debt', JSON.stringify({...}))` from step6 compound answers.
- Store cash reserves: `localStorage.setItem('jfb_cash', JSON.stringify({...}))` from step8 compound answers.
- On completion, navigate to My Money tab (`setActiveTab(1)`).

**Expense input frequency toggle:**
- Add a small "mo/wk" toggle next to each expense input field in the `expenses` type renderer. Store frequency per field in a parallel state object. Apply 4.33x multiplier for weekly items in the running total display.

### 4. `src/components/terrain/TerrainPath.tsx` (Moderate Update)

**Mock terrain from Clarity data:**
- Before using `FALLBACK_BILLS` and `FALLBACK_INCOME`, check if real budget data exists in localStorage.
- If `config.setupComplete === true` but `transactions.length === 0`:
  - Build a projected terrain from Clarity data: start with flex budget, subtract 85% of daily flex each day for 30 days.
  - Use dashed stroke for the terrain line (`strokeDasharray="8 4"`)
  - Use `rgba(255,255,255,0.15)` fill instead of the normal gradient
  - Add a label at the bottom: "Projected from your Clarity data. Start tracking to see real trends." (10px white/20)
- If real transactions exist (even 1): use real data, solid line, normal gradient, no label.
- Read budget data from localStorage inside the component (using the same `readBudgetFromStorage` pattern from TodayDrawer).

**Remove hardcoded fallback data:**
- Replace `FALLBACK_BILLS` and `FALLBACK_INCOME` usage. When real categories exist, derive bills from fixed categories. When no data at all, show a flat empty terrain.

### 5. `src/components/sheets/TodayDrawer.tsx` (Minor Update)

- Pass budget categories as bill events to the terrain when real data exists (derive from fixed categories stored in localStorage).
- The SimulationProvider already receives fresh data - just ensure the terrain component reads from it.

---

## Technical Details

### Result Node Rendering Logic (ProfileScreen)

```text
For each completed node:
1. Read answers from localStorage (jfb_[module]_answers)
2. Compute score using getDimensionScore() or clarity score
3. Render result circle:
   - Same size as completed (72px)
   - Background: module's unique color
   - 3D shadow preserved
   - Content: score/label text centered inside
   - Icon badge: 24px circle with module icon at top-left edge (offset -8px, -8px)
   - Check badge: green circle at bottom-right (existing)
   - Below: module name + descriptor label
```

### Expense Frequency Toggle

```text
Each expense row gets a small toggle:
- Two pills: "mo" | "wk" (24px tall each, 10px font)
- Default: "mo" (monthly)
- When "wk" selected: the stored value represents weekly spend
- Running total multiplies weekly values by 4.33
- On save: weekly values are stored with a frequency flag
```

### Mock Terrain Data Flow

```text
TerrainPath reads localStorage directly:
1. Check jfb-budget-data exists and setupComplete === true
2. If transactions.length === 0: build projection
   - dailyFlex = (income - fixed - savings) / 30
   - Loop 30 days, subtract dailyFlex * 0.85 each day
   - Return with isProjection: true flag
3. If transactions exist: use real data (existing behavior)
4. Visual: dashed line + muted fill + projection label
```

### Files Summary
| File | Action | Scope |
|------|--------|-------|
| `src/components/screens/ProfileScreen.tsx` | Rewrite completed node rendering, remove DNA card | Major |
| `src/lib/profileData.ts` | Add result label helpers, fix option text | Minor |
| `src/components/profile/QuestionnaireOverlay.tsx` | Frequency toggle, debt/cash storage, subscription tx | Moderate |
| `src/components/terrain/TerrainPath.tsx` | Mock terrain from Clarity, remove hardcoded fallbacks | Moderate |
| `src/components/sheets/TodayDrawer.tsx` | Derive bills from real categories | Minor |

