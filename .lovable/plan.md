

# Fix: Terrain Bill Markers Never Appear

## Problem
In `src/components/terrain/TerrainPath.tsx`, the `readBudgetForTerrain()` function filters for `c.type === 'fixed'` categories, but Clarity never creates categories with that type — resulting in no expense markers rendering on the terrain.

## Solution

**File: `src/components/terrain/TerrainPath.tsx`**

Replace lines 85-114 (the existing fixedCats fallback logic) with the improved version that:

1. **Checks Clarity localStorage first** — Read `jfb_clarity_answers` for rent/utilities/transport values
2. **Falls back to config values** — Check `config.rent`, `config.housing`, etc.
3. **Last resort: estimate from income** — Rent ~24%, utilities ~5%, transport ~3%
4. **Add debug log** — Print fixedCats count and names to console for verification

### Code Changes

**Replace lines 85-114:**
```tsx
let fixedCats = categories.filter((c: any) => c.type === 'fixed');

// If no fixed categories exist, generate estimated bills from income
if (fixedCats.length === 0 && mi > 0) {
  // Try to read Clarity answers for actual values
  let rentVal = 0, utilVal = 0, transVal = 0;
  try {
    const clarityRaw = localStorage.getItem('jfb_clarity_answers');
    if (clarityRaw) {
      const ca = JSON.parse(clarityRaw);
      rentVal = Number(ca.rent || ca.housing || ca.q4 || 0);
      utilVal = Number(ca.utilities || ca.bills || ca.q5 || 0);
      transVal = Number(ca.transport || ca.commute || ca.q6 || 0);
    }
  } catch {}

  // Also check config for these values
  if (rentVal === 0) rentVal = Number(config.rent || config.housing || 0);
  if (utilVal === 0) utilVal = Number(config.utilities || config.bills || 0);
  if (transVal === 0) transVal = Number(config.transport || config.commute || 0);

  // Last resort: estimate from income
  if (rentVal === 0 && utilVal === 0 && transVal === 0) {
    rentVal = Math.round(mi * 0.24);
    utilVal = Math.round(mi * 0.05);
    transVal = Math.round(mi * 0.03);
  }

  const generated: any[] = [];
  if (rentVal > 0) generated.push({ name: 'Rent', icon: 'Home', monthlyBudget: rentVal, type: 'fixed' });
  if (utilVal > 0) generated.push({ name: 'Utilities', icon: 'Zap', monthlyBudget: utilVal, type: 'fixed' });
  if (transVal > 0) generated.push({ name: 'Transport', icon: 'Car', monthlyBudget: transVal, type: 'fixed' });

  fixedCats = generated;
}

const totalFixed = fixedCats.reduce((s: number, c: any) => s + (Number(c.monthlyBudget) || 0), 0);

console.log('Terrain fixedCats:', fixedCats.length, fixedCats.map((c: any) => c.name), 'income:', mi);
```

## Scope
- **ONLY** modifying the `readBudgetForTerrain()` function
- No changes to marker rendering, SVG elements, or other functions

