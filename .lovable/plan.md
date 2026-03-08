

# Add Fallback Bills to `readBudgetForTerrain()`

## Change
**File:** `src/components/terrain/TerrainPath.tsx`, line 85

Replace:
```ts
const fixedCats = categories.filter((c: any) => c.type === 'fixed');
```

With the fallback block that:
1. Tries real fixed categories first
2. Falls back to config values (`config.rent`, `config.utilities`, etc.)
3. If still empty, estimates from income (32% split: 60% rent, 15% utilities, 25% transport)

No other changes to the file.

